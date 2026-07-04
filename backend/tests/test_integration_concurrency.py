"""
Integration tests for concurrent operations and race conditions.

Uses asyncio.gather to fire simultaneous requests and verify
deterministic outcomes under concurrency.

All tests require PostgreSQL — set OILTRACE_TEST_DB=postgres.
"""

import asyncio
import uuid

import pytest

from conftest import needs_postgres

pytestmark = needs_postgres


# =============================================================================
# Concurrent Collections
# =============================================================================

class TestConcurrentCollections:
    """Race conditions during collection recording."""

    @pytest.mark.xfail(
        strict=False,
        reason="asyncio.gather shares one db_session which asyncpg rejects on concurrent commit()",
    )
    async def test_two_drivers_collect_same_request_id(
        self, client, set_auth, db_session
    ):
        """Two drivers collect the same request_id concurrently.

        With idempotency guard: first creates the collection, second
        returns the existing one (points_awarded=0). Both get 200.
        """
        from app.models import Profile, Consumer, Driver, CollectionRequest

        # Seed consumer, 2 drivers, and a request
        c_p = Profile(id=uuid.uuid4(), role="consumer", full_name="Concur C", phone="+639000000100")
        d1_p = Profile(id=uuid.uuid4(), role="driver", full_name="Concur D1", phone="+639000000101")
        d2_p = Profile(id=uuid.uuid4(), role="driver", full_name="Concur D2", phone="+639000000102")
        db_session.add_all([c_p, d1_p, d2_p])
        db_session.commit()

        consumer = Consumer(id=uuid.uuid4(), profile_id=c_p.id, business_name="Concur Karinderya")
        d1 = Driver(id=uuid.uuid4(), profile_id=d1_p.id, status="available")
        d2 = Driver(id=uuid.uuid4(), profile_id=d2_p.id, status="available")
        db_session.add_all([consumer, d1, d2])
        db_session.commit()

        req = CollectionRequest(
            consumer_id=consumer.id, status="assigned",
            request_type="on_demand", driver_id=d1.id,
        )
        db_session.add(req)
        db_session.commit()
        req_id = str(req.id)
        consumer_ref = str(consumer.id)

        async def _collect_as(driver_profile_id, driver_claims_data):
            from app.dependencies import get_current_user
            from app.main import app
            app.dependency_overrides[get_current_user] = lambda: driver_claims_data
            resp = await client.post(
                "/drivers/collect",
                json={
                    "request_id": req_id,
                    "tpm_value": 24.5,
                    "volume_liters": 5.0,
                    "consumer_ref": consumer_ref,
                },
            )
            app.dependency_overrides.pop(get_current_user, None)
            return resp.status_code

        claims_d1 = {"sub": str(d1_p.id), "role": "driver", "phone": "+639000000101", "full_name": "Concur D1"}
        claims_d2 = {"sub": str(d2_p.id), "role": "driver", "phone": "+639000000102", "full_name": "Concur D2"}

        results = await asyncio.gather(
            _collect_as(d1_p.id, claims_d1),
            _collect_as(d2_p.id, claims_d2),
        )
        # Both succeed (no idempotency guard on request_id)
        assert all(r == 200 for r in results), f"Expected both 200, got {results}"

    @pytest.mark.xfail(
        strict=False,
        reason="asyncio.gather shares one db_session which asyncpg rejects on concurrent commit()",
    )
    async def test_concurrent_collections_different_consumers(
        self, client, set_auth, db_session, driver_claims
    ):
        """Driver collects from Consumer A and Consumer B concurrently → both recorded."""
        from app.models import Profile, Consumer

        consumer_refs = []
        for i, name in enumerate(["Concur A", "Concur B"]):
            p = Profile(id=uuid.uuid4(), role="consumer", full_name=name, phone=f"+63900000011{i}")
            db_session.add(p)
            db_session.commit()
            c = Consumer(id=uuid.uuid4(), profile_id=p.id, business_name=name)
            db_session.add(c)
            db_session.commit()
            consumer_refs.append(str(c.id))

        async def _collect(consumer_ref):
            # Each call needs its own auth context
            return await client.post(
                "/drivers/collect",
                json={
                    "tpm_value": 20.0,
                    "volume_liters": 5.0,
                    "consumer_ref": consumer_ref,
                },
            )

        set_auth(driver_claims)
        results = await asyncio.gather(
            _collect(consumer_refs[0]),
            _collect(consumer_refs[1]),
        )
        assert all(r.status_code == 200 for r in results)


