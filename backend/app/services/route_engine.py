"""
Route optimization engine using OSRM with nearest-neighbor fallback.

Uses httpx.AsyncClient for async HTTP calls to OSRM public demo server.
Falls back to haversine-based nearest-neighbor when OSRM is unavailable.

Configuration:
    OSRM_BASE_URL — env var for custom OSRM server URL.
                    Defaults to https://router.project-osrm.org
"""

import math
import os
from typing import Optional

import httpx

OSRM_BASE_URL = os.environ.get(
    "OSRM_BASE_URL",
    "https://router.project-osrm.org",
)

USER_AGENT = "OilTrace/0.1.0 (oil-trace-app)"


class RouteEngine:
    """Optimizes stop ordering using OSRM routing with nearest-neighbor fallback.

    Usage:
        engine = RouteEngine()
        result = await engine.optimize(
            origin=(14.58, 121.04),
            stops=[{"lat": ..., "lng": ..., "id": "..."}, ...],
        )
    """

    def __init__(self, osrm_base_url: Optional[str] = None):
        self.osrm_base_url = (osrm_base_url or OSRM_BASE_URL).rstrip("/")

    async def _fetch_osrm(self, url: str) -> dict:
        """Make an async HTTP GET to OSRM and return parsed JSON.

        Can be monkeypatched in tests.
        """
        headers = {"User-Agent": USER_AGENT}
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=10)
            resp.raise_for_status()
            return resp.json()

    async def optimize(
        self,
        origin: tuple[float, float],
        stops: list[dict],
    ) -> dict:
        """Return an optimized route through the given stops.

        Args:
            origin: (latitude, longitude) of the starting point.
            stops: List of dicts, each with 'lat', 'lng', and 'id' keys.

        Returns:
            dict with keys:
                waypoints          — list of ordered stops
                total_distance_km  — total route distance
                total_duration_min — estimated total duration
                polyline           — OSRM polyline6 geometry string, or '' on fallback
                fallback_used      — True if OSRM was unavailable
        """
        if not stops:
            return {
                "waypoints": [],
                "total_distance_km": 0.0,
                "total_duration_min": 0,
                "polyline": "",
                "fallback_used": False,
            }

        if len(stops) == 1:
            return await self._route_single(origin, stops[0])

        return await self._route_multi(origin, stops)

    async def _route_single(
        self, origin: tuple[float, float], stop: dict
    ) -> dict:
        """Optimize a single stop — get route geometry directly."""
        coords = f"{origin[1]},{origin[0]};{stop['lng']},{stop['lat']}"
        url = (
            f"{self.osrm_base_url}/route/v1/driving/{coords}"
            "?geometries=polyline6&overview=full"
        )
        try:
            data = await self._fetch_osrm(url)
            if data.get("code") != "Ok" or not data.get("routes"):
                return self._fallback(origin, [stop])

            route = data["routes"][0]
            return {
                "waypoints": [
                    {
                        "id": stop["id"],
                        "order": 1,
                        "eta_min": round(route["duration"] / 60),
                        "latitude": stop["lat"],
                        "longitude": stop["lng"],
                    }
                ],
                "total_distance_km": round(route["distance"] / 1000, 1),
                "total_duration_min": round(route["duration"] / 60),
                "polyline": route.get("geometry", ""),
                "fallback_used": False,
            }
        except (httpx.HTTPError, TimeoutError, OSError, KeyError, IndexError):
            return self._fallback(origin, [stop])

    async def _route_multi(
        self, origin: tuple[float, float], stops: list[dict]
    ) -> dict:
        """Optimize multiple stops using OSRM matrix + nearest-neighbor."""
        # Step 1: Build coordinate string (origin + all stops)
        all_coords = [origin] + [(s["lat"], s["lng"]) for s in stops]
        coords_str = ";".join(f"{lng},{lat}" for lat, lng in all_coords)
        table_url = (
            f"{self.osrm_base_url}/table/v1/driving/{coords_str}"
            "?annotations=duration,distance"
        )

        try:
            table_data = await self._fetch_osrm(table_url)
            if (
                table_data.get("code") != "Ok"
                or "distances" not in table_data
                or "durations" not in table_data
            ):
                return self._fallback(origin, stops)

            # Step 2: Nearest-neighbor ordering via distance matrix
            # distances[0] = distances from origin to each stop (index 1, 2, ...)
            indexed = list(enumerate(stops))
            indexed.sort(key=lambda x: table_data["distances"][0][x[0] + 1])

            ordered_stops = []
            cumulative_distance = 0.0
            prev_idx = 0  # origin is index 0

            for rank, (orig_idx, stop) in enumerate(indexed):
                dist_km = table_data["distances"][prev_idx][orig_idx + 1] / 1000
                dur_min = table_data["durations"][prev_idx][orig_idx + 1] / 60
                cumulative_distance += dist_km

                ordered_stops.append(
                    {
                        "id": stop["id"],
                        "order": rank + 1,
                        "eta_min": round(dur_min),
                        "latitude": stop["lat"],
                        "longitude": stop["lng"],
                        "distance_from_prev_km": round(dist_km, 2),
                    }
                )
                prev_idx = orig_idx + 1

            # Step 3: Fetch full route geometry
            route_coords_str = f"{origin[1]},{origin[0]}"
            for s in ordered_stops:
                route_coords_str += f";{s['longitude']},{s['latitude']}"

            route_url = (
                f"{self.osrm_base_url}/route/v1/driving/{route_coords_str}"
                "?geometries=polyline6&overview=full"
            )
            try:
                route_data = await self._fetch_osrm(route_url)
                polyline = (
                    route_data.get("routes", [{}])[0].get("geometry", "")
                    if route_data.get("code") == "Ok"
                    else ""
                )
            except (httpx.HTTPError, TimeoutError, OSError):
                polyline = ""

            # Strip internal fields from public waypoints
            waypoints = [
                {k: v for k, v in wp.items() if k != "distance_from_prev_km"}
                for wp in ordered_stops
            ]

            total_min = round(
                sum(s["distance_from_prev_km"] for s in ordered_stops) * 3
            )

            return {
                "waypoints": waypoints,
                "total_distance_km": round(cumulative_distance, 1),
                "total_duration_min": total_min,
                "polyline": polyline,
                "fallback_used": False,
            }

        except (httpx.HTTPError, TimeoutError, OSError, KeyError, IndexError):
            return self._fallback(origin, stops)

    def _fallback(
        self, origin: tuple[float, float], stops: list[dict]
    ) -> dict:
        """Nearest-neighbor fallback using haversine when OSRM is unavailable."""
        ordered = nearest_neighbor(origin, stops)
        total_dist = sum(s["distance_from_prev_km"] for s in ordered)
        return {
            "waypoints": [
                {
                    "id": s["id"],
                    "order": s["order"],
                    "eta_min": round(s["distance_from_prev_km"] * 3),
                    "latitude": s["latitude"],
                    "longitude": s["longitude"],
                }
                for s in ordered
            ],
            "total_distance_km": round(total_dist, 1),
            "total_duration_min": round(total_dist * 3),
            "polyline": "",
            "fallback_used": True,
        }


def nearest_neighbor(
    origin: tuple[float, float],
    stops: list[dict],
) -> list[dict]:
    """Order stops by nearest-neighbor heuristic using haversine distance.

    Args:
        origin: (latitude, longitude) starting point.
        stops: List of dicts with 'lat', 'lng', and 'id'.

    Returns:
        Ordered list of dicts with id, order, latitude, longitude,
        and distance_from_prev_km.
    """
    current = (origin[0], origin[1])
    remaining = list(stops)
    ordered: list[dict] = []

    while remaining:
        nearest = min(
            remaining,
            key=lambda s: haversine(
                current[0], current[1], s["lat"], s["lng"]
            ),
        )
        dist = haversine(
            current[0], current[1], nearest["lat"], nearest["lng"]
        )
        ordered.append(
            {
                "id": nearest["id"],
                "order": len(ordered) + 1,
                "latitude": nearest["lat"],
                "longitude": nearest["lng"],
                "distance_from_prev_km": round(dist, 2),
            }
        )
        current = (nearest["lat"], nearest["lng"])
        remaining.remove(nearest)

    return ordered


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in kilometers between two points on Earth."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
