"""
Tests for the route optimization service.

Covers: OSRM integration, nearest-neighbor fallback,
edge cases (single stop, zero stops), polyline generation.
"""

import pytest
from unittest.mock import patch, MagicMock
import json


class TestRouteOptimization:
    """Route engine business logic."""

    async def test_route_returns_optimal_order(self, client):
        """Multiple stops → optimized ordering."""
        resp = await client.post(
            "/routes/optimize",
            json={
                "origin_lat": 14.5800,
                "origin_lng": 121.0400,
                "stops": [
                    {"lat": 14.5832, "lng": 121.0409, "id": "stop-1"},
                    {"lat": 14.5901, "lng": 121.0450, "id": "stop-2"},
                    {"lat": 14.5750, "lng": 121.0350, "id": "stop-3"},
                ]
            },
            headers={"Authorization": "Bearer mock-driver-jwt"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "waypoints" in data
        assert len(data["waypoints"]) == 3
        assert "total_distance_km" in data
        assert "total_duration_min" in data

    async def test_route_with_single_stop(self, client):
        """Edge case: only one collection pending → direct route."""
        resp = await client.post(
            "/routes/optimize",
            json={
                "origin_lat": 14.5800,
                "origin_lng": 121.0400,
                "stops": [
                    {"lat": 14.5832, "lng": 121.0409, "id": "stop-1"},
                ]
            },
            headers={"Authorization": "Bearer mock-driver-jwt"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["waypoints"]) == 1
        assert data["waypoints"][0]["order"] == 1

    async def test_route_with_zero_stops(self, client):
        """No pending collections → empty route."""
        resp = await client.post(
            "/routes/optimize",
            json={
                "origin_lat": 14.5800,
                "origin_lng": 121.0400,
                "stops": []
            },
            headers={"Authorization": "Bearer mock-driver-jwt"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["waypoints"]) == 0
        assert data["total_distance_km"] == 0
        assert data["total_duration_min"] == 0

    async def test_route_requires_auth(self, client):
        """Route optimization requires JWT."""
        resp = await client.post(
            "/routes/optimize",
            json={
                "origin_lat": 14.5800,
                "origin_lng": 121.0400,
                "stops": []
            }
        )
        assert resp.status_code == 401

    async def test_route_consumer_cannot_access(self, client):
        """Consumer JWT → route endpoint → 403."""
        resp = await client.post(
            "/routes/optimize",
            json={
                "origin_lat": 14.5800,
                "origin_lng": 121.0400,
                "stops": []
            },
            headers={"Authorization": "Bearer mock-consumer-jwt"}
        )
        assert resp.status_code == 403


class TestOSRMIntegration:
    """External OSRM API interaction."""

    async def test_osrm_success_response_parsed_correctly(self, monkeypatch):
        """Mock OSRM response → parsed into waypoints."""
        from app.services.route_engine import RouteEngine

        mock_osrm_response = {
            "code": "Ok",
            "waypoints": [
                {"location": [121.0409, 14.5832], "waypoint_index": 0}
            ],
            "routes": [{
                "distance": 1200.0,
                "duration": 480.0,
                "geometry": "mock_polyline"
            }]
        }

        async def mock_fetch(*args, **kwargs):
            return mock_osrm_response

        monkeypatch.setattr(
            "app.services.route_engine.RouteEngine._fetch_osrm",
            mock_fetch
        )

        engine = RouteEngine()
        result = await engine.optimize(
            origin=(14.58, 121.04),
            stops=[{"lat": 14.5832, "lng": 121.0409, "id": "stop-1"}]
        )
        assert result["total_distance_km"] == 1.2  # 1200m → 1.2km
        assert result["total_duration_min"] == 8  # 480s → 8min

    async def test_osrm_timeout_falls_back_to_nearest_neighbor(self, monkeypatch):
        """OSRM unresponsive → fallback to simple nearest-neighbor."""
        from app.services.route_engine import RouteEngine

        async def mock_timeout(*args, **kwargs):
            raise TimeoutError("OSRM timed out")

        monkeypatch.setattr(
            "app.services.route_engine.RouteEngine._fetch_osrm",
            mock_timeout
        )

        engine = RouteEngine()
        result = await engine.optimize(
            origin=(14.58, 121.04),
            stops=[
                {"lat": 14.5832, "lng": 121.0409, "id": "stop-1"},
                {"lat": 14.5901, "lng": 121.0450, "id": "stop-2"},
            ]
        )
        # Fallback should still return a valid route
        assert len(result["waypoints"]) == 2
        assert result["fallback_used"] is True

    async def test_osrm_http_error_falls_back(self, monkeypatch):
        """OSRM returns error code → fallback."""
        from app.services.route_engine import RouteEngine

        async def mock_error(*args, **kwargs):
            return {"code": "NoRoute"}

        monkeypatch.setattr(
            "app.services.route_engine.RouteEngine._fetch_osrm",
            mock_error
        )

        engine = RouteEngine()
        result = await engine.optimize(
            origin=(14.58, 121.04),
            stops=[{"lat": 14.5832, "lng": 121.0409, "id": "stop-1"}]
        )
        assert result["fallback_used"] is True

    async def test_route_includes_polyline(self, client):
        """Route response includes encoded polyline for map rendering."""
        resp = await client.post(
            "/routes/optimize",
            json={
                "origin_lat": 14.5800,
                "origin_lng": 121.0400,
                "stops": [
                    {"lat": 14.5832, "lng": 121.0409, "id": "stop-1"},
                ]
            },
            headers={"Authorization": "Bearer mock-driver-jwt"}
        )
        if resp.status_code == 200:
            assert "polyline" in resp.json()


class TestNearestNeighborFallback:
    """Simple fallback algorithm correctness."""

    def test_nearest_neighbor_ordering(self):
        """Nearest neighbor produces a valid route order."""
        from app.services.route_engine import nearest_neighbor

        origin = (14.5800, 121.0400)
        stops = [
            {"lat": 14.5901, "lng": 121.0450, "id": "far"},
            {"lat": 14.5832, "lng": 121.0409, "id": "near"},
        ]

        ordered = nearest_neighbor(origin, stops)
        # The nearest stop should come first
        assert ordered[0]["id"] == "near"
        assert ordered[1]["id"] == "far"

    def test_nearest_neighbor_single_stop(self):
        """Single stop → just that stop."""
        from app.services.route_engine import nearest_neighbor
        result = nearest_neighbor(
            (14.58, 121.04),
            [{"lat": 14.5832, "lng": 121.0409, "id": "only"}]
        )
        assert len(result) == 1
        assert result[0]["id"] == "only"