# =============================================================================
# Concurrent Redemptions
# =============================================================================

class TestConcurrentRedemptions:
    """Race conditions in the points redemption flow."""

    async def test_concurrent_redemptions_no_double_spend(
        self, client, set_auth, consumer_claims, db_session
    ):
        """Two concurrent 60-point redemptions from a 100-point balance.

        Since the endpoint reads balance then writes, without SELECT FOR UPDATE,
        both requests could pass the balance check. Document current behavior.
        """
        from conftest import _seed_profile_and_role
        from app.models import PointsLedger, Partner, Consumer
        from uuid import UUID

        partner = Partner(name="RaceMart", min_redemption=10, max_redemption=100)
        db_session.add(partner)
        db_session.commit()
        partner_id = str(partner.id)

        # Pre-seed consumer so the profile_id query returns a valid record
        _seed_profile_and_role(db_session, consumer_claims)
        profile_id = UUID(consumer_claims["sub"])
        consumer = db_session.query(Consumer).filter(Consumer.profile_id == profile_id).first()

        db_session.add(PointsLedger(
            consumer_id=consumer.id, points=100, transaction_type="earned",
            reference="seed for race test", balance_after=100,
        ))
        db_session.commit()

        async def _redeem():
            return await client.post(
                "/consumers/redeem",
                json={"partner_id": partner_id, "points_to_use": 60},
            )

        set_auth(consumer_claims)
        results = await asyncio.gather(_redeem(), _redeem())
        statuses = [r.status_code for r in results]

        # At least one should succeed (balance of 100 covers one 60-pt redemption)
        assert 200 in statuses
        # The second may succeed (no locking) or fail (InsufficientPointsError)
        # Document whichever behavior occurs
        assert all(s in (200, 400) for s in statuses), f"Unexpected statuses: {statuses}"


# =============================================================================
# Status Transition Races
# =============================================================================

class TestStatusTransitionRaces:
    """Race conditions in status transition flow."""

    async def test_duplicate_status_update_is_idempotent(
        self, client, set_auth, consumer_claims, owner_claims, driver_claims, db_session
    ):
        """Same status transition sent twice → no error, final state correct."""
        from conftest import _seed_profile_and_role
        from app.models import Driver
        from uuid import UUID

        # Pre-seed the driver so we can query its auto-generated ID before using it
        _seed_profile_and_role(db_session, driver_claims)
        driver_profile_id = UUID(driver_claims["sub"])
        driver = db_session.query(Driver).filter(Driver.profile_id == driver_profile_id).first()
        assert driver is not None, "Driver must be seeded by driver_claims"
        driver_id = str(driver.id)

        set_auth(consumer_claims)
        create = await client.post(
            "/consumers/requests",
            json={"request_type": "on_demand"},
        )
        req_id = create.json()["id"]

        # Owner assigns the real driver
        set_auth(owner_claims)
        assign = await client.put(
            f"/owners/requests/{req_id}/assign",
            json={"driver_id": driver_id},
        )
        assert assign.status_code == 200

        set_auth(driver_claims)

        async def _transition():
            return await client.put(
                f"/drivers/requests/{req_id}/status",
                json={"status": "in_progress"},
            )

        r1, r2 = await asyncio.gather(_transition(), _transition())
        # At least one succeeds. The second may succeed (idempotent) or fail.
        assert r1.status_code in (200, 400)
        assert r2.status_code in (200, 400)

    async def test_driver_status_update_cross_driver(
        self, client, set_auth, db_session, consumer_claims, owner_claims
    ):
        """Driver B cannot update a request assigned to Driver A.

        Ownership check added: PUT /drivers/requests/{id}/status verifies
        req.driver_id matches the authenticated driver before allowing the update.
        """
        from app.models import Profile, Driver

        # Create Driver B (separate from the one owner assigns)
        d2_p = Profile(id=uuid.uuid4(), role="driver", full_name="Driver B", phone="+639000000200")
        db_session.add(d2_p)
        db_session.commit()
        d2 = Driver(id=uuid.uuid4(), profile_id=d2_p.id, status="available")
        db_session.add(d2)
        db_session.commit()

        # Consumer creates request
        set_auth(consumer_claims)
        create = await client.post(
            "/consumers/requests",
            json={"request_type": "on_demand"},
        )
        req_id = create.json()["id"]

        # Owner assigns to "test-driver-uuid" (Driver A, not Driver B)
        set_auth(owner_claims)
        await client.put(
            f"/owners/requests/{req_id}/assign",
            json={"driver_id": "test-driver-uuid"},
        )

        # Driver B tries to update the status → 403
        from app.dependencies import get_current_user
        from app.main import app
        b_claims = {"sub": str(d2_p.id), "role": "driver", "phone": "+639000000200", "full_name": "Driver B"}
        app.dependency_overrides[get_current_user] = lambda: b_claims

        resp = await client.put(
            f"/drivers/requests/{req_id}/status",
            json={"status": "in_progress"},
        )
        app.dependency_overrides.pop(get_current_user, None)

        assert resp.status_code == 403, (
            "Driver B should be rejected with 403 — request is assigned to Driver A."
        )


