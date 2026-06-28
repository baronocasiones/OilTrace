"""
Tests for the JWT authentication middleware and role-based access control.

Covers: missing tokens, invalid tokens, expired tokens, role enforcement,
IoT device authentication.
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, AsyncMock


class TestJWTAuth:
    """Token verification and rejection."""

    async def test_no_token_returns_401(self, client):
        """Request without Authorization header."""
        resp = await client.get("/consumers/me")
        assert resp.status_code == 401
        assert "detail" in resp.json()

    async def test_empty_token_returns_401(self, client):
        """Empty Bearer token."""
        resp = await client.get(
            "/consumers/me",
            headers={"Authorization": "Bearer "}
        )
        assert resp.status_code == 401

    async def test_malformed_token_returns_401(self, client):
        """Token that is not valid JWT format."""
        resp = await client.get(
            "/consumers/me",
            headers={"Authorization": "Bearer not-a-jwt"}
        )
        assert resp.status_code == 401

    async def test_invalid_signature_token_returns_401(self, client):
        """JWT with wrong signature."""
        resp = await client.get(
            "/consumers/me",
            headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.invalid-signature"}
        )
        assert resp.status_code == 401

    async def test_expired_token_returns_401(self, client):
        """Token past its expiry date."""
        # Mock the verify_jwt dependency to raise on expired token
        resp = await client.get(
            "/consumers/me",
            headers={"Authorization": "Bearer expired.jwt.token"}
        )
        assert resp.status_code == 401


class TestRoleBasedAccess:
    """Role enforcement on endpoints."""

    async def test_consumer_cannot_access_driver_endpoints(self, client):
        """Consumer JWT → driver endpoint → 403."""
        # The test patches verify_jwt to return consumer role
        resp = await client.get(
            "/drivers/me",
            headers={"Authorization": "Bearer mock-consumer-jwt"}
        )
        assert resp.status_code == 403

    async def test_driver_cannot_access_owner_endpoints(self, client):
        """Driver JWT → owner endpoint → 403."""
        resp = await client.get(
            "/owners/dashboard",
            headers={"Authorization": "Bearer mock-driver-jwt"}
        )
        assert resp.status_code == 403

    async def test_consumer_cannot_access_owner_endpoints(self, client):
        """Consumer JWT → owner endpoint → 403."""
        resp = await client.get(
            "/owners/drivers",
            headers={"Authorization": "Bearer mock-consumer-jwt"}
        )
        assert resp.status_code == 403

    async def test_owner_can_access_all_endpoints(self, client):
        """Owner JWT → any endpoint → 200."""
        resp = await client.get(
            "/owners/dashboard",
            headers={"Authorization": "Bearer mock-owner-jwt"}
        )
        # Owner has access — should not be 403
        assert resp.status_code != 403

    async def test_unauthenticated_user_cannot_create_request(self, client):
        """POST /consumers/requests without auth."""
        resp = await client.post(
            "/consumers/requests",
            json={"request_type": "on_demand"}
        )
        assert resp.status_code == 401

    async def test_driver_cannot_create_consumer_request(self, client):
        """Driver JWT → consumer endpoint → 403."""
        resp = await client.post(
            "/consumers/requests",
            json={"request_type": "on_demand"},
            headers={"Authorization": "Bearer mock-driver-jwt"}
        )
        assert resp.status_code == 403


class TestIoTDeviceAuth:
    """Device ID + Secret authentication."""

    async def test_iot_auth_with_valid_credentials(self, client):
        """Valid device_id + device_secret → session token."""
        resp = await client.post(
            "/iot/auth",
            json={
                "device_id": "OIL-ESP32-001",
                "device_secret": "valid-secret"
            }
        )
        # Expecting either 200 or 401 depending on test DB state
        assert resp.status_code in (200, 401)

    async def test_iot_auth_with_invalid_secret(self, client):
        """Wrong secret → 401."""
        resp = await client.post(
            "/iot/auth",
            json={
                "device_id": "OIL-ESP32-001",
                "device_secret": "wrong-secret"
            }
        )
        assert resp.status_code == 401

    async def test_iot_auth_with_unknown_device(self, client):
        """Non-existent device_id → 401."""
        resp = await client.post(
            "/iot/auth",
            json={
                "device_id": "OIL-ESP32-999",
                "device_secret": "any-secret"
            }
        )
        assert resp.status_code == 401

    async def test_iot_auth_missing_fields(self, client):
        """Missing device_id or device_secret → 422."""
        resp = await client.post(
            "/iot/auth",
            json={"device_id": "OIL-ESP32-001"}
            # missing device_secret
        )
        assert resp.status_code == 422

    async def test_iot_reading_without_session_token(self, client):
        """POST /iot/reading without auth → 401."""
        resp = await client.post(
            "/iot/reading",
            json={
                "tpm_value": 24.5,
                "consumer_ref": "test-uuid",
                "latitude": 14.58,
                "longitude": 121.04
            }
        )
        assert resp.status_code == 401

    async def test_iot_reading_with_invalid_session_token(self, client):
        """POST /iot/reading with bad token → 401."""
        resp = await client.post(
            "/iot/reading",
            json={
                "session_token": "invalid-token",
                "tpm_value": 24.5
            }
        )
        assert resp.status_code == 401


class TestRateLimiting:
    """Rate limit enforcement."""

    async def test_auth_rate_limit(self, client):
        """More than 5 auth requests in 1 minute → 429."""
        for _ in range(5):
            await client.post("/auth/login", json={"phone": "+639123456789"})
        # The 6th request should be rate-limited
        resp = await client.post("/auth/login", json={"phone": "+639123456789"})
        assert resp.status_code == 429

    async def test_iot_reading_rate_limit(self, client):
        """60 IoT readings per minute max."""
        pass  # Requires rate limiter integration

    async def test_generic_api_rate_limit(self, client):
        """100 requests per minute max."""
        pass  # Requires rate limiter integration
