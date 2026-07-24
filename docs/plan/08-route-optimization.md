# 08 — Route Optimization (OSRM)

## Overview

The driver app needs to visit multiple karinderyas in a single trip. OSRM (Open Source Routing Machine) calculates the optimal order of stops to minimize total travel time and distance.

## Architecture

```
Driver opens app → requests route
        │
        ▼
GET /api/v1/drivers/route?pending_only=true
        │
        ▼
FastAPI Route Service (app/services/route_engine.py):
  1. Get driver's current location from DB (current_lat, current_lng)
  2. If no location: fall back to first pending request's consumer coords
  3. If still nothing: return 400 error
  4. Query pending collection_requests (unassigned OR assigned-to-driver)
  5. Filter to requests with known consumer lat/lng
  6. Call RouteEngine.optimize(origin, stops):
     a. 0 stops → return empty
     b. 1 stop  → call OSRM /route/v1/driving/... for direct route geometry
     c. 2+ stops → call OSRM /table/v1/driving/... for distance matrix
                  → nearest-neighbor sort
                  → call OSRM /route/v1/driving/... for full geometry
  7. On any OSRM failure → fallback to haversine nearest-neighbor
  8. Enrich waypoints with consumer_name, address, etc.
  9. Return ordered stops + polyline + ETAs
        │
        ▼
Driver app renders:
  - Map with route polyline (encoded)
  - Stop list (sorted by optimal order)
  - Turn-by-turn directions (optional)
```

### API Endpoints

Two endpoints for route optimization:

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| POST | `/routes/optimize` | Driver JWT | 30 req/min | Generic route optimization — accepts origin + stops, returns ordered waypoints |
| GET | `/drivers/route` | Driver JWT | — | Driver's personalized route — auto-fetches pending requests from DB |

The generic `POST /routes/optimize` exists so the mobile team can preview/alternate routes. The driver's primary endpoint is `GET /drivers/route` which handles DB lookups automatically.

## OSRM Setup Options

| Option | Cost | Suitability |
|--------|------|-------------|
| **Public OSRM demo server** | Free | ✅ MVP — rate-limited but fine for demo (1-2 drivers) |
| **Self-hosted Docker** | ~₱500/mo VPS | ✅ Production — full control, PH-specific map data |
| **Alternative: Google Maps Routes API** | Free tier (limited) | ❌ Costs money beyond free tier |

### MVP: Public OSRM Demo Server

```
OSRM API: https://router.project-osrm.org
```

Configured via the `OSRM_BASE_URL` env var (defaults to the public server).

Limitations:
- Rate limited (~1 req/sec per app, ~5000 req/min server-wide)
- Uses global OSM data (not PH-optimized but works)
- No traffic data (static routing only)
- No uptime guarantee — built-in fallback handles outages
- Must set a valid `User-Agent` header (the engine sends `OilTrace/0.1.0`)

### Production: Self-Hosted OSRM

Set `OSRM_BASE_URL=http://localhost:5000` (or your VPS IP) in the deployment env.

```bash
# Download PH map data
wget https://download.geofabrik.de/asia/philippines-latest.osm.pbf

# Run OSRM with Docker
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
  osrm-extract -p /opt/car.lua /data/philippines-latest.osm.pbf

docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
  osrm-partition /data/philippines-latest.osrm

docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
  osrm-customize /data/philippines-latest.osrm

docker run -t -i -p 5000:5000 -v "${PWD}:/data" \
  ghcr.io/project-osrm/osrm-backend osrm-routed --algorithm mld \
  /data/philippines-latest.osrm
```

**Requirements:** 2GB RAM minimum, 10GB disk for PH map data.

## Implementation

The route engine lives in two files:

