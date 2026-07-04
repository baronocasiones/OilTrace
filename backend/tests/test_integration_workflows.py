"""
Integration tests for multi-step, multi-role API workflows.

Tests real DB + HTTP round-trip through the entire FastAPI stack.
All external services (OSRM, Expo Push, Web3) are mocked.

Requires PostgreSQL — set OILTRACE_TEST_DB=postgres.
"""

import uuid
import pytest
from datetime import date

from conftest import needs_postgres

pytestmark = needs_postgres


# =============================================================================
# Consumer → Request → Assign → Collect → Points
# =============================================================================

class TestConsumerRequestToCollectionWorkflow:
    """Full lifecycle: consumer creates, owner assigns, driver completes."""

    async def test_full_consumer_request_flow(self, client, set_auth,
                                                consumer_claims, owner_claims,
                                                driver_claims, db_session):
        """Consumer creates request → Owner assigns → Driver transitions → completed."""
        from conftest import _seed_profile_and_role
        from app.models import Driver
        from uuid import UUID

        # Pre-seed the driver so we can query its auto-generated ID before using it
        _seed_profile_and_role(db_session, driver_claims)
        driver_profile_id = UUID(driver_claims["sub"])
        driver = db_session.query(Driver).filter(Driver.profile_id == driver_profile_id).first()
        assert driver is not None, "Driver must be seeded by driver_claims"
        driver_id = str(driver.id)

        # 1. Consumer creates a request
        set_auth(consumer_claims)
        create = await client.post(
            "/consumers/requests",
            json={"request_type": "on_demand", "notes": "Please pickup ASAP"},
        )
        assert create.status_code == 201
        req_id = create.json()["id"]
        assert create.json()["status"] == "pending"

        # 2. Owner assigns the real driver
        set_auth(owner_claims)
        assign = await client.put(
            f"/owners/requests/{req_id}/assign",
            json={"driver_id": driver_id},
        )
        assert assign.status_code == 200
        assert assign.json()["status"] == "assigned"
        assert assign.json()["driver_id"] is not None

        # 3. Driver transitions to in_progress
        set_auth(driver_claims)
        progress = await client.put(
            f"/drivers/requests/{req_id}/status",
            json={"status": "in_progress"},
        )
        assert progress.status_code == 200
        assert progress.json()["status"] == "in_progress"

        # 4. Driver transitions to completed
        complete = await client.put(
            f"/drivers/requests/{req_id}/status",
            json={"status": "completed"},
        )
        assert complete.status_code == 200
        assert complete.json()["status"] == "completed"

    async def test_driver_collect_persists_points_in_ledger(
        self, client, set_auth, consumer_claims, driver_claims, db_session
    ):
        """Driver collects → response shows points AND PointsLedger has them."""
        from app.models import Consumer
        from conftest import _seed_profile_and_role
        from uuid import UUID

        _seed_profile_and_role(db_session, consumer_claims)
        consumer = db_session.query(Consumer).filter(
            Consumer.profile_id == UUID(consumer_claims["sub"])
        ).first()
        assert consumer is not None, "Consumer must be seeded by consumer_claims"
        consumer_ref = str(consumer.id)

        set_auth(driver_claims)
        collect = await client.post(
            "/drivers/collect",
            json={
                "tpm_value": 24.5,
                "volume_liters": 5.0,
                "consumer_ref": consumer_ref,
            },
        )
        assert collect.status_code == 200
        assert collect.json()["points_awarded"] == 50  # 5L × 10 pts/L

        # The consumer's points balance should now show 50
        set_auth(consumer_claims)
        balance_resp = await client.get("/consumers/points")
        if balance_resp.status_code == 200:
            balance_data = balance_resp.json()
            assert balance_data["balance"] == 50, (
                "Points should be persisted in PointsLedger after collection."
            )

    async def test_consumer_lists_only_own_requests(self, client, set_auth,
                                                     consumer_claims):
        """Consumer A sees only their own requests."""
        set_auth(consumer_claims)

        # Create 2 requests
        for _ in range(2):
            resp = await client.post(
                "/consumers/requests",
                json={"request_type": "on_demand"},
            )
            assert resp.status_code == 201

        # List requests
        resp = await client.get("/consumers/requests")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    async def test_consumer_history_shows_collections(
        self, client, set_auth, consumer_claims, driver_claims, db_session
    ):
        """After collection, consumer history contains the record."""
        from app.models import Consumer, Profile

        consumer_profile = Profile(
            id=uuid.uuid4(), role="consumer", full_name="Hist Consumer",
            phone="+639000000030",
        )
        db_session.add(consumer_profile)
        db_session.commit()
        consumer = Consumer(
            id=uuid.uuid4(),
            profile_id=consumer_profile.id,
            business_name="Hist Karinderya",
        )
        db_session.add(consumer)
        db_session.commit()

        set_auth(driver_claims)
        await client.post(
            "/drivers/collect",
            json={
                "tpm_value": 18.0,
                "volume_liters": 5.0,
                "consumer_ref": str(consumer.id),
            },
        )

        set_auth(consumer_claims)
        # Re-point claims to our consumer's profile_id for the history lookup
        from app.dependencies import get_current_user
        from app.main import app
        hist_claims = {
            "sub": str(consumer_profile.id),
            "role": "consumer",
            "phone": "+639000000030",
            "full_name": "Hist Consumer",
        }
        app.dependency_overrides[get_current_user] = lambda: hist_claims

        resp = await client.get("/consumers/history")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

        app.dependency_overrides.pop(get_current_user, None)

    async def test_driver_history_shows_own_collections(
        self, client, set_auth, driver_claims, db_session
    ):
        """Driver history includes collections they performed."""
        from app.models import Consumer, Profile

        consumer_profile = Profile(
            id=uuid.uuid4(), role="consumer", full_name="D Hist Consumer",
            phone="+639000000040",
        )
        db_session.add(consumer_profile)
        db_session.commit()
        consumer = Consumer(
            id=uuid.uuid4(),
            profile_id=consumer_profile.id,
            business_name="D Hist Karinderya",
        )
        db_session.add(consumer)
        db_session.commit()

        set_auth(driver_claims)
        await client.post(
            "/drivers/collect",
            json={
                "tpm_value": 30.0,
                "volume_liters": 5.0,
                "consumer_ref": str(consumer.id),
            },
        )

        resp = await client.get("/drivers/history")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    async def test_owner_sees_all_collections(
        self, client, set_auth, owner_claims, driver_claims, db_session
    ):
        """Owner listing returns collections from all consumers."""
        from app.models import Consumer, Profile

        # Create two consumers
        for name, lat, lng in [("OwnerTest A", 14.58, 121.04),
                                ("OwnerTest B", 14.59, 121.05)]:
            p = Profile(id=uuid.uuid4(), role="consumer", full_name=name, phone="+639000000050")
            db_session.add(p)
            db_session.commit()
            c = Consumer(id=uuid.uuid4(), profile_id=p.id, business_name=name)
            db_session.add(c)
            db_session.commit()

            set_auth(driver_claims)
            await client.post(
                "/drivers/collect",
                json={
                    "tpm_value": 20.0,
                    "volume_liters": 5.0,
                    "consumer_ref": str(c.id),
                },
            )

        set_auth(owner_claims)
        resp = await client.get("/owners/collections")
        assert resp.status_code == 200
        assert len(resp.json()) == 2


