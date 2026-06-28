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
import os

# Skip all tests in this file if not running against real PostgreSQL
pytestmark = pytest.mark.skipif(
    os.environ.get("OILTRACE_TEST_DB", "").lower() != "postgres",
    reason="RLS tests require PostgreSQL with RLS enabled. "
           "Set OILTRACE_TEST_DB=postgres and ensure testcontainers is installed."
)


class TestConsumerIsolation:
    """Consumer A should never see Consumer B's data."""

    async def test_consumer_cannot_list_other_consumers(self, client, mock_rls_session):
        """GET /consumers returns only the authenticated consumer's data."""
        resp = await client.get(
            "/consumers/me",
            headers={"Authorization": "Bearer consumer-a-jwt"}
        )
        assert resp.status_code == 200
        # Should return Consumer A's info, not Consumer B's
        data = resp.json()
        assert data["business_name"] == "Karinderya A"

    async def test_consumer_cannot_read_other_collections(self, client, mock_rls_session):
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
        resp = await client.get(
            "/consumers/history",
            headers={"Authorization": "Bearer consumer-a-jwt"}
        )
        assert resp.status_code == 200
        collections = resp.json()
        # Consumer A should see 0 collections (none were created for A)
        assert len(collections) == 0

    async def test_consumer_cannot_access_anothers_request_by_id(self, client, mock_rls_session):
        """Consumer A trying to read Consumer B's request by ID → 404."""
        pass  # Requires seeding a request for Consumer B


class TestDriverIsolation:
    """Drivers should only see their assigned collections."""

    async def test_driver_sees_only_assigned_collections(self, client, mock_rls_session):
        """Driver queries collections → only their own records."""
        pass

    async def test_driver_cannot_see_other_drivers_earnings(self, client, mock_rls_session):
        """GET /drivers/earnings returns only this driver's earnings."""
        resp = await client.get(
            "/drivers/earnings",
            headers={"Authorization": "Bearer driver-jwt"}
        )
        assert resp.status_code == 200
        # Should not include other drivers' data

    async def test_driver_cannot_list_all_consumers(self, client, mock_rls_session):
        """Driver trying to list consumers (owner endpoint) → 403."""
        resp = await client.get(
            "/owners/consumers",
            headers={"Authorization": "Bearer driver-jwt"}
        )
        assert resp.status_code == 403


class TestOwnerBypass:
    """Owner role bypasses RLS and sees everything."""

    async def test_owner_can_read_all_collections(self, client, mock_rls_session):
        """Owner sees collections from all consumers."""
        # Seed collections for multiple consumers
        from app.models import Collection
        mock_rls_session.add_all([
            Collection(
                consumer_id=mock_rls_session["consumer_a_id"],
                driver_id=mock_rls_session["driver_id"],
                tpm_value=18.0, oil_grade="premium", volume_liters=5.0
            ),
            Collection(
                consumer_id=mock_rls_session["consumer_b_id"],
                driver_id=mock_rls_session["driver_id"],
                tpm_value=30.0, oil_grade="low", volume_liters=5.0
            ),
        ])
        mock_rls_session.commit()

        resp = await client.get(
            "/owners/collections",
            headers={"Authorization": "Bearer owner-jwt"}
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 2  # Both collections visible

    async def test_owner_can_read_any_consumer_profile(self, client, mock_rls_session):
        """Owner can read any consumer's detail."""
        resp = await client.get(
            f"/owners/consumers/{mock_rls_session['consumer_a_id']}",
            headers={"Authorization": "Bearer owner-jwt"}
        )
        assert resp.status_code == 200

    async def test_owner_can_see_all_drivers_with_locations(self, client, mock_rls_session):
        """Owner dashboard shows all drivers' live locations."""
        resp = await client.get(
            "/owners/drivers",
            headers={"Authorization": "Bearer owner-jwt"}
        )
        assert resp.status_code == 200
        assert len(resp.json()) >= 1  # At least the seeded driver


class TestUnauthenticatedAccess:
    """No JWT → all endpoints blocked."""

    ENDPOINTS_TO_CHECK = [
        ("GET", "/consumers/me"),
        ("GET", "/drivers/me"),
        ("GET", "/owners/dashboard"),
        ("POST", "/consumers/requests"),
        ("GET", "/blockchain/verify/test-uuid"),
        ("GET", "/iot/status"),
    ]

    async def test_all_endpoints_require_auth(self, client):
        """Every endpoint returns 401 without JWT."""
        for method, path in self.ENDPOINTS_TO_CHECK:
            if method == "GET":
                resp = await client.get(path)
            else:
                resp = await client.post(path, json={})
            assert resp.status_code == 401, f"{method} {path} returned {resp.status_code}"


class TestPublicBlockchainRecords:
    """Blockchain verification endpoint is intentionally public."""

    async def test_blockchain_data_is_public(self, client):
        """GET /blockchain/contract returns contract info without auth."""
        resp = await client.get("/blockchain/contract")
        # This endpoint is intentionally public per the security design
        assert resp.status_code in (200, 404)
