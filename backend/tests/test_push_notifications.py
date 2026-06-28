"""
Tests for the push notification service.

Covers: device token registration, sending notifications,
invalid token handling, notification delivery tracking.
"""

import pytest
from unittest.mock import patch, AsyncMock


class TestDeviceTokenRegistration:
    """Registering and unregistering push tokens."""

    async def test_register_device_token(self, client):
        """Consumer registers their push token → 200 + token_id."""
        resp = await client.post(
            "/notifications/register",
            json={
                "platform": "android",
                "push_token": "ExponentPushToken[test-token-123]"
            },
            headers={"Authorization": "Bearer mock-consumer-jwt"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "registered"
        assert "token_id" in data

    async def test_register_duplicate_token_updates(self, client):
        """Registering the same token twice updates the existing record."""
        resp1 = await client.post(
            "/notifications/register",
            json={
                "platform": "android",
                "push_token": "ExponentPushToken[duplicate-token]"
            },
            headers={"Authorization": "Bearer mock-consumer-jwt"}
        )
        token_id_1 = resp1.json()["token_id"]

        resp2 = await client.post(
            "/notifications/register",
            json={
                "platform": "ios",
                "push_token": "ExponentPushToken[duplicate-token]"
            },
            headers={"Authorization": "Bearer mock-consumer-jwt"}
        )
        # Should update the same record, not create a new one
        assert resp2.json()["token_id"] == token_id_1

    async def test_unregister_token(self, client):
        """Consumer unregisters → token is deactivated."""
        # First register
        reg = await client.post(
            "/notifications/register",
            json={"platform": "android", "push_token": "ExponentPushToken[remove-me]"},
            headers={"Authorization": "Bearer mock-consumer-jwt"}
        )
        assert reg.status_code == 200

        # Then unregister
        resp = await client.put(
            "/notifications/unregister",
            json={"push_token": "ExponentPushToken[remove-me]"},
            headers={"Authorization": "Bearer mock-consumer-jwt"}
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "unregistered"

    async def test_register_without_auth(self, client):
        """Registration requires auth."""
        resp = await client.post(
            "/notifications/register",
            json={"platform": "android", "push_token": "test"}
        )
        assert resp.status_code == 401


class TestSendNotifications:
    """Sending push notifications to users."""

    async def test_send_notification_on_driver_assignment(self, monkeypatch):
        """Assigning a driver triggers a notification to the driver."""
        from app.services.push_notifications import PushService

        mock_send = AsyncMock(return_value={"status": "ok"})
        monkeypatch.setattr(
            "app.services.push_notifications.PushService.send_push",
            mock_send
        )

        service = PushService()
        result = await service.notify_driver_assigned(
            driver_push_token="ExponentPushToken[driver-token]",
            consumer_name="Aling Maria's",
            volume_liters=5.0
        )
        assert result["status"] == "ok"
        mock_send.assert_called_once()

    async def test_send_notification_on_completed_collection(self, monkeypatch):
        """Completing a collection notifies the consumer about points."""
        from app.services.push_notifications import PushService

        mock_send = AsyncMock(return_value={"status": "ok"})
        monkeypatch.setattr(
            "app.services.push_notifications.PushService.send_push",
            mock_send
        )

        service = PushService()
        result = await service.notify_collection_complete(
            consumer_push_token="ExponentPushToken[consumer-token]",
            volume_liters=5.0,
            points_awarded=50
        )
        assert result["status"] == "ok"

    async def test_send_notification_on_points_expiry(self, monkeypatch):
        """Reminding consumers about expiring points."""
        from app.services.push_notifications import PushService

        mock_send = AsyncMock(return_value={"status": "ok"})
        monkeypatch.setattr(
            "app.services.push_notifications.PushService.send_push",
            mock_send
        )

        service = PushService()
        result = await service.notify_points_expiring(
            consumer_push_token="ExponentPushToken[consumer-token]",
            expiring_points=50,
            expiry_days=3
        )
        assert result["status"] == "ok"


class TestNotificationErrorHandling:
    """Handling failures in the push delivery pipeline."""

    async def test_invalid_push_token_does_not_crash(self, monkeypatch):
        """Invalid/expired Expo push token is handled gracefully."""
        from app.services.push_notifications import PushService

        mock_send = AsyncMock(side_effect=Exception("Invalid token"))
        monkeypatch.setattr(
            "app.services.push_notifications.PushService.send_push",
            mock_send
        )

        service = PushService()
        # Should not raise — should log and return error status
        try:
            result = await service.notify_driver_assigned(
                driver_push_token="ExponentPushToken[invalid]",
                consumer_name="Test",
                volume_liters=5.0
            )
            assert "error" in result
        except Exception:
            pytest.fail("Push service should not crash on invalid token")

    async def test_rate_limited_push_queued_for_retry(self, monkeypatch):
        """Expo rate limit (429) queues the notification for retry."""
        from app.services.push_notifications import PushService

        call_count = 0

        async def rate_limited_send(token, title, body):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise Exception("Rate limited")
            return {"status": "ok"}

        monkeypatch.setattr(
            "app.services.push_notifications.PushService.send_push",
            rate_limited_send
        )

        service = PushService()
        result = await service.notify_driver_assigned(
            driver_push_token="ExponentPushToken[test]",
            consumer_name="Test",
            volume_liters=5.0
        )
        # Should have retried and eventually succeeded
        assert call_count >= 2

    async def test_push_logged_for_audit(self, monkeypatch):
        """Every sent notification is recorded in the database."""
        from app.services.push_notifications import PushService

        mock_log = AsyncMock()
        monkeypatch.setattr(
            "app.services.push_notifications.PushService.log_notification",
            mock_log
        )

        service = PushService()
        await service.notify_driver_assigned(
            driver_push_token="ExponentPushToken[test]",
            consumer_name="Test",
            volume_liters=5.0
        )
        mock_log.assert_called_once()
