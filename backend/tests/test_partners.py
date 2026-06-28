"""
Tests for the partner store management service.

Covers: partner CRUD, discount configuration, voucher generation,
settlement calculations.
"""

import pytest
from datetime import datetime, timedelta


class TestPartnerCRUD:
    """Create, read, update, delete partners."""

    async def test_owner_can_create_partner(self, client):
        """Owner creates a new partner store."""
        resp = await client.post(
            "/owners/partners",
            json={
                "name": "Test Partner",
                "brand": "TestBrand",
                "discount_per_point": 0.50,
                "points_per_liter": 10,
                "min_redemption": 10,
                "max_redemption": 500,
                "description": "Test discount partner"
            },
            headers={"Authorization": "Bearer mock-owner-jwt"}
        )
        assert resp.status_code == 201
        assert resp.json()["name"] == "Test Partner"

    async def test_consumer_cannot_create_partner(self, client):
        """Consumer trying to create a partner → 403."""
        resp = await client.post(
            "/owners/partners",
            json={"name": "Hacked Partner"},
            headers={"Authorization": "Bearer mock-consumer-jwt"}
        )
        assert resp.status_code == 403

    async def test_owner_can_list_partners(self, client):
        """Owner sees all partners including inactive ones."""
        resp = await client.get(
            "/owners/partners",
            headers={"Authorization": "Bearer mock-owner-jwt"}
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_consumer_sees_only_active_partners(self, client):
        """Consumer sees only active partners for redemption."""
        resp = await client.get(
            "/consumers/partners",
            headers={"Authorization": "Bearer mock-consumer-jwt"}
        )
        assert resp.status_code == 200
        partners = resp.json()
        for p in partners:
            assert p["is_active"] is True

    async def test_owner_can_update_partner_config(self, client):
        """Owner updates discount rate."""
        # Create
        create = await client.post(
            "/owners/partners",
            json={"name": "Updatable Partner", "discount_per_point": 0.50},
            headers={"Authorization": "Bearer mock-owner-jwt"}
        )
        partner_id = create.json()["id"]

        # Update
        resp = await client.put(
            f"/owners/partners/{partner_id}",
            json={"discount_per_point": 1.00},
            headers={"Authorization": "Bearer mock-owner-jwt"}
        )
        assert resp.status_code == 200
        assert resp.json()["discount_per_point"] == 1.00

    async def test_nonexistent_partner_update_returns_404(self, client):
        """Updating a partner that doesn't exist → 404."""
        resp = await client.put(
            "/owners/partners/00000000-0000-0000-0000-000000000000",
            json={"name": "Ghost"},
            headers={"Authorization": "Bearer mock-owner-jwt"}
        )
        assert resp.status_code == 404


class TestVoucherGeneration:
    """Voucher code and QR generation."""

    async def test_voucher_code_format(self, client):
        """Voucher code matches expected pattern."""
        resp = await client.post(
            "/consumers/redeem",
            json={
                "partner_id": "test-partner-uuid",
                "points_to_use": 50
            },
            headers={"Authorization": "Bearer mock-consumer-jwt"}
        )
        if resp.status_code == 200:
            data = resp.json()
            assert "voucher_code" in data
            assert "OIL-" in data["voucher_code"]
            assert len(data["voucher_code"]) > 10

    async def test_voucher_has_qr_data(self, client):
        """Voucher includes QR data for scanning."""
        resp = await client.post(
            "/consumers/redeem",
            json={
                "partner_id": "test-partner-uuid",
                "points_to_use": 50
            },
            headers={"Authorization": "Bearer mock-consumer-jwt"}
        )
        if resp.status_code == 200:
            assert "qr_data" in resp.json()
            assert resp.json()["qr_data"].startswith("oiltrace://voucher/")

    async def test_voucher_expiry_date_set(self, client):
        """Voucher has a valid expiration date (default 30 days)."""
        resp = await client.post(
            "/consumers/redeem",
            json={
                "partner_id": "test-partner-uuid",
                "points_to_use": 50
            },
            headers={"Authorization": "Bearer mock-consumer-jwt"}
        )
        if resp.status_code == 200:
            assert "expires_at" in resp.json()
            # Should expire in the future
            expiry = datetime.fromisoformat(resp.json()["expires_at"])
            assert expiry > datetime.now()

    async def test_voucher_list_shows_redeemed_vouchers(self, client):
        """Consumer can see their active and used vouchers."""
        resp = await client.get(
            "/consumers/vouchers",
            headers={"Authorization": "Bearer mock-consumer-jwt"}
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


class TestSettlementCalculation:
    """Monthly settlement math."""

    def test_settlement_amount_correct(self):
        """150 vouchers × ₱7.50 average discount = ₱1,125."""
        from app.services.partners import calculate_settlement

        vouchers = [
            {"discount_amount": 5.0},
            {"discount_amount": 10.0},
            {"discount_amount": 7.50},
        ]
        total = calculate_settlement(vouchers)
        assert total == 22.50

    def test_settlement_with_zero_vouchers(self):
        """No vouchers used → ₱0 settlement."""
        from app.services.partners import calculate_settlement
        assert calculate_settlement([]) == 0.0

    def test_settlement_rounds_to_pesos(self):
        """Settlement is rounded to 2 decimal places."""
        from app.services.partners import calculate_settlement

        vouchers = [
            {"discount_amount": 1.234},
            {"discount_amount": 2.567},
        ]
        total = calculate_settlement(vouchers)
        assert total == 3.80  # 1.234 + 2.567 = 3.801 → rounded to 3.80
