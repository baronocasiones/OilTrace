# 08 — Route Optimization (OSRM)

## Overview

The driver app needs to visit multiple karinderyas in a single trip. OSRM (Open Source Routing Machine) calculates the optimal order of stops to minimize total travel time and distance.

## Architecture

```
Driver opens app → requests route
        │
        ▼
GET /api/drivers/route?pending_only=true
        │
        ▼
FastAPI Route Service:
  1. Get driver's current location from DB (current_lat, current_lng)
  2. Fetch all pending collection requests with lat/lng
  3. Filter to only unassigned OR assigned-to-this-driver requests
  4. Format waypoints for OSRM API:
     { coordinates: [[lng, lat], ...] }
  5. Call OSRM /table/v1/driving/... for distance matrix
  6. Solve Traveling Salesman Problem (nearest-neighbor heuristic)
  7. Re-order stops by optimal sequence
  8. Call OSRM /route/v1/driving/... for full route geometry
  9. Return ordered stops + polyline + ETAs
        │
        ▼
Driver app renders:
  - Map with route polyline (encoded)
  - Stop list (sorted by optimal order)
  - Turn-by-turn directions (optional)
```

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

Limitations:
- Rate limited (~60 req/min)
- Uses global OSM data (not PH-optimized but works)
- No traffic data (static routing only)

### Production: Self-Hosted OSRM

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

## FastAPI Route Service Implementation

```python
import requests
import math
from typing import List

OSRM_BASE = "https://router.project-osrm.org"

def optimize_route(
    origin_lat: float,
    origin_lng: float,
    stops: List[dict]  # [{id, lat, lng, address}, ...]
) -> dict:
    """
    Given a starting point and list of stops, return the optimal order.
    Uses a simple nearest-neighbor TSP heuristic.
    """
    if not stops:
        return {"waypoints": [], "total_distance_km": 0, "total_duration_min": 0}
    
    # Build coordinate pairs for OSRM
    coordinates = f"{origin_lng},{origin_lat}"
    for stop in stops:
        coordinates += f";{stop['lng']},{stop['lat']}"
    
    # Get distance matrix from OSRM
    matrix_url = f"{OSRM_BASE}/table/v1/driving/{coordinates}"
    params = {"annotations": "duration,distance"}
    response = requests.get(matrix_url, params=params)
    data = response.json()
    
    if "durations" not in data:
        # Fallback: nearest-neighbor using haversine
        return nearest_neighbor_fallback(origin_lat, origin_lng, stops)
    
    distances = data["distances"][0]  # distances from origin (index 0) to all stops
    
    # Sort stops by distance from origin (nearest-neighbor TSP)
    indexed_stops = list(enumerate(stops))
    indexed_stops.sort(key=lambda x: distances[x[0] + 1])  # +1 because origin is index 0
    
    ordered_stops = []
    cumulative_distance = 0
    prev_idx = 0
    
    for rank, (orig_idx, stop) in enumerate(indexed_stops):
        distance_km = data["distances"][prev_idx][orig_idx + 1] / 1000
        duration_min = data["durations"][prev_idx][orig_idx + 1] / 60
        cumulative_distance += distance_km
        
        ordered_stops.append({
            "stop": rank + 1,
            "request_id": stop["id"],
            "consumer_name": stop.get("name", ""),
            "address": stop.get("address", ""),
            "latitude": stop["lat"],
            "longitude": stop["lng"],
            "estimated_arrival": format_eta(duration_min),
            "distance_from_prev_km": round(distance_km, 2)
        })
        prev_idx = orig_idx + 1
    
    # Get full route geometry
    route_coords = f"{origin_lng},{origin_lat}"
    for stop in ordered_stops:
        route_coords += f";{stop['longitude']},{stop['latitude']}"
    
    route_url = f"{OSRM_BASE}/route/v1/driving/{route_coords}"
    route_response = requests.get(route_url, params={"geometries": "polyline6", "overview": "full"})
    route_data = route_response.json()
    
    return {
        "waypoints": ordered_stops,
        "total_distance_km": round(cumulative_distance, 1),
        "total_duration_min": round(sum(s["distance_from_prev_km"] for s in ordered_stops) * 3, 0),  # rough
        "polyline": route_data.get("routes", [{}])[0].get("geometry", ""),
    }


def nearest_neighbor_fallback(origin_lat, origin_lng, stops):
    """Simple haversine-based nearest neighbor when OSRM is unavailable."""
    def haversine(lat1, lng1, lat2, lng2):
        R = 6371  # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * \
            math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    current = (origin_lat, origin_lng)
    remaining = list(stops)
    ordered = []
    
    while remaining:
        nearest = min(remaining, key=lambda s: haversine(current[0], current[1], s["lat"], s["lng"]))
        dist = haversine(current[0], current[1], nearest["lat"], nearest["lng"])
        ordered.append({
            "stop": len(ordered) + 1,
            "request_id": nearest["id"],
            "latitude": nearest["lat"],
            "longitude": nearest["lng"],
            "distance_from_prev_km": round(dist, 2)
        })
        current = (nearest["lat"], nearest["lng"])
        remaining.remove(nearest)
    
    return {
        "waypoints": ordered,
        "total_distance_km": round(sum(s["distance_from_prev_km"] for s in ordered), 1),
        "total_duration_min": round(sum(s["distance_from_prev_km"] for s in ordered) * 3, 0),
        "polyline": ""
    }
```

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
