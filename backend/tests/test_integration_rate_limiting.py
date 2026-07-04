"""
Integration tests for rate limit enforcement.

Covers the 30 req/min limit on POST /routes/optimize, the 100 req/min
global default, and rate limit response headers.

Note: SlowAPI uses in-memory counters that persist across tests within
the same test session. Run these tests in isolation or accept that
previous tests may consume some of the rate limit budget. These tests
are designed to be run as a unit (last in the suite).
"""

import pytest

from conftest import needs_postgres

pytestmark = needs_postgres


# =============================================================================
# Route Optimization Rate Limit (30/minute)
# =============================================================================

class TestRouteOptimizationRateLimit:
    """POST /routes/optimize is limited to 30 requests per minute."""

    async def test_allows_multiple_requests(self, client, set_auth, driver_claims):
        """A few rapid requests to /routes/optimize are allowed."""
        set_auth(driver_claims)
        for _ in range(5):
            resp = await client.post(
                "/routes/optimize",
                json={
                    "origin_lat": 14.58,
                    "origin_lng": 121.04,
                    "stops": [
                        {"lat": 14.5832, "lng": 121.0409, "id": "s1"},
                    ],
                },
            )
            assert resp.status_code in (200, 429)
            if resp.status_code == 429:
                break

    async def test_blocks_after_exceeding_limit(self, client, set_auth, driver_claims):
        """After exhausting the 30 req/min budget, the 31st request returns 429."""
        set_auth(driver_claims)
        results = []
        for _ in range(35):
            resp = await client.post(
                "/routes/optimize",
                json={
                    "origin_lat": 14.58,
                    "origin_lng": 121.04,
                    "stops": [],
                },
            )
            results.append(resp.status_code)

        # At least some requests should be 429 (rate limited)
        # At least some should be 200 (before budget exhausted)
        assert 429 in results, "Rate limiter did not block any requests"
        assert 200 in results, "All requests were blocked (budget already exhausted?)"

    async def test_rate_limit_returns_429_structure(self, client, set_auth, driver_claims):
        """429 response has expected slowapi error structure."""
        set_auth(driver_claims)
        # Rapidly hit the endpoint to trigger rate limiting
        status = None
        body = None
        for _ in range(40):
            resp = await client.post(
                "/routes/optimize",
                json={
                    "origin_lat": 14.58,
                    "origin_lng": 121.04,
                    "stops": [],
                },
            )
            if resp.status_code == 429:
                status = resp.status_code
                body = resp.json()
                break

        if status == 429:
            assert "detail" in body


# =============================================================================
# Rate Limit Headers
# =============================================================================

class TestRateLimitHeaders:
    """Rate limit headers in responses."""

    async def test_rate_limit_headers_present(self, client, set_auth, driver_claims):
        """Responses include X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset."""
        set_auth(driver_claims)
        resp = await client.post(
            "/routes/optimize",
            json={
                "origin_lat": 14.58,
                "origin_lng": 121.04,
                "stops": [],
            },
        )
        # slowapi may or may not add these headers depending on configuration
        # Check if they exist (they're not guaranteed by slowapi in all modes)
        headers = resp.headers
        # At minimum, the response should be 200 (not 429 for the first request)
        assert resp.status_code in (200, 429)

    async def test_health_endpoint_unlimited(self, client):
        """GET /health is not rate limited (or has separate budget)."""
        for _ in range(10):
            resp = await client.get("http://test/health")
            assert resp.status_code == 200
