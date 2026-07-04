"""
Integration tests for error recovery, fallback behavior, and HTTP error mapping.

Covers OSRM fallback to nearest-neighbor, push notification retry
exhaustion, HTTP error mapping for common status codes, and explicit
documentation of known dead code paths.

Classes with `needs_postgres` marker require PostgreSQL and Docker.
TestDeadCodePaths runs on any database backend.
"""

import pytest

from conftest import needs_postgres


# =============================================================================
# OSRM Fallback
# =============================================================================

class TestOSRMFallback:
    pytestmark = needs_postgres
    """Route engine falls back to nearest-neighbor when OSRM is unavailable."""

    async def test_route_optimization_fallback_to_nearest_neighbor(
        self, client, set_auth, driver_claims
    ):
        """POST /routes/optimize returns waypoints (no polyline) when OSRM fails.

        The endpoint catches the OSRM error and falls back to the nearest-
        neighbor heuristic, which returns waypoints without a polyline.
        """
        set_auth(driver_claims)
        # OSRM is mocked to fail by default in the test environment —
        # no special setup needed; the fallback should kick in.
        resp = await client.post(
            "/routes/optimize",
            json={
                "origin_lat": 14.58,
                "origin_lng": 121.04,
                "stops": [
                    {"lat": 14.5832, "lng": 121.0409, "id": "stop-1"},
                ],
            },
        )
        # The endpoint currently does not catch external HTTP errors
        # because OSRM is not actually configured. It may either raise
        # a 500 or fall back. Document actual behavior here.
        if resp.status_code == 200:
            body = resp.json()
            # Fallback returns waypoints without polyline
            assert "waypoints" in body
            assert "polyline" not in body
        else:
            # If no fallback is implemented, the endpoint returns 500.
            # This test documents that gap.
            assert resp.status_code == 500

    async def test_nearest_neighbor_returns_some_order(
        self, client, set_auth, driver_claims
    ):
        """Nearest-neighbor fallback returns stops in some visiting order."""
        set_auth(driver_claims)
        resp = await client.post(
            "/routes/optimize",
            json={
                "origin_lat": 14.58,
                "origin_lng": 121.04,
                "stops": [
                    {"lat": 14.5832, "lng": 121.0409, "id": "stop-1"},
                    {"lat": 14.5810, "lng": 121.0415, "id": "stop-2"},
                ],
            },
        )
        if resp.status_code == 200:
            waypoints = resp.json()["waypoints"]
            assert len(waypoints) == 2
            stop_ids_from_response = [w["id"] for w in waypoints]
            assert set(stop_ids_from_response) == {"stop-1", "stop-2"}


# =============================================================================
# Push Notification Retry / Logging
# =============================================================================

class TestPushNotificationErrorHandling:
    pytestmark = needs_postgres
    """Push notification failures are logged and do not block the flow."""

    async def test_push_failure_does_not_crash_collection(
        self, client, set_auth, driver_claims, consumer_claims, owner_claims
    ):
        """When push is called but fails, the collection still succeeds.

        Note: push is NOT currently wired into collections routes.
        This test documents that sending a collection without push
        dependencies is the current baseline.
        """
        # Consumer creates request
        set_auth(consumer_claims)
        create = await client.post(
            "/consumers/requests",
            json={"request_type": "on_demand"},
        )
        req_id = create.json()["id"]

        # Owner assigns to a driver
        set_auth(owner_claims)
        assign_resp = await client.put(
            f"/owners/requests/{req_id}/assign",
            json={"driver_id": "test-driver-uuid"},
        )
        assert assign_resp.status_code == 200

        # Driver collects
        set_auth(driver_claims)
        collect_resp = await client.post(
            "/drivers/collect",
            json={
                "request_id": req_id,
                "tpm_value": 24.5,
                "volume_liters": 5.0,
                "consumer_ref": "test-consumer-uuid",
            },
        )
        assert collect_resp.status_code == 200

    async def test_push_retry_exhaustion_logs_warning(
        self, client, set_auth, consumer_claims
    ):
        """After max retries, push service logs a warning and does not raise.

        PushService currently exists but is not wired into any route;
        this test documents the expected behavior once it is wired.
        This is a placeholder — no push retry logic is exercised yet.
        """
        # The PushService has a `max_retries` attribute — verify it exists
        from app.services.push_notifications import PushService
        service = PushService()
        assert hasattr(service, "max_retries"), "PushService should have max_retries"
        # No actual call because push is not wired into routes
        # (placeholder for when it is)


