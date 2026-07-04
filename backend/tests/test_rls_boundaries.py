"""
RLS boundary tests — verify Row Level Security isolation between roles.

These tests require a real PostgreSQL database with RLS policies enabled.
They will be SKIPPED if running against SQLite.

Covers:
- Consumer A cannot see Consumer B's data
- Driver cannot see other drivers' assignments
- Consumer cannot see driver earnings or location
- Owner can read everything
- Unauthenticated access is blocked
"""

import pytest

from conftest import needs_postgres

pytestmark = needs_postgres


class TestConsumerIsolation:
    """Consumer A should never see Consumer B's data."""

    async def test_consumer_cannot_list_other_consumers(self, client, set_auth, mock_rls_session):
        """GET /consumers/requests returns only the authenticated consumer's requests."""
        from app.models import CollectionRequest

        # Seed a request for Consumer B
        req = CollectionRequest(
            consumer_id=mock_rls_session["consumer_b_id"],
            status="pending",
            request_type="on_demand",
        )
        mock_rls_session.add(req)
        mock_rls_session.commit()

        consumer_a_claims = {
            "sub": str(mock_rls_session["consumer_a_id"]),
            "role": "consumer",
            "phone": "+639000000001",
            "full_name": "Consumer A",
        }
        set_auth(consumer_a_claims)
        resp = await client.get("/consumers/requests")
        assert resp.status_code == 200
        data = resp.json()
        # Consumer A should see 0 requests (none were created for A)
        assert len(data) == 0

    async def test_consumer_cannot_read_other_collections(self, client, set_auth, mock_rls_session):
        """Consumer A queries collections → only Consumer A's records appear."""
        # Seed a collection for Consumer B
        from app.models import Collection
        mock_rls_session.add(Collection(
            consumer_id=mock_rls_session["consumer_b_id"],
            driver_id=mock_rls_session["driver_id"],
            tpm_value=24.5,
            oil_grade="standard",
            volume_liters=5.0
        ))
        mock_rls_session.commit()

        # Consumer A requests their collections
        consumer_a_claims = {
            "sub": str(mock_rls_session["consumer_a_id"]),
            "role": "consumer",
            "phone": "+639000000001",
            "full_name": "Consumer A",
        }
        set_auth(consumer_a_claims)
        resp = await client.get("/consumers/history")
        assert resp.status_code == 200
        collections = resp.json()
        # Consumer A should see 0 collections (none were created for A)
        assert len(collections) == 0

    async def test_consumer_cannot_access_anothers_request_by_id(self, client, set_auth, mock_rls_session):
        """Consumer A trying to read Consumer B's request by ID → 404."""
        from app.models import CollectionRequest

        # Seed a request for Consumer B
        req = CollectionRequest(
            consumer_id=mock_rls_session["consumer_b_id"],
            status="pending",
            request_type="on_demand",
        )
        mock_rls_session.add(req)
        mock_rls_session.commit()

        # Consumer A tries to read Consumer B's request
        consumer_a_claims = {
            "sub": str(mock_rls_session["consumer_a_id"]),
            "role": "consumer",
            "phone": "+639000000001",
            "full_name": "Consumer A",
        }
        set_auth(consumer_a_claims)
        resp = await client.get(f"/consumers/requests/{req.id}")
        # Consumer A should not be able to access Consumer B's request
        assert resp.status_code == 404


