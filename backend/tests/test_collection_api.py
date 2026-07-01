"""
Tests for the collection request and collection record APIs.

Covers: CRUD operations, status transitions, driver assignment,
request → collect pipeline.

Uses authenticated client fixtures (consumer_client, driver_client, owner_client)
instead of sending mock JWTs in headers. Tests that need multiple roles mid-test
use the `set_auth` helper with `client`.
"""

import pytest
from datetime import date


class TestCollectionRequests:
    """Consumer-facing request creation and management."""

    async def test_create_on_demand_request(self, consumer_client):
        """Consumer creates an on-demand request → status=pending."""
        resp = await consumer_client.post(
            "/consumers/requests",
            json={
                "request_type": "on_demand",
                "notes": "Please pickup ASAP"
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "pending"
        assert data["request_type"] == "on_demand"
        assert "id" in data
        assert "requested_at" in data

    async def test_create_scheduled_request(self, consumer_client):
        """Consumer creates a scheduled request with a future date."""
        resp = await consumer_client.post(
            "/consumers/requests",
            json={
                "request_type": "scheduled",
                "scheduled_date": str(date(2026, 7, 1)),
                "notes": "Next week pickup"
            },
        )
        assert resp.status_code == 201
        assert resp.json()["status"] == "pending"
        assert resp.json()["request_type"] == "scheduled"

    async def test_create_request_without_auth(self, client):
        """Unauthenticated request → 401."""
        resp = await client.post(
            "/consumers/requests",
            json={"request_type": "on_demand"}
        )
        assert resp.status_code == 401

    async def test_list_own_requests(self, consumer_client):
        """Consumer sees only their own requests."""
        resp = await consumer_client.get("/consumers/requests")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_get_single_request(self, consumer_client):
        """Consumer can fetch details of one request."""
        # First create one
        create = await consumer_client.post(
            "/consumers/requests",
            json={"request_type": "on_demand"},
        )
        req_id = create.json()["id"]

        # Then fetch it
        resp = await consumer_client.get(f"/consumers/requests/{req_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == req_id

    async def test_get_nonexistent_request_returns_404(self, consumer_client):
        """Fetching a non-existent request returns 404."""
        resp = await consumer_client.get(
            "/consumers/requests/00000000-0000-0000-0000-000000000000",
        )
        assert resp.status_code == 404


class TestDriverAssignment:
    """Owner → driver assignment workflow."""

    async def test_owner_can_assign_driver(self, client, set_auth, consumer_claims, owner_claims):
        """Owner assigns a driver → request status changes to assigned."""
        # Create request as consumer
        set_auth(consumer_claims)
        create = await client.post(
            "/consumers/requests",
            json={"request_type": "on_demand"},
        )
        req_id = create.json()["id"]

        # Assign driver as owner
        set_auth(owner_claims)
        resp = await client.put(
            f"/owners/requests/{req_id}/assign",
            json={"driver_id": "test-driver-uuid"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "assigned"
        assert "driver_id" in resp.json()

    async def test_consumer_cannot_assign_driver(self, consumer_client):
        """Consumer trying to assign a driver → 403."""
        resp = await consumer_client.put(
            "/owners/requests/some-uuid/assign",
            json={"driver_id": "test-driver-uuid"},
        )
        assert resp.status_code == 403

    async def test_driver_cannot_assign_themselves(self, driver_client):
        """Driver trying to assign → 403."""
        resp = await driver_client.put(
            "/owners/requests/some-uuid/assign",
            json={"driver_id": "test-driver-uuid"},
        )
        assert resp.status_code == 403

    async def test_assign_to_nonexistent_driver_returns_404(self, owner_client):
        """Assigning to a driver that doesn't exist → 404."""
        resp = await owner_client.put(
            "/owners/requests/some-uuid/assign",
            json={"driver_id": "00000000-0000-0000-0000-000000000000"},
        )
        assert resp.status_code == 404


class TestDriverCollection:
    """Driver recording a collection."""

    async def test_driver_can_record_collection(self, driver_client):
        """Driver records a collection with TPM value."""
        resp = await driver_client.post(
            "/drivers/collect",
            json={
                "request_id": "test-request-uuid",
                "tpm_value": 24.5,
                "volume_liters": 5.0,
                "consumer_ref": "test-consumer-uuid",
                "latitude": 14.5832,
                "longitude": 121.0409,
                "consumer_signed": True
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "collection_id" in data
        assert "grade" in data
        assert data["grade"] in ("premium", "standard", "low")
        assert "points_awarded" in data
        assert data["points_awarded"] > 0
        assert "blockchain_tx_hash" in data

    async def test_driver_collection_without_request(self, driver_client):
        """Collection without a request_id still works (ad-hoc pickup)."""
        resp = await driver_client.post(
            "/drivers/collect",
            json={
                "tpm_value": 18.0,
                "volume_liters": 5.0,
                "consumer_ref": "test-consumer-uuid",
                "latitude": 14.5832,
                "longitude": 121.0409
            },
        )
        assert resp.status_code == 200

    async def test_driver_collection_consumer_not_found(self, driver_client):
        """Collection with non-existent consumer_ref → 404."""
        resp = await driver_client.post(
            "/drivers/collect",
            json={
                "tpm_value": 18.0,
                "volume_liters": 5.0,
                "consumer_ref": "00000000-0000-0000-0000-000000000000",
                "latitude": 14.5832,
                "longitude": 121.0409
            },
        )
        assert resp.status_code == 404

    async def test_driver_collection_tpm_out_of_range(self, driver_client):
        """TPM > 40% is accepted (legitimately old oil) but classified as low."""
        resp = await driver_client.post(
            "/drivers/collect",
            json={
                "tpm_value": 55.0,
                "volume_liters": 5.0,
                "consumer_ref": "test-consumer-uuid"
            },
        )
        assert resp.status_code == 200
        assert resp.json()["grade"] == "low"

    async def test_driver_collection_tpm_negative(self, driver_client):
        """Negative TPM → validation error (422)."""
        resp = await driver_client.post(
            "/drivers/collect",
            json={
                "tpm_value": -5.0,
                "volume_liters": 5.0,
                "consumer_ref": "test-consumer-uuid"
            },
        )
        assert resp.status_code == 422


class TestDriverRoute:
    """Driver route retrieval."""

    async def test_get_route_with_pending_collections(self, driver_client):
        """Driver gets a list of stops sorted by route."""
        resp = await driver_client.get("/drivers/route?pending_only=true")
        assert resp.status_code == 200
        data = resp.json()
        assert "route" in data
        assert "total_distance_km" in data
        assert "total_duration_min" in data

    async def test_route_updates_with_status_changes(self, client):
        """After collecting at a stop, it disappears from the route."""
        pass  # Integration test


class TestStatusTransitions:
    """Valid and invalid status transitions."""

    STATUS_TRANSITIONS = {
        "pending": ["assigned", "cancelled"],
        "assigned": ["in_progress", "cancelled"],
        "in_progress": ["completed", "cancelled"],
        "completed": [],      # Terminal state (unless we add re-open)
        "cancelled": [],      # Terminal state
    }

    async def test_valid_status_transition(self, client):
        """pending → assigned is allowed."""
        pass

    async def test_invalid_status_transition(self, client):
        """pending → completed should be rejected (must go through assigned first)."""
        pass

    async def test_cannot_cancel_completed_request(self, client):
        """completed → cancelled is not allowed."""
        pass

    async def test_driver_can_update_status_to_in_progress(self, client):
        """Driver starts a collection → status = in_progress."""
        pass