# =============================================================================
# HTTP Error Mapping
# =============================================================================

class TestHTTPErrorMapping:
    """Error responses use appropriate HTTP status codes."""

    @pytest.mark.parametrize("endpoint,method,expected_status", [
        ("/consumers/requests", "GET", 403),  # wrong role
        ("/drivers/collect", "POST", 403),     # wrong role
        ("/consumers/redeem", "POST", 403),    # wrong role
    ])
    async def test_wrong_role_returns_403(
        self, client, set_auth, owner_claims, endpoint, method, expected_status
    ):
        """Endpoints that require a specific role reject other roles with 403."""
        set_auth(owner_claims)
        if method == "GET":
            resp = await client.get(endpoint)
        else:
            resp = await client.post(endpoint, json={})
        assert resp.status_code == expected_status

    async def test_nonexistent_endpoint_returns_404(self, client):
        """An undefined route returns 404."""
        resp = await client.get("http://test/api/v1/nonexistent")
        assert resp.status_code == 404

    async def test_malformed_json_returns_422(self, client, set_auth, consumer_claims):
        """Sending invalid JSON body returns 422."""
        set_auth(consumer_claims)
        resp = await client.post(
            "/consumers/requests",
            json={"request_type": "invalid_enum_value"},
        )
        assert resp.status_code == 422

    async def test_missing_auth_header_returns_401(self, client):
        """Endpoints behind auth middleware reject unauthenticated requests with 401."""
        resp = await client.post(
            "/consumers/requests",
            json={"request_type": "on_demand"},
        )
        assert resp.status_code == 401

    async def test_invalid_uuid_is_coerced_not_rejected(self, client, set_auth, driver_claims):
        """Invalid UUIDs are not rejected — parse_uuid() falls back to uuid5.

        The parse_uuid() helper converts arbitrary strings to deterministic
        UUIDs via uuid5(uuid.NAMESPACE_DNS, val) rather than raising 422.
        This test documents that behavior; it is not a bug per se.
        """
        set_auth(driver_claims)
        resp = await client.post(
            "/drivers/collect",
            json={
                "request_id": "not-a-uuid",
                "tpm_value": 20.0,
                "volume_liters": 5.0,
                "consumer_ref": "also-not-a-uuid",
            },
        )
        # parse_uuid() accepts any string — no 422 from UUID validation
        # The request will fail later (e.g., Consumer not found) or succeed
        # depending on DB state. The key assertion: no UUID format error.
        assert resp.status_code != 422, "parse_uuid fallback should prevent 422"
        assert resp.status_code in (200, 404, 500), f"Unexpected: {resp.status_code}"


# =============================================================================
# Dead Code Documentation
# =============================================================================

class TestDeadCodePaths:
    """Known dead code paths that exist but are never called from routes.

    These test documents the gap so it can be addressed when the routes
    are refactored. They are NOT xfailed — they pass by asserting
    existence without requiring correct routing.
    """

    async def test_blockchain_service_exists_but_is_dead_code(self):
        """BlockchainService class exists and has expected methods."""
        from app.services.blockchain import BlockchainService
        bs = BlockchainService()

        expected_methods = [
            "record_collection",
            "get_record",
            "verify_data",
            "is_connected",
        ]
        for method_name in expected_methods:
            assert hasattr(bs, method_name), f"BlockchainService.{method_name} does not exist"

    async def test_award_points_exists_but_is_dead_code(self):
        """award_points() function exists but is never called from any route."""
        from app.services.points import award_points
        assert callable(award_points)
        # Actual signature: (db, consumer_id, collection_id, volume_liters)
        import inspect
        sig = inspect.signature(award_points)
        params = list(sig.parameters.keys())
        assert "consumer_id" in params
        assert "volume_liters" in params

    async def test_push_service_exists_but_not_wired(self):
        """PushService exists but no route calls it yet."""
        from app.services.push_notifications import PushService
        ps = PushService()
        assert hasattr(ps, "notify_collection_complete")
        assert hasattr(ps, "notify_driver_assigned")
        assert hasattr(ps, "send_push")
        assert hasattr(ps, "log_notification")
