"""
Route optimization API endpoints.

Rate limited to 30 requests/minute per the security specification.
"""

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.dependencies import require_role, Claims
from app.services.route_engine import RouteEngine

router = APIRouter()

# Separate limiter for route-specific rate limit decorators.
# The middleware checks app.state.limiter (set in main.py) for enforcement.
_limiter = Limiter(key_func=get_remote_address)


# ── Schemas ────────────────────────────────────────────────────────────────


class StopInput(BaseModel):
    lat: float = Field(..., description="Stop latitude")
    lng: float = Field(..., description="Stop longitude")
    id: str = Field(..., description="Unique identifier for this stop")


class OptimizeInput(BaseModel):
    origin_lat: float = Field(..., description="Starting latitude")
    origin_lng: float = Field(..., description="Starting longitude")
    stops: list[StopInput] = Field(
        default_factory=list,
        description="List of stops to optimize",
    )


# ── Endpoints ──────────────────────────────────────────────────────────────


@router.post("/routes/optimize")
@_limiter.limit("30/minute")
async def optimize_route(
    request: Request,
    body: OptimizeInput,
    claims: Claims = Depends(require_role("driver")),
):
    """Optimize a multi-stop route using OSRM.

    Accepts an origin and a list of stops, returns an ordered route
    with waypoints, total distance, duration, and polyline geometry.
    Falls back to haversine nearest-neighbor when OSRM is unavailable.
    """
    engine = RouteEngine()
    stops = [s.model_dump() for s in body.stops]
    result = await engine.optimize(
        origin=(body.origin_lat, body.origin_lng),
        stops=stops,
    )
    return result
