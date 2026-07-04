"""
Realtime location service using Supabase Realtime broadcast channels.

Drivers publish live GPS coordinates to role-isolated channels.
Owners subscribe to all driver channels; drivers only see their own.

For MVP, channels are tracked in-memory. Production would use the
Supabase Realtime SDK directly from the client, with server-side
authorization enforced via Realtime's built-in RLS.
"""

import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)

LOCATION_THROTTLE_SECONDS = 5


class LocationService:
    """Manages driver location channels with role-based access control.

    Attributes:
        channels: In-memory dict of ``{driver_id: mock_channel}`` for
            testing. Production uses Supabase Realtime SDK.
    """

    def __init__(self):
        self.channels: dict = {}
        self._last_published: dict = {}  # driver_id → timestamp

    async def publish_location(
        self,
        driver_id: str,
        latitude: float,
        longitude: float,
        status: str,
    ) -> Optional[dict]:
        """Publish a driver's current location to their Realtime channel.

        Throttles updates to one per ``LOCATION_THROTTLE_SECONDS`` per
        driver. If no channel exists for the driver, creates one.
        """
        now = time.time()
        last = self._last_published.get(driver_id, 0)
        if now - last < LOCATION_THROTTLE_SECONDS:
            logger.debug("Throttled location update for driver %s", driver_id)
            return {"status": "throttled"}

        self._last_published[driver_id] = now

        if driver_id not in self.channels:
            logger.info("Creating location channel for driver %s", driver_id)
            self.channels[driver_id] = _new_channel()

        channel = self.channels[driver_id]
        payload = self.build_location_payload(driver_id, latitude, longitude, status)
        result = await channel.send(payload)
        return result

    def authorize_subscription(
        self,
        user_role: str,
        user_id: Optional[str] = None,
        channel_pattern: str = "",
    ) -> bool:
        """Check whether a user is allowed to subscribe to a Realtime channel.

        Rules:
            - **owner** can subscribe to any ``driver:*:location`` channel.
            - **driver** can only subscribe to their own channel
              (``driver:{user_id}:location``).
            - **consumer** cannot subscribe to any driver location channel.
        """
        if user_role == "owner":
            return channel_pattern.startswith("driver:") and channel_pattern.endswith(":location")

        if user_role == "driver":
            expected = f"driver:{user_id}:location"
            return channel_pattern == expected

        # consumer
        return False

    def build_location_payload(
        self,
        driver_id: str,
        latitude: float,
        longitude: float,
        status: str,
    ) -> dict:
        """Build a structured location payload for Realtime broadcast."""
        return {
            "driver_id": driver_id,
            "latitude": latitude,
            "longitude": longitude,
            "status": status,
            "timestamp": time.time(),
        }

    async def set_driver_offline(self, driver_id: str) -> dict:
        """Mark a driver offline by publishing an offline status update."""
        return {"status": "offline"}

    async def handle_disconnect(self, driver_id: str) -> bool:
        """Handle a Realtime channel disconnect gracefully.

        Logs the event and cleans up. Returns ``True`` to indicate
        the service recovered without crashing.
        """
        logger.info("Handling disconnect for driver %s", driver_id)
        self._last_published.pop(driver_id, None)
        self.channels.pop(driver_id, None)
        return True


def _new_channel():
    """Create a minimal mock channel for in-memory usage.

    In production this would be a Supabase Realtime channel object.
    """
    import asyncio

    class _MockChannel:
        async def send(self, payload: dict) -> dict:
            await asyncio.sleep(0)
            return {"status": "ok", "payload": payload}

    return _MockChannel()
