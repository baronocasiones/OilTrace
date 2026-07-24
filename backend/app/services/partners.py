from typing import List, Optional
import uuid
from sqlalchemy.orm import Session
from app.models import Partner, Voucher

def calculate_settlement(vouchers: list) -> float:
    """Calculate the total settlement amount from a list of vouchers.

    Vouchers can be dictionaries (from unit tests) or DB objects.
    Rounds the final total to 2 decimal places.
    """
    total = 0.0
    for v in vouchers:
        if isinstance(v, dict):
            total += v.get("discount_amount", 0.0)
        else:
            total += getattr(v, "discount_amount", 0.0)
    return round(total, 2)

async def get_partner(db: Session, partner_id: uuid.UUID) -> Optional[Partner]:
    """Retrieve a single partner record by its UUID."""
    return db.query(Partner).filter(Partner.id == partner_id).first()

async def create_partner(
    db: Session,
    name: str,
    brand: Optional[str] = None,
    logo_url: Optional[str] = None,
    description: Optional[str] = None,
    discount_per_point: float = 0.50,
    points_per_liter: int = 10,
    min_redemption: int = 10,
    max_redemption: Optional[int] = None,
    settlement_terms: str = "Monthly, net 15"
) -> Partner:
    """Create and return a new Partner record in the database."""
    partner = Partner(
        name=name,
        brand=brand,
        logo_url=logo_url,
        description=description,
        discount_per_point=discount_per_point,
        points_per_liter=points_per_liter,
        min_redemption=min_redemption,
        max_redemption=max_redemption,
        settlement_terms=settlement_terms
    )
    db.add(partner)
    db.commit()
    db.refresh(partner)
    return partner

async def update_partner(
    db: Session,
    partner: Partner,
    updates: dict
) -> Partner:
    """Update and return an existing Partner record."""
    for field, value in updates.items():
        setattr(partner, field, value)
    db.commit()
    db.refresh(partner)
    return partner

async def list_partners(db: Session, active_only: bool = False) -> List[Partner]:
    """List partners, optionally filtering for active partners only."""
    query = db.query(Partner)
    if active_only:
        query = query.filter(Partner.is_active == True)
    return query.all()

async def list_vouchers(db: Session, consumer_id: uuid.UUID) -> List[Voucher]:
    """List vouchers for a given consumer ID."""
    return db.query(Voucher).filter(Voucher.consumer_id == consumer_id).all()