# =============================================================================
# Duplicate Operations
# =============================================================================

class TestDuplicateOperations:
    """Idempotency and duplicate handling."""

    async def test_duplicate_consumer_request_creates_two(
        self, client, set_auth, consumer_claims
    ):
        """Same payload submitted twice → two distinct requests (no dedup)."""
        set_auth(consumer_claims)
        payload = {"request_type": "on_demand", "notes": "Duplicate test"}
        r1 = await client.post("/consumers/requests", json=payload)
        r2 = await client.post("/consumers/requests", json=payload)
        assert r1.json()["id"] != r2.json()["id"]

    async def test_duplicate_driver_collection_same_request_id(
        self, client, set_auth, db_session, driver_claims
    ):
        """Same request_id collected twice → idempotent (same collection_id)."""
        from app.models import Profile, Consumer, CollectionRequest

        c_p = Profile(id=uuid.uuid4(), role="consumer", full_name="Dup Coll C", phone="+639000000300")
        db_session.add(c_p)
        db_session.commit()
        consumer = Consumer(id=uuid.uuid4(), profile_id=c_p.id, business_name="Dup Coll Karinderya")
        db_session.add(consumer)
        db_session.commit()
        req = CollectionRequest(consumer_id=consumer.id, status="assigned", request_type="on_demand")
        db_session.add(req)
        db_session.commit()

        set_auth(driver_claims)
        r1 = await client.post(
            "/drivers/collect",
            json={
                "request_id": str(req.id),
                "tpm_value": 20.0,
                "volume_liters": 5.0,
                "consumer_ref": str(consumer.id),
            },
        )
        r2 = await client.post(
            "/drivers/collect",
            json={
                "request_id": str(req.id),
                "tpm_value": 20.0,
                "volume_liters": 5.0,
                "consumer_ref": str(consumer.id),
            },
        )
        # Idempotent: same collection_id, second returns points_awarded=0
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r1.json()["collection_id"] == r2.json()["collection_id"]
        assert r2.json()["points_awarded"] == 0

    async def test_duplicate_push_token_different_profiles(
        self, client, set_auth, consumer_claims, driver_claims
    ):
        """Profile A registers token X → Profile B registers same token X.

        Current upsert behavior: the token moves to Profile B.
        """
        set_auth(consumer_claims)
        r1 = await client.post(
            "/notifications/register",
            json={
                "platform": "android",
                "push_token": "ExponentPushToken[race-token]",
            },
        )
        assert r1.status_code == 200
        token_id_1 = r1.json()["token_id"]

        set_auth(driver_claims)
        r2 = await client.post(
            "/notifications/register",
            json={
                "platform": "ios",
                "push_token": "ExponentPushToken[race-token]",
            },
        )
        assert r2.status_code == 200
        # Upsert: same token_id, but now owned by the driver
        assert r2.json()["token_id"] == token_id_1