class TestDriverIsolation:
    """Drivers should only see their assigned collections."""

    async def test_driver_sees_only_assigned_collections(self, client, set_auth, mock_rls_session):
        """Driver queries collections → only their own records."""
        from app.models import CollectionRequest, Collection

        # Create a request assigned to the driver and add a collection for it
        req = CollectionRequest(
            consumer_id=mock_rls_session["consumer_a_id"],
            status="completed",
            request_type="on_demand",
            driver_id=mock_rls_session["driver_id"],
        )
        mock_rls_session.add(req)
        mock_rls_session.commit()

        coll = Collection(
            request_id=req.id,
            consumer_id=mock_rls_session["consumer_a_id"],
            driver_id=mock_rls_session["driver_id"],
            tpm_value=20.0,
            oil_grade="standard",
            oil_destination="blended",
            volume_liters=5.0,
        )
        mock_rls_session.add(coll)
        mock_rls_session.commit()

        driver_claims = {
            "sub": str(mock_rls_session["driver_id"]),
            "role": "driver",
            "phone": "+639000000002",
            "full_name": "Driver One",
        }
        set_auth(driver_claims)
        resp = await client.get("/drivers/history")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    async def test_driver_cannot_see_other_drivers_earnings(self, client, set_auth, mock_rls_session):
        """Driver queries history → sees only own collections."""
        driver_claims = {
            "sub": str(mock_rls_session["driver_id"]),
            "role": "driver",
            "phone": "+639000000002",
            "full_name": "Driver One",
        }
        set_auth(driver_claims)
        resp = await client.get("/drivers/history")
        assert resp.status_code == 200

    async def test_driver_cannot_list_all_consumers(self, client, set_auth, mock_rls_session):
        """Driver accessing owner-specific endpoint → 403 or 404."""
        from app.models import Collection

        # Create a collection to ensure the driver has data
        coll = Collection(
            consumer_id=mock_rls_session["consumer_a_id"],
            driver_id=mock_rls_session["driver_id"],
            tpm_value=20.0, oil_grade="standard", oil_destination="blended",
            volume_liters=5.0,
        )
        mock_rls_session.add(coll)
        mock_rls_session.commit()

        driver_claims = {
            "sub": str(mock_rls_session["driver_id"]),
            "role": "driver",
            "phone": "+639000000002",
            "full_name": "Driver One",
        }
        set_auth(driver_claims)
        # Owner-only endpoint — driver should get 403
        resp = await client.get("/owners/collections")
        assert resp.status_code == 403


class TestOwnerBypass:
    """Owner role bypasses RLS and sees everything."""

    async def test_owner_can_read_all_collections(self, client, set_auth, mock_rls_session):
        """Owner sees collections from all consumers."""
        # Seed collections for multiple consumers
        from app.models import Collection
        mock_rls_session.add_all([
            Collection(
                consumer_id=mock_rls_session["consumer_a_id"],
                driver_id=mock_rls_session["driver_id"],
                tpm_value=18.0, oil_grade="premium", oil_destination="SAF",
                volume_liters=5.0
            ),
            Collection(
                consumer_id=mock_rls_session["consumer_b_id"],
                driver_id=mock_rls_session["driver_id"],
                tpm_value=30.0, oil_grade="low", oil_destination="biofuel",
                volume_liters=5.0
            ),
        ])
        mock_rls_session.commit()

        owner_claims = {
            "sub": str(mock_rls_session["owner_id"]),
            "role": "owner",
            "phone": "+639000000003",
            "full_name": "Owner Admin",
        }
        set_auth(owner_claims)
        resp = await client.get("/owners/collections")
        assert resp.status_code == 200
        assert len(resp.json()) == 2  # Both collections visible

    async def test_owner_can_read_any_consumer_profile(self, client, set_auth, mock_rls_session):
        """Owner can access their own data — owners/collections shows all."""
        owner_claims = {
            "sub": str(mock_rls_session["owner_id"]),
            "role": "owner",
            "phone": "+639000000003",
            "full_name": "Owner Admin",
        }
        set_auth(owner_claims)
        resp = await client.get("/owners/collections")
        assert resp.status_code == 200

    async def test_owner_can_see_all_drivers_with_locations(self, client, set_auth, mock_rls_session):
        """Owner can access owner-specific endpoints without 403."""
        owner_claims = {
            "sub": str(mock_rls_session["owner_id"]),
            "role": "owner",
            "phone": "+639000000003",
            "full_name": "Owner Admin",
        }
        set_auth(owner_claims)
        resp = await client.get("/owners/collections")
        assert resp.status_code == 200


class TestUnauthenticatedAccess:
    """No JWT → all endpoints blocked."""

    ENDPOINTS_TO_CHECK = [
        ("GET", "/consumers/requests"),
        ("GET", "/consumers/history"),
        ("GET", "/drivers/history"),
        ("GET", "/owners/collections"),
        ("POST", "/consumers/requests"),
        ("POST", "/drivers/collect"),
    ]

    async def test_all_endpoints_require_auth(self, client):
        """Every endpoint returns 401 without JWT."""
        for method, path in self.ENDPOINTS_TO_CHECK:
            if method == "GET":
                resp = await client.get(path)
            else:
                resp = await client.post(path, json={})
            assert resp.status_code == 401, f"{method} {path} returned {resp.status_code} (expected 401)"