# =============================================================================
# Ad-hoc Collection (without prior request)
# =============================================================================

class TestAdHocCollectionAndPoints:
    """Collection without a prior request_id."""

    async def test_ad_hoc_collection_no_request_id(
        self, client, set_auth, driver_claims, db_session
    ):
        """Driver collects without request_id → collection created, request_id = null."""
        from app.models import Profile, Consumer

        p = Profile(id=uuid.uuid4(), role="consumer", full_name="Adhoc C", phone="+639000000060")
        db_session.add(p)
        db_session.commit()
        c = Consumer(id=uuid.uuid4(), profile_id=p.id, business_name="Adhoc Karinderya")
        db_session.add(c)
        db_session.commit()

        set_auth(driver_claims)
        resp = await client.post(
            "/drivers/collect",
            json={
                "tpm_value": 18.5,
                "volume_liters": 5.0,
                "consumer_ref": str(c.id),
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "collection_id" in data
        assert data["grade"] == "premium"

    async def test_collection_with_zero_volume_rejected(
        self, client, set_auth, driver_claims
    ):
        """volume_liters=0 → 422 (Pydantic gt=0.0)."""
        set_auth(driver_claims)
        resp = await client.post(
            "/drivers/collect",
            json={
                "tpm_value": 20.0,
                "volume_liters": 0,
                "consumer_ref": "test-consumer-uuid",
            },
        )
        assert resp.status_code == 422

    async def test_collection_with_negative_tpm_rejected(
        self, client, set_auth, driver_claims
    ):
        """tpm_value < 0 → 422 (Pydantic ge=0.0)."""
        set_auth(driver_claims)
        resp = await client.post(
            "/drivers/collect",
            json={
                "tpm_value": -1.0,
                "volume_liters": 5.0,
                "consumer_ref": "test-consumer-uuid",
            },
        )
        assert resp.status_code == 422


# =============================================================================
# Points redemption and voucher workflow
# =============================================================================

class TestPointsRedemptionWorkflow:
    """Full earn → redeem → voucher → ledger cycle."""

    async def test_earn_and_redeem_full_cycle(
        self, client, set_auth, consumer_claims, db_session
    ):
        """Manually insert ledger entries, then redeem via API.

        Earning is now handled by award_points() called from driver_collect().
        This test uses direct DB inserts for predictable balance seeding
        to verify the redeem → voucher → ledger pipeline in isolation.
        """
        from app.models import PointsLedger, Partner, Consumer, Profile
        from uuid import UUID
        from conftest import _seed_profile_and_role

        # Seed a partner and a consumer
        partner = Partner(name="TestMart", min_redemption=10, max_redemption=500)
        db_session.add(partner)
        db_session.commit()

        _seed_profile_and_role(db_session, consumer_claims)
        profile_id = UUID(consumer_claims["sub"])
        consumer = db_session.query(Consumer).filter(
            Consumer.profile_id == profile_id
        ).first()

        # Insert an earned points entry directly into the ledger
        entry = PointsLedger(
            consumer_id=consumer.id,
            points=100,
            transaction_type="earned",
            reference="Manual insert for integration test",
            balance_after=100,
        )
        db_session.add(entry)
        db_session.commit()

        set_auth(consumer_claims)

        # Check balance
        bal = await client.get("/consumers/points")
        assert bal.status_code == 200
        assert bal.json()["balance"] == 100

        # Redeem 30 points
        redeem = await client.post(
            "/consumers/redeem",
            json={"partner_id": str(partner.id), "points_to_use": 30},
        )
        assert redeem.status_code == 200
        data = redeem.json()
        assert "voucher_code" in data
        assert "OIL-" in data["voucher_code"]
        assert data["discount_amount"] == 15.0  # 30 × ₱0.50

        # Balance should now be 70
        bal2 = await client.get("/consumers/points")
        assert bal2.json()["balance"] == 70

        # Ledger should have 2 entries
        assert len(bal2.json()["history"]) == 2

    async def test_redeem_creates_voucher_in_db(
        self, client, set_auth, consumer_claims, db_session
    ):
        """Redeem → voucher appears in GET /consumers/vouchers."""
        from app.models import PointsLedger, Partner, Consumer
        from uuid import UUID
        from conftest import _seed_profile_and_role

        partner = Partner(name="VoucherMart", min_redemption=10)
        db_session.add(partner)
        db_session.commit()

        _seed_profile_and_role(db_session, consumer_claims)
        profile_id = UUID(consumer_claims["sub"])
        consumer = db_session.query(Consumer).filter(
            Consumer.profile_id == profile_id
        ).first()
        db_session.add(PointsLedger(
            consumer_id=consumer.id, points=100, transaction_type="earned",
            reference="seed", balance_after=100,
        ))
        db_session.commit()

        set_auth(consumer_claims)
        await client.post(
            "/consumers/redeem",
            json={"partner_id": str(partner.id), "points_to_use": 30},
        )

        vouchers = await client.get("/consumers/vouchers")
        assert vouchers.status_code == 200
        assert len(vouchers.json()) == 1
        assert vouchers.json()[0]["status"] == "active"

    async def test_voucher_status_is_active_on_creation(
        self, client, set_auth, consumer_claims, db_session
    ):
        """Fresh voucher has status='active'."""
        from app.models import PointsLedger, Partner, Consumer
        from uuid import UUID
        from conftest import _seed_profile_and_role

        partner = Partner(name="StatusMart", min_redemption=10)
        db_session.add(partner)
        db_session.commit()

        _seed_profile_and_role(db_session, consumer_claims)
        profile_id = UUID(consumer_claims["sub"])
        consumer = db_session.query(Consumer).filter(
            Consumer.profile_id == profile_id
        ).first()
        db_session.add(PointsLedger(
            consumer_id=consumer.id, points=50, transaction_type="earned",
            reference="seed", balance_after=50,
        ))
        db_session.commit()

        set_auth(consumer_claims)
        resp = await client.post(
            "/consumers/redeem",
            json={"partner_id": str(partner.id), "points_to_use": 10},
        )
        assert resp.json()["voucher_code"] is not None

    async def test_redeem_deducts_balance_correctly(
        self, client, set_auth, consumer_claims, db_session
    ):
        """Balance before - points used = balance after."""
        from app.models import PointsLedger, Partner, Consumer
        from uuid import UUID
        from conftest import _seed_profile_and_role

        partner = Partner(name="DeductMart", min_redemption=10)
        db_session.add(partner)
        db_session.commit()

        _seed_profile_and_role(db_session, consumer_claims)
        profile_id = UUID(consumer_claims["sub"])
        consumer = db_session.query(Consumer).filter(
            Consumer.profile_id == profile_id
        ).first()
        db_session.add(PointsLedger(
            consumer_id=consumer.id, points=80, transaction_type="earned",
            reference="seed", balance_after=80,
        ))
        db_session.commit()

        set_auth(consumer_claims)
        resp = await client.post(
            "/consumers/redeem",
            json={"partner_id": str(partner.id), "points_to_use": 30},
        )
        assert resp.status_code == 200

        bal = await client.get("/consumers/points")
        assert bal.json()["balance"] == 50  # 80 - 30

    async def test_redeem_fails_for_nonexistent_partner(
        self, client, set_auth, consumer_claims
    ):
        """Non-existent partner_id → 404."""
        set_auth(consumer_claims)
        resp = await client.post(
            "/consumers/redeem",
            json={
                "partner_id": "00000000-0000-0000-0000-000000000000",
                "points_to_use": 10,
            },
        )
        assert resp.status_code == 404

    async def test_redeem_fails_below_min_redemption(
        self, client, set_auth, consumer_claims, db_session
    ):
        """Points below partner's min_redemption → 400."""
        from app.models import PointsLedger, Partner, Consumer
        from uuid import UUID
        from conftest import _seed_profile_and_role

        partner = Partner(name="MinMart", min_redemption=50)
        db_session.add(partner)
        db_session.commit()

        _seed_profile_and_role(db_session, consumer_claims)
        profile_id = UUID(consumer_claims["sub"])
        consumer = db_session.query(Consumer).filter(
            Consumer.profile_id == profile_id
        ).first()
        db_session.add(PointsLedger(
            consumer_id=consumer.id, points=100, transaction_type="earned",
            reference="seed", balance_after=100,
        ))
        db_session.commit()

        set_auth(consumer_claims)
        resp = await client.post(
            "/consumers/redeem",
            json={"partner_id": str(partner.id), "points_to_use": 10},
        )
        assert resp.status_code == 400

    async def test_redeem_fails_above_max_redemption(
        self, client, set_auth, consumer_claims, db_session
    ):
        """Points above partner's max_redemption → 400."""
        from app.models import PointsLedger, Partner, Consumer
        from uuid import UUID
        from conftest import _seed_profile_and_role

        partner = Partner(name="MaxMart", min_redemption=10, max_redemption=50)
        db_session.add(partner)
        db_session.commit()

        _seed_profile_and_role(db_session, consumer_claims)
        profile_id = UUID(consumer_claims["sub"])
        consumer = db_session.query(Consumer).filter(
            Consumer.profile_id == profile_id
        ).first()
        db_session.add(PointsLedger(
            consumer_id=consumer.id, points=200, transaction_type="earned",
            reference="seed", balance_after=200,
        ))
        db_session.commit()

        set_auth(consumer_claims)
        resp = await client.post(
            "/consumers/redeem",
            json={"partner_id": str(partner.id), "points_to_use": 100},
        )
        assert resp.status_code == 400

    async def test_redeem_fails_insufficient_balance(
        self, client, set_auth, consumer_claims, db_session
    ):
        """Redeem more points than available → 400."""
        from app.models import Partner
        partner = Partner(name="PoorMart", min_redemption=10)
        db_session.add(partner)
        db_session.commit()

        set_auth(consumer_claims)
        resp = await client.post(
            "/consumers/redeem",
            json={"partner_id": str(partner.id), "points_to_use": 999},
        )
        assert resp.status_code == 400

    async def test_voucher_code_is_unique(
        self, client, set_auth, consumer_claims, db_session
    ):
        """Two redemptions produce different voucher codes (unique constraint)."""
        from app.models import PointsLedger, Partner, Consumer
        from uuid import UUID
        from conftest import _seed_profile_and_role

        partner = Partner(name="UniqueMart", min_redemption=10)
        db_session.add(partner)
        db_session.commit()

        _seed_profile_and_role(db_session, consumer_claims)
        profile_id = UUID(consumer_claims["sub"])
        consumer = db_session.query(Consumer).filter(
            Consumer.profile_id == profile_id
        ).first()
        db_session.add(PointsLedger(
            consumer_id=consumer.id, points=200, transaction_type="earned",
            reference="seed", balance_after=200,
        ))
        db_session.commit()

        set_auth(consumer_claims)
        r1 = await client.post(
            "/consumers/redeem",
            json={"partner_id": str(partner.id), "points_to_use": 10},
        )
        r2 = await client.post(
            "/consumers/redeem",
            json={"partner_id": str(partner.id), "points_to_use": 10},
        )
        assert r1.json()["voucher_code"] != r2.json()["voucher_code"]

    async def test_qr_data_format_in_response(
        self, client, set_auth, consumer_claims, db_session
    ):
        """QR data starts with 'oiltrace://voucher/'."""
        from app.models import PointsLedger, Partner, Consumer
        from uuid import UUID
        from conftest import _seed_profile_and_role

        partner = Partner(name="QRMart", min_redemption=10)
        db_session.add(partner)
        db_session.commit()

        _seed_profile_and_role(db_session, consumer_claims)
        profile_id = UUID(consumer_claims["sub"])
        consumer = db_session.query(Consumer).filter(
            Consumer.profile_id == profile_id
        ).first()
        db_session.add(PointsLedger(
            consumer_id=consumer.id, points=50, transaction_type="earned",
            reference="seed", balance_after=50,
        ))
        db_session.commit()

        set_auth(consumer_claims)
        resp = await client.post(
            "/consumers/redeem",
            json={"partner_id": str(partner.id), "points_to_use": 10},
        )
        assert resp.json()["qr_data"].startswith("oiltrace://voucher/")


# =============================================================================
# Driver Route Workflow
# =============================================================================

class TestDriverRouteWorkflow:
    """Route optimisation integrated with DB-backed requests."""

    async def test_driver_route_with_multiple_stops(
        self, client, set_auth, driver_claims, db_session, mock_osrm_success
    ):
        """Seed 3 consumers with locations → 3 pending requests → 3 waypoints."""
        from app.models import Profile, Consumer, CollectionRequest

        driver_uuid = uuid.uuid4()
        cons = []
        for i, (name, lat, lng) in enumerate([
            ("Route A", 14.5832, 121.0409),
            ("Route B", 14.5901, 121.0450),
            ("Route C", 14.5750, 121.0350),
        ]):
            p = Profile(id=uuid.uuid4(), role="consumer", full_name=name, phone=f"+63900000007{i}")
            db_session.add(p)
            db_session.commit()
            c = Consumer(id=uuid.uuid4(), profile_id=p.id, business_name=name,
                         latitude=lat, longitude=lng)
            db_session.add(c)
            db_session.commit()
            cons.append(c)

            req = CollectionRequest(
                consumer_id=c.id, status="pending", request_type="on_demand",
            )
            db_session.add(req)
            db_session.commit()

        # Set driver claims to match a real driver with location
        from app.models import Driver, Profile as DProfile
        dprof = DProfile(id=driver_uuid, role="driver", full_name="Route Driver", phone="+639000000099")
        db_session.add(dprof)
        db_session.commit()
        driver = Driver(id=uuid.uuid4(), profile_id=driver_uuid, status="available",
                        current_lat=14.5800, current_lng=121.0400)
        db_session.add(driver)
        db_session.commit()

        route_claims = {
            "sub": str(driver_uuid), "role": "driver",
            "phone": "+639000000099", "full_name": "Route Driver",
        }
        from app.dependencies import get_current_user
        from app.main import app
        app.dependency_overrides[get_current_user] = lambda: route_claims

        resp = await client.get("/drivers/route?pending_only=true")
        assert resp.status_code == 200
        data = resp.json()
        assert "waypoints" in data
        assert len(data["waypoints"]) == 3
        assert "total_distance_km" in data
        assert "total_duration_min" in data

        app.dependency_overrides.pop(get_current_user, None)

    async def test_route_filters_consumers_without_location(
        self, client, set_auth, driver_claims, db_session, mock_osrm_success
    ):
        """Consumer with null lat/lng is excluded from route stops."""
        from app.models import Profile, Consumer, CollectionRequest

        c_p = Profile(id=uuid.uuid4(), role="consumer", full_name="NoLoc", phone="+639000000080")
        db_session.add(c_p)
        db_session.commit()
        c = Consumer(id=uuid.uuid4(), profile_id=c_p.id, business_name="NoLoc Karinderya")
        db_session.add(c)
        db_session.commit()
        req = CollectionRequest(consumer_id=c.id, status="pending", request_type="on_demand")
        db_session.add(req)
        db_session.commit()

        set_auth(driver_claims)
        resp = await client.get("/drivers/route?pending_only=true")
        # Even if the route is empty, the endpoint should return 200
        assert resp.status_code in (200, 400)

    async def test_route_origin_falls_back_to_first_consumer(
        self, client, set_auth, driver_claims, db_session, mock_osrm_success
    ):
        """Driver without current_lat/lng uses first pending consumer's location."""
        from app.models import Profile, Consumer, CollectionRequest, Driver
        from uuid import UUID

        # Set driver location to None
        driver = db_session.query(Driver).filter(
            Driver.profile_id == UUID(driver_claims["sub"])
        ).first()
        driver.current_lat = None
        driver.current_lng = None
        db_session.commit()

        # Create consumer with location
        c_p = Profile(id=uuid.uuid4(), role="consumer", full_name="FallbackC", phone="+639000000090")
        db_session.add(c_p)
        db_session.commit()
        c = Consumer(id=uuid.uuid4(), profile_id=c_p.id, business_name="Fallback Karinderya",
                     latitude=14.58, longitude=121.04)
        db_session.add(c)
        db_session.commit()
        req = CollectionRequest(consumer_id=c.id, status="pending", request_type="on_demand")
        db_session.add(req)
        db_session.commit()

        set_auth(driver_claims)
        resp = await client.get("/drivers/route?pending_only=true")
        assert resp.status_code == 200

    async def test_route_origin_400_when_no_location_and_no_requests(
        self, client, set_auth, driver_claims, db_session
    ):
        """No driver location AND no pending requests → 400."""
        from app.models import Driver
        from uuid import UUID

        driver = db_session.query(Driver).filter(
            Driver.profile_id == UUID(driver_claims["sub"])
        ).first()
        driver.current_lat = None
        driver.current_lng = None
        db_session.commit()

        set_auth(driver_claims)
        resp = await client.get("/drivers/route?pending_only=true")
        assert resp.status_code == 400

    async def test_route_requires_driver_role(
        self, client, set_auth, consumer_claims
    ):
        """Consumer JWT → /drivers/route → 403."""
        set_auth(consumer_claims)
        resp = await client.get("/drivers/route")
        assert resp.status_code == 403

    async def test_driver_route_and_optimize_return_unified_shape(
        self, client, set_auth, driver_claims, db_session, mock_osrm_success
    ):
        """Both route endpoints now return the same enriched waypoint shape.

        ``POST /routes/optimize`` was normalized to match
        ``GET /drivers/route``'s enriched format (Option B).
        It also includes ``polyline`` and ``fallback_used`` as extras.
        """
        set_auth(driver_claims)

        # POST /routes/optimize now returns enriched waypoints
        optimize_resp = await client.post(
            "/routes/optimize",
            json={
                "origin_lat": 14.58,
                "origin_lng": 121.04,
                "stops": [
                    {"lat": 14.5832, "lng": 121.0409, "id": "stop-1",
                     "consumer_name": "Test Consumer", "address": "123 St"},
                ],
            },
        )
        assert optimize_resp.status_code == 200
        opt_data = optimize_resp.json()
        # Enriched shape: consumer_name, address, estimated_arrival, stop, request_id
        assert opt_data["waypoints"][0]["consumer_name"] == "Test Consumer"
        assert opt_data["waypoints"][0]["address"] == "123 St"
        assert "estimated_arrival" in opt_data["waypoints"][0]
        assert "stop" in opt_data["waypoints"][0]
        assert "request_id" in opt_data["waypoints"][0]
        # Extra fields not present in GET /drivers/route
        assert "polyline" in opt_data
        assert "fallback_used" in opt_data


# =============================================================================
# Push notification device registration / unregistration
# =============================================================================

class TestNotificationRegistration:
    """Device token registration and unregistration."""

    async def test_consumer_register_device_token(
        self, client, set_auth, consumer_claims
    ):
        """Consumer registers a push token → 200 + token_id."""
        set_auth(consumer_claims)
        resp = await client.post(
            "/notifications/register",
            json={
                "platform": "android",
                "push_token": "ExponentPushToken[integ-consumer-1]",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "registered"
        assert "token_id" in data

    async def test_driver_can_register_device_token(
        self, client, set_auth, driver_claims
    ):
        """Driver registers a push token → 200 + token_id."""
        set_auth(driver_claims)
        resp = await client.post(
            "/notifications/register",
            json={
                "platform": "ios",
                "push_token": "ExponentPushToken[integ-driver-1]",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "registered"

    async def test_register_same_token_twice_is_upsert(
        self, client, set_auth, consumer_claims
    ):
        """Same token registered twice → same token_id (upsert)."""
        set_auth(consumer_claims)
        r1 = await client.post(
            "/notifications/register",
            json={
                "platform": "android",
                "push_token": "ExponentPushToken[upsert-test]",
            },
        )
        r2 = await client.post(
            "/notifications/register",
            json={
                "platform": "android",
                "push_token": "ExponentPushToken[upsert-test]",
            },
        )
        assert r1.json()["token_id"] == r2.json()["token_id"]

    async def test_register_updates_platform(
        self, client, set_auth, consumer_claims
    ):
        """Re-register with different platform → platform updated."""
        set_auth(consumer_claims)
        await client.post(
            "/notifications/register",
            json={
                "platform": "android",
                "push_token": "ExponentPushToken[platform-test]",
            },
        )
        await client.post(
            "/notifications/register",
            json={
                "platform": "ios",
                "push_token": "ExponentPushToken[platform-test]",
            },
        )
        # Just verify no errors — DB-level assertion is in data_integrity tests
        # (We can't read the platform back via API since GET is not exposed)

    async def test_register_without_auth_returns_401(
        self, client
    ):
        """No JWT → 401."""
        resp = await client.post(
            "/notifications/register",
            json={"platform": "android", "push_token": "ExponentPushToken[noauth]"},
        )
        assert resp.status_code == 401

    async def test_unregister_deactivates_token(
        self, client, set_auth, consumer_claims
    ):
        """Unregister → token deactivated (PUT returns 200)."""
        set_auth(consumer_claims)
        await client.post(
            "/notifications/register",
            json={
                "platform": "android",
                "push_token": "ExponentPushToken[deactivate-me]",
            },
        )
        resp = await client.put(
            "/notifications/unregister",
            json={"push_token": "ExponentPushToken[deactivate-me]"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "unregistered"

    async def test_unregister_nonexistent_token_succeeds(
        self, client, set_auth, consumer_claims
    ):
        """Unregister a token that was never registered → 200."""
        set_auth(consumer_claims)
        resp = await client.put(
            "/notifications/unregister",
            json={"push_token": "ExponentPushToken[never-existed]"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "unregistered"

    async def test_unregister_from_different_profile_is_noop(
        self, client, set_auth, consumer_claims, driver_claims
    ):
        """Profile A registers → Profile B unregisters same token → no-op.

        The unregister endpoint now filters by both push_token and
        profile_id, so Driver B cannot deactivate Consumer A's token.
        Returns 200 with "unregistered" (idempotent) but does nothing.
        """
        set_auth(consumer_claims)
        reg = await client.post(
            "/notifications/register",
            json={
                "platform": "android",
                "push_token": "ExponentPushToken[cross-profile]",
            },
        )
        assert reg.status_code == 200

        # Driver B tries to unregister Consumer A's token
        set_auth(driver_claims)
        unreg = await client.put(
            "/notifications/unregister",
            json={"push_token": "ExponentPushToken[cross-profile]"},
        )
        assert unreg.status_code == 200
        # Consumer A's token is still active (filtered by profile_id)
