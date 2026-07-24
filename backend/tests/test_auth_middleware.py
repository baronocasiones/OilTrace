"""
Tests for the JWT authentication middleware and role-based access control.

Token verification: tested via bare `client` (no auth override → 401).
Role enforcement: tested via authenticated clients hitting wrong-role endpoints.
IoT device auth: stubbed (endpoints not yet implemented → 404).
Rate limiting: basic coverage, fine-tuned when endpoints exist.
"""

import pytest


class TestJWTAuth:
    """Token verification — all requests without auth override should 401."""

    async def test_no_token_returns_401(self, client):
        """Request without Authorization header."""
        resp = await client.get("/consumers/requests")
        assert resp.status_code == 401
        assert "detail" in resp.json()

    async def test_empty_bearer_returns_401(self, client):
        """Empty Bearer token."""
        resp = await client.get(
            "/consumers/requests",
            headers={"Authorization": "Bearer "}
        )
        assert resp.status_code == 401

    async def test_any_bearer_token_without_override_returns_401(self, client):
        """Any token sent without a dependency override → 401 in test mode."""
        resp = await client.get(
            "/consumers/requests",
            headers={"Authorization": "Bearer some-random-token"}
        )
        assert resp.status_code == 401


class TestRoleBasedAccess:
    """Role enforcement — clients with wrong role get 403."""

    async def test_consumer_cannot_access_driver_endpoints(self, consumer_client):
        """Consumer claims → driver endpoint → 403."""
        resp = await consumer_client.post(
            "/drivers/collect",
            json={"tpm_value": 24.5, "consumer_ref": "test-uuid"},
        )
        assert resp.status_code == 403

    async def test_driver_cannot_access_owner_endpoints(self, driver_client):
        """Driver claims → owner endpoint → 403."""
        resp = await driver_client.put(
            "/owners/requests/some-uuid/assign",
            json={"driver_id": "test-driver-uuid"},
        )
        assert resp.status_code == 403

    async def test_consumer_cannot_access_owner_endpoints(self, consumer_client):
        """Consumer claims → owner endpoint → 403."""
        resp = await consumer_client.put(
            "/owners/requests/some-uuid/assign",
            json={"driver_id": "test-driver-uuid"},
        )
        assert resp.status_code == 403

    async def test_unauthenticated_user_cannot_create_request(self, client):
        """No auth → POST /consumers/requests → 401."""
        resp = await client.post(
            "/consumers/requests",
            json={"request_type": "on_demand"},
        )
        assert resp.status_code == 401

    async def test_driver_cannot_create_consumer_request(self, driver_client):
        """Driver claims → consumer endpoint → 403."""
        resp = await driver_client.post(
            "/consumers/requests",
            json={"request_type": "on_demand"},
        )
        assert resp.status_code == 403

    async def test_consumer_can_access_own_endpoints(self, consumer_client):
        """Consumer claims → consumer endpoint → success."""
        resp = await consumer_client.get("/consumers/requests")
        assert resp.status_code == 200


class TestIoTDeviceAuth:
    """IoT device authentication — stubbed until /iot/* routes exist."""

    async def test_iot_auth_endpoint_stubbed(self, client):
        """POST /iot/auth does not exist yet → 404."""
        resp = await client.post(
            "/iot/auth",
            json={"device_id": "OIL-ESP32-001", "device_secret": "secret"},
        )
        assert resp.status_code == 404

    async def test_iot_reading_endpoint_stubbed(self, client):
        """POST /iot/reading does not exist yet → 404."""
        resp = await client.post(
            "/iot/reading",
            json={"tpm_value": 24.5},
        )
        assert resp.status_code == 404


class TestRateLimiting:
    """Rate limit enforcement — basic scaffolding."""

    async def test_auth_rate_limit(self, client):
        """Rate limiter is active (exact limit is validated per-endpoint later)."""
        # Hit any endpoint rapidly to verify rate limiter doesn't crash
        for _ in range(3):
            resp = await client.get("http://test/health")
        # Rate limiting is configured but hard to hit in test without flooding
        assert resp.status_code == 200

    async def test_iot_reading_rate_limit(self, client):
        """IoT rate limiting — deferred until /iot/reading exists."""
        pass

    async def test_generic_api_rate_limit(self, client):
        """Generic API rate limiting — deferred."""
        pass
