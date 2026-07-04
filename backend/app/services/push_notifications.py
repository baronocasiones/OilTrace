"""
Push notification service using Expo Push API.

Relays notifications through Expo's free push notification gateway,
which routes to FCM (Android) / APNs (iOS) using the Expo push token.
"""

import asyncio
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
MAX_RETRIES = 2


class PushService:
    """Manages push notification delivery via Expo Push API."""

    @staticmethod
    async def send_push(token: str, title: str, body: str) -> dict:
        """Send a push notification via Expo Push API.

        No API key required — the Expo push token itself authorizes delivery.
        Expo relays to the appropriate native push service (FCM / APNs).

        This is a static method so monkey-patching in tests works cleanly
        without Python binding ``self`` as an extra argument.
        """
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                EXPO_PUSH_URL,
                json={"to": token, "title": title, "body": body},
            )
            resp.raise_for_status()
            return resp.json()

    async def notify_driver_assigned(
        self,
        driver_push_token: str,
        consumer_name: str,
        volume_liters: float,
        profile_id: Optional[str] = None,
    ) -> dict:
        """Notify a driver that a collection request has been assigned."""
        title = "New Collection Assigned"
        body = f"You've been assigned to collect {volume_liters}L of used oil from {consumer_name}"

        for attempt in range(MAX_RETRIES):
            try:
                result = await PushService.send_push(driver_push_token, title, body)
                await self.log_notification(
                    profile_id=profile_id,
                    push_token=driver_push_token,
                    title=title,
                    body=body,
                    status="sent",
                )
                return result
            except Exception as e:
                logger.warning(
                    "Push send attempt %d/%d failed: %s",
                    attempt + 1, MAX_RETRIES, e,
                )
                if attempt == MAX_RETRIES - 1:
                    await self.log_notification(
                        profile_id=profile_id,
                        push_token=driver_push_token,
                        title=title,
                        body=body,
                        status="failed",
                    )
                    return {"status": "error", "error": str(e)}
                await asyncio.sleep(0.5)

        return {"status": "error", "error": "Max retries exceeded"}

    async def notify_collection_complete(
        self,
        consumer_push_token: str,
        volume_liters: float,
        points_awarded: int,
        profile_id: Optional[str] = None,
    ) -> dict:
        """Notify a consumer that their collection is complete and points awarded."""
        title = "Collection Complete!"
        body = (
            f"Your {volume_liters}L of used oil has been collected. "
            f"You earned {points_awarded} points!"
        )

        for attempt in range(MAX_RETRIES):
            try:
                result = await PushService.send_push(consumer_push_token, title, body)
                await self.log_notification(
                    profile_id=profile_id,
                    push_token=consumer_push_token,
                    title=title,
                    body=body,
                    status="sent",
                )
                return result
            except Exception as e:
                logger.warning(
                    "Push send attempt %d/%d failed: %s",
                    attempt + 1, MAX_RETRIES, e,
                )
                if attempt == MAX_RETRIES - 1:
                    await self.log_notification(
                        profile_id=profile_id,
                        push_token=consumer_push_token,
                        title=title,
                        body=body,
                        status="failed",
                    )
                    return {"status": "error", "error": str(e)}
                await asyncio.sleep(0.5)

        return {"status": "error", "error": "Max retries exceeded"}

    async def log_notification(
        self,
        profile_id: Optional[str],
        push_token: str,
        title: str,
        body: str,
        status: str,
    ) -> None:
        """Record a notification delivery attempt for audit.

        For MVP this logs to the application logger. Future versions
        may persist to a ``notification_log`` table.
        """
        logger.info(
            "Notification %s | token=%s title=%s profile=%s",
            status, push_token, title, profile_id,
        )
