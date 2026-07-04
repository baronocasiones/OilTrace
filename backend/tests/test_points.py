"""
Tests for the points ledger and voucher system.

Covers: earn calculation, redemption deduction, insufficient balance,
running balance integrity.
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock


class TestPointsCalculation:
    """Pure math tests — no DB needed."""

    def test_basic_earn_calculation(self):
        """5L × 10 pts/L = 50 points."""
        from app.services.points import calculate_earned_points
        points = calculate_earned_points(volume_liters=5.0, points_per_liter=10)
        assert points == 50

    def test_partial_liter_rounding(self):
        """2.5L × 10 pts/L = 25 points (supports fractional liters)."""
        from app.services.points import calculate_earned_points
        points = calculate_earned_points(volume_liters=2.5, points_per_liter=10)
        assert points == 25

    def test_custom_points_per_liter(self):
        """Partner config can override the default rate."""
        from app.services.points import calculate_earned_points
        points = calculate_earned_points(volume_liters=5.0, points_per_liter=8)
        assert points == 40

    def test_zero_volume_earns_zero(self):
        """0L collected → 0 points."""
        from app.services.points import calculate_earned_points
        points = calculate_earned_points(volume_liters=0.0, points_per_liter=10)
        assert points == 0

    def test_large_volume(self):
        """100L × 10 pts/L = 1000 points (no overflow)."""
        from app.services.points import calculate_earned_points
        points = calculate_earned_points(volume_liters=100.0, points_per_liter=10)
        assert points == 1000


class TestPointsRedemption:
    """Tests for the redemption business logic."""

    def test_redemption_deducts_correctly(self):
        """Redeem 50 points from balance of 100 → remaining 50."""
        from app.services.points import redeem_points
        new_balance, voucher = redeem_points(
            consumer_id="test-id",
            partner_id="partner-id",
            points_to_use=50,
            current_balance=100
        )
        assert new_balance == 50
        assert voucher.discount_amount == 25.0  # at ₱0.50/pt

    def test_insufficient_balance_raises_error(self):
        """Redeem 100 points when balance is 50 → rejected."""
        from app.services.points import redeem_points, InsufficientPointsError
        with pytest.raises(InsufficientPointsError):
            redeem_points(
                consumer_id="test-id",
                partner_id="partner-id",
                points_to_use=100,
                current_balance=50
            )

    def test_redeem_zero_points_rejected(self):
        """Redeeming 0 points should be rejected."""
        from app.services.points import redeem_points
        with pytest.raises(ValueError, match="points to use must be positive"):
            redeem_points(
                consumer_id="test-id",
                partner_id="partner-id",
                points_to_use=0,
                current_balance=50
            )

    def test_redeem_negative_points_rejected(self):
        """Negative redemption should be rejected."""
        from app.services.points import redeem_points
        with pytest.raises(ValueError):
            redeem_points(
                consumer_id="test-id",
                partner_id="partner-id",
                points_to_use=-10,
                current_balance=50
            )

    def test_minimum_redemption_enforced(self):
        """Partner's min_redemption = 10, so 5 pts fails."""
        from app.services.points import redeem_points
        with pytest.raises(ValueError, match="minimum redemption is 10"):
            redeem_points(
                consumer_id="test-id",
                partner_id="partner-id",
                points_to_use=5,
                current_balance=50,
                min_redemption=10
            )

    def test_maximum_redemption_enforced(self):
        """Partner's max_redemption = 100, so 150 pts fails."""
        from app.services.points import redeem_points
        with pytest.raises(ValueError, match="maximum redemption is 100"):
            redeem_points(
                consumer_id="test-id",
                partner_id="partner-id",
                points_to_use=150,
                current_balance=200,
                max_redemption=100
            )

    def test_voucher_code_format(self):
        """Voucher code follows pattern OIL-BRAND-XXXXX."""
        from app.services.points import redeem_points
        _, voucher = redeem_points(
            consumer_id="test-id",
            partner_id="partner-id",
            points_to_use=50,
            current_balance=100,
            partner_name="MINOLA"
        )
        assert voucher.voucher_code.startswith("OIL-MINOLA-")
        assert len(voucher.voucher_code) > len("OIL-MINOLA-")


class TestPointsLedger:
    """Running balance integrity."""

    def test_balance_after_multiple_transactions(self):
        """Deposit 100, redeem 30, deposit 50 → balance = 120."""
        from app.services.points import PointsLedger
        ledger = PointsLedger()

        ledger.deposit(100)
        assert ledger.balance == 100

        ledger.withdraw(30)
        assert ledger.balance == 70

        ledger.deposit(50)
        assert ledger.balance == 120

    def test_transaction_history_length(self):
        """Each operation creates a ledger entry."""
        from app.services.points import PointsLedger
        ledger = PointsLedger()

        ledger.deposit(100)
        ledger.withdraw(30)
        ledger.deposit(50)

        assert len(ledger.transactions) == 3

    def test_balance_never_negative(self):
        """Withdrawing more than balance is prevented."""
        from app.services.points import PointsLedger, InsufficientPointsError
        ledger = PointsLedger()
        ledger.deposit(50)

        with pytest.raises(InsufficientPointsError):
            ledger.withdraw(100)