| File | Purpose |
|------|---------|
| `app/services/route_engine.py` | Core `RouteEngine` class + `nearest_neighbor()` fallback |
| `app/routes/routes.py` | `POST /routes/optimize` endpoint (rate-limited to 30 req/min) |
| `app/routes/collections.py` | `GET /drivers/route` endpoint (driver's personalized route) |

### RouteEngine Class (`app/services/route_engine.py`)

```python
class RouteEngine:
    def __init__(self, osrm_base_url: str | None = None):
        # Defaults to OSRM_BASE_URL env var or https://router.project-osrm.org

    async def optimize(self, origin: tuple[float, float], stops: list[dict]) -> dict:
        """Returns {waypoints, total_distance_km, total_duration_min, polyline, fallback_used}."""

    async def _fetch_osrm(self, url: str) -> dict:
        """Async HTTP GET via httpx.AsyncClient with User-Agent header. Monkeypatch-friendly."""
```

**Response shape** (both endpoints):
```json
{
  "waypoints": [
    { "id": "request-uuid", "order": 1, "eta_min": 8, "latitude": 14.58, "longitude": 121.04 }
  ],
  "total_distance_km": 6.2,
  "total_duration_min": 22,
  "polyline": "encoded_polyline6_string",
  "fallback_used": false
}
```

The `GET /drivers/route` endpoint enriches each waypoint with additional fields from the DB:

```json
{
  "waypoints": [
    {
      "stop": 1,
      "request_id": "uuid",
      "consumer_name": "Aling Maria's Karinderya",
      "address": "123 Rizal St, Barangay 5",
      "latitude": 14.5832,
      "longitude": 121.0409,
      "estimated_arrival": "8 min",
      "distance_from_prev": 1.2
    }
  ],
  "total_distance_km": 5.4,
  "total_duration_min": 35
}
```

### Fallback Behavior

| Scenario | Behavior |
|----------|----------|
| OSRM timeout (>10s) | Fallback to haversine nearest-neighbor |
| OSRM returns HTTP error (4xx/5xx) | Fallback |
| OSRM returns error code in body (`code != "Ok"`) | Fallback |
| OSRM response missing `routes` key | Fallback |
| All scenarios | `fallback_used: true` in response |

### Configuration

| Env Var | Default | Purpose |
|---------|---------|---------|
| `OSRM_BASE_URL` | `https://router.project-osrm.org` | OSRM server URL. Change to `http://localhost:5000` for self-hosted. |

### Rate Limiting

- `POST /routes/optimize`: **30 requests per minute** per IP (via slowapi `@limiter.limit`)
- `GET /drivers/route`: No explicit limit (uses default 100/min from app config)

## Driver Navigation Flow

```
┌──────────────────────────────────────────────┐
│          Driver App Navigation Flow           │
├──────────────────────────────────────────────┤
│                                              │
│  1. Driver opens app → sees Today's Route    │
│     ├── Map with all stops marked            │
│     ├── Optimized stop order (1, 2, 3...)    │
│     └── Total distance + estimated time       │
│                                              │
│  2. Driver taps "Start Navigation"           │
│     ├── Map shows route polyline             │
│     ├── First destination highlighted        │
│     └── Turn-by-turn if using OSRM directions │
│                                              │
│  3. Driver arrives at stop                   │
│     ├── App shows "Arrived" notification     │
│     ├── Taps "Start Collection"              │
│     └── Record Collection screen opens       │
│                                              │
│  4. After collection recorded                │
│     ├── Auto-navigate to next stop           │
│     └── Repeat until all stops completed     │
│                                              │
└──────────────────────────────────────────────┘
```

## Map Display

Uses `react-native-maps` with OpenStreetMap tiles (free, no API key needed):

```tsx
import MapView, { Marker, Polyline } from 'react-native-maps';
import PolylineDecoder from '@mapbox/polyline';

const RouteMap = ({ waypoints, polyline }) => {
  const decodedCoords = polyline
    ? PolylineDecoder.decode(polyline, 6).map(p => ({
        latitude: p[0], longitude: p[1]
      }))
    : [];

  return (
    <MapView
      initialRegion={/* fit all markers */}
    >
      <Polyline
        coordinates={decodedCoords}
        strokeColor="#4A90D9"
        strokeWidth={3}
      />
      {waypoints.map(stop => (
        <Marker
          key={stop.stop}
          coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
          title={`Stop ${stop.stop}: ${stop.consumer_name}`}
        />
      ))}
    </MapView>
  );
};
```

## Route Refresh

- Route is fetched once when driver opens the app
- Driver can pull-to-refresh to recalculate
- New collection requests are NOT auto-added mid-route (to avoid confusion)
- Driver completes current route, then refreshes for new stops
