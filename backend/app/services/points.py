import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import PointsLedger as PointsLedgerModel


class InsufficientPointsError(Exception):
    """Raised when a consumer has insufficient points for a redemption."""
    pass


def calculate_earned_points(volume_liters: float, points_per_liter: int = 10) -> int:
    """Calculate points earned for a given volume of oil.

    5L x 10 pts/L = 50 points.
    Rounding: supports partial liters by converting product to integer.
    """
    if volume_liters < 0:
        return 0
    return int(volume_liters * points_per_liter)


def calculate_points_earned(volume_liters: float) -> int:
    """Baseline points earned calculation wrapper (defaults to 10 points per liter)."""
    return calculate_earned_points(volume_liters, 10)


def is_expired(earned_date: datetime) -> bool:
    """Points expire after 90 days.

    Points earned exactly 90 days ago are still valid.
    Points earned 91 days ago (or more) are expired.
    """
    if earned_date.tzinfo is None:
        earned_date = earned_date.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    return (now - earned_date) > timedelta(days=90, seconds=2)


class MockVoucher:
    """Mock voucher class used in pure-logic (DB-less) unit tests."""
    def __init__(self, voucher_code: str, discount_amount: float):
        self.voucher_code = voucher_code
        self.discount_amount = discount_amount


class PointsLedger:
    """In-memory points ledger used for unit testing.

    Manages balances, transaction history, and FIFO expiry tracking.
    """
    def __init__(self):
        self.balance = 0
        self.transactions = []
        self.deposits = []

    def deposit(self, amount: int, earned_at: Optional[datetime] = None):
        if amount <= 0:
            return
        if earned_at is None:
            earned_at = datetime.now(timezone.utc)
        elif earned_at.tzinfo is None:
            earned_at = earned_at.replace(tzinfo=timezone.utc)

        self.balance += amount
        self.transactions.append({
            "points": amount,
            "created_at": earned_at
        })
        self.deposits.append({
            "amount": amount,
            "earned_at": earned_at,
            "remaining": amount
        })

    def withdraw(self, amount: int):
        if amount <= 0:
            raise ValueError("points to use must be positive")
        if self.balance < amount:
            raise InsufficientPointsError("Insufficient points")

        self.balance -= amount
        self.transactions.append({
            "points": -amount,
            "created_at": datetime.now(timezone.utc)
        })

        # FIFO consumption
        to_consume = amount
        for dep in self.deposits:
            if to_consume <= 0:
                break
            if is_expired(dep["earned_at"]) or dep["remaining"] <= 0:
                continue

            consume_amt = min(dep["remaining"], to_consume)
            dep["remaining"] -= consume_amt
            to_consume -= consume_amt

    def apply_expiry(self) -> int:
        expired_total = 0
        for dep in self.deposits:
            if dep["remaining"] > 0 and is_expired(dep["earned_at"]):
                expired_total += dep["remaining"]
                dep["remaining"] = 0

        if expired_total > 0:
            self.balance -= expired_total
            self.transactions.append({
                "points": -expired_total,
                "created_at": datetime.now(timezone.utc)
            })
        return expired_total


def redeem_points(
    consumer_id: str,
    partner_id: str,
    points_to_use: int,
    current_balance: int,
    min_redemption: int = 10,
    max_redemption: Optional[int] = None,
    partner_name: Optional[str] = None,
) -> Tuple[int, MockVoucher]:
    """Pure business logic (DB-less) validation and calculation helper for redemptions.

    Throws ValueError or InsufficientPointsError if constraints are violated.
    Returns: (new_balance, mock_voucher)
    """
    if points_to_use <= 0:
        raise ValueError("points to use must be positive")
    if min_redemption is not None and points_to_use < min_redemption:
        raise ValueError(f"minimum redemption is {min_redemption}")
    if max_redemption is not None and points_to_use > max_redemption:
        raise ValueError(f"maximum redemption is {max_redemption}")
    if current_balance < points_to_use:
        raise InsufficientPointsError("Insufficient points")

    new_balance = current_balance - points_to_use
    discount_amount = float(points_to_use * 0.50)  # Standard: ₱0.50/pt
    
    clean_name = "".join(c for c in partner_name if c.isalnum()).upper() if partner_name else "PARTNER"
    voucher_code = f"OIL-{clean_name}-{secrets.token_hex(3).upper()}"
    
    voucher = MockVoucher(voucher_code=voucher_code, discount_amount=discount_amount)
    return new_balance, voucher


async def award_points(db: Session, consumer_id: uuid.UUID, collection_id: uuid.UUID, volume_liters: float) -> PointsLedgerModel:
    """Database-bound async service operation to award points to a consumer for a collection."""
    points_earned = calculate_points_earned(volume_liters)
    
    # Calculate current balance from ledger
    current_balance = db.query(func.sum(PointsLedgerModel.points)).filter(PointsLedgerModel.consumer_id == consumer_id).scalar() or 0
    balance_after = current_balance + points_earned
    
    ledger_entry = PointsLedgerModel(
        consumer_id=consumer_id,
        collection_id=collection_id,
        points=points_earned,
        transaction_type="earned",
        reference=f"Earned from collection {collection_id}",
        balance_after=balance_after,
        created_at=datetime.now(timezone.utc)
    )
    db.add(ledger_entry)
    db.commit()
    db.refresh(ledger_entry)
    return ledger_entry
