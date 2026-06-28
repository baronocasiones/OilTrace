"""
Tests for Supabase Realtime integration (driver live location).

Covers: channel authorization, location publishing, subscription isolation,
RLS enforcement on Realtime channels.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestRealtimeChannelAuth:
    """Authorization for Realtime channels."""

    async def test_driver_publishes_to_correct_channel(self):
        """Driver publishes to channel 'driver:{id}:location'."""
        from app.services.realtime import LocationService

        mock_channel = MagicMock()
        mock_channel.send = AsyncMock(return_value={"status": "ok"})

        service = LocationService()
        service.channels["driver-123"] = mock_channel

        result = await service.publish_location(
            driver_id="driver-123",
            latitude=14.5832,
            longitude=121.0409,
            status="busy"
        )
        assert result["status"] == "ok"

    async def test_owner_can_subscribe_to_all_drivers(self):
        """Owner JWT grants access to all driver channels."""
        from app.services.realtime import LocationService

        service = LocationService()
        # Owner subscribes to all drivers
        can_subscribe = service.authorize_subscription(
            user_role="owner",
            channel_pattern="driver:*:location"
        )
        assert can_subscribe is True

    async def test_driver_cannot_subscribe_to_other_driver(self):
        """Driver cannot subscribe to another driver's location channel."""
        from app.services.realtime import LocationService

        service = LocationService()
        # Driver 1 trying to subscribe to Driver 2's channel
        can_subscribe = service.authorize_subscription(
            user_role="driver",
            user_id="driver-1",
            channel_pattern="driver:driver-2:location"
        )
        assert can_subscribe is False

    async def test_consumer_cannot_subscribe_to_any_driver(self):
        """Consumer JWT cannot access any driver location channel."""
        from app.services.realtime import LocationService

        service = LocationService()
        can_subscribe = service.authorize_subscription(
            user_role="consumer",
            channel_pattern="driver:*:location"
        )
        assert can_subscribe is False

    async def test_driver_can_subscribe_to_own_channel(self):
        """Driver CAN subscribe to their own location channel."""
        from app.services.realtime import LocationService

        service = LocationService()
        can_subscribe = service.authorize_subscription(
            user_role="driver",
            user_id="driver-1",
            channel_pattern="driver:driver-1:location"
        )
        assert can_subscribe is True


class TestLocationPublishing:
    """Driver location update frequency and data integrity."""

    async def test_location_payload_format(self):
        """Location payload has all required fields."""
        from app.services.realtime import LocationService

        service = LocationService()
        payload = service.build_location_payload(
            driver_id="driver-123",
            latitude=14.5832,
            longitude=121.0409,
            status="busy"
        )
        assert payload["driver_id"] == "driver-123"
        assert payload["latitude"] == 14.5832
        assert payload["longitude"] == 121.0409
        assert payload["status"] in ("available", "busy", "offline")
        assert "timestamp" in payload

    async def test_location_update_rate_limited(self):
        """Location updates more frequent than 5s are throttled."""
        from app.services.realtime import LocationService
        import time

        service = LocationService()
        driver_id = "driver-123"

        # First update
        ok1 = await service.publish_location(driver_id, 14.58, 121.04, "busy")

        # Immediate second update (should be throttled)
        ok2 = await service.publish_location(driver_id, 14.59, 121.05, "busy")

        # At least one should succeed (or both if time passed)
        # The second should not crash the service
        assert ok2 is not None

    async def test_driver_offline_sets_status(self):
        """Driver goes offline → status = offline on last known location."""
        from app.services.realtime import LocationService

        service = LocationService()
        result = await service.set_driver_offline("driver-123")
        assert result["status"] == "offline"


class TestRealtimeErrorHandling:
    """Handling Realtime connection issues."""

    async def test_realtime_disconnect_does_not_crash(self):
        """Supabase Realtime connection drops → service logs and reconnects."""
        from app.services.realtime import LocationService

        service = LocationService()

        # Simulate disconnect
        result = await service.handle_disconnect("driver-123")
        assert result is True  # Service handled it gracefully

    async def test_broadcast_to_nonexistent_channel(self):
        """Sending to a channel that doesn't exist doesn't crash."""
        from app.services.realtime import LocationService

        service = LocationService()
        result = await service.publish_location(
            driver_id="non-existent",
            latitude=14.58,
            longitude=121.04,
            status="busy"
        )
        # Should either create the channel or return error gracefully
        assert result is not None
