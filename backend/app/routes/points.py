import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.dependencies import require_role, parse_claims_sub, Claims
from app.models import Partner, Voucher, PointsLedger, Consumer
from app.services.points import redeem_points, InsufficientPointsError
from app.services.partners import (
    get_partner,
    create_partner as create_partner_srv,
    update_partner as update_partner_srv,
    list_partners,
    list_vouchers as list_vouchers_srv
)

router = APIRouter()

# --- Pydantic Schemas ---

class PartnerCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    discount_per_point: float = Field(0.50, ge=0.0)
    points_per_liter: int = Field(10, ge=0)
    min_redemption: int = Field(10, ge=0)
    max_redemption: Optional[int] = Field(None, ge=0)
    settlement_terms: Optional[str] = "Monthly, net 15"


class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    discount_per_point: Optional[float] = Field(None, ge=0.0)
    points_per_liter: Optional[int] = Field(None, ge=0)
    min_redemption: Optional[int] = Field(None, ge=0)
    max_redemption: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None
    settlement_terms: Optional[str] = None


class PartnerResponse(BaseModel):
    id: uuid.UUID
    name: str
    brand: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    discount_per_point: float
    points_per_liter: int
    min_redemption: int
    max_redemption: Optional[int] = None
    is_active: bool
    settlement_terms: str
    created_at: datetime

    class Config:
        from_attributes = True


class RedeemRequest(BaseModel):
    partner_id: str
    points_to_use: int


class RedeemResponse(BaseModel):
    voucher_code: str
    discount_amount: float
    partner_name: str
    partner_logo: Optional[str] = None
    expires_at: datetime
    qr_data: str


class VoucherResponse(BaseModel):
    id: uuid.UUID
    consumer_id: uuid.UUID
    partner_id: uuid.UUID
    points_used: int
    discount_amount: float
    voucher_code: str
    qr_data: Optional[str] = None
    status: str
    expires_at: Optional[datetime] = None
    used_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LedgerEntryResponse(BaseModel):
    id: uuid.UUID
    consumer_id: uuid.UUID
    collection_id: Optional[uuid.UUID] = None
    points: int
    transaction_type: str
    reference: Optional[str] = None
    balance_after: int
    created_at: datetime

    class Config:
        from_attributes = True


class PointsBalanceResponse(BaseModel):
    balance: int
    history: List[LedgerEntryResponse]


# --- Utility Functions ---

def parse_uuid(val: str) -> uuid.UUID:
    try:
        return uuid.UUID(val)
    except ValueError:
        return uuid.uuid5(uuid.NAMESPACE_DNS, val)


# --- API Routes ---

# 1. Partner Management (Owner)

@router.post("/owners/partners", response_model=PartnerResponse, status_code=status.HTTP_201_CREATED)
async def create_partner(
    payload: PartnerCreate,
    claims: Claims = Depends(require_role("owner")),
    db: Session = Depends(get_db)
):
    return await create_partner_srv(
        db=db,
        name=payload.name,
        brand=payload.brand,
        logo_url=payload.logo_url,
        description=payload.description,
        discount_per_point=payload.discount_per_point,
        points_per_liter=payload.points_per_liter,
        min_redemption=payload.min_redemption,
        max_redemption=payload.max_redemption,
        settlement_terms=payload.settlement_terms or "Monthly, net 15"
    )


@router.get("/owners/partners", response_model=List[PartnerResponse])
async def list_partners_owner(
    claims: Claims = Depends(require_role("owner")),
    db: Session = Depends(get_db)
):
    return await list_partners(db, active_only=False)


@router.put("/owners/partners/{partner_id}", response_model=PartnerResponse)
async def update_partner(
    partner_id: str,
    payload: PartnerUpdate,
    claims: Claims = Depends(require_role("owner")),
    db: Session = Depends(get_db)
):
    partner_uuid = parse_uuid(partner_id)
    partner = await get_partner(db, partner_uuid)
    if not partner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partner not found")

    return await update_partner_srv(db, partner, payload.model_dump(exclude_unset=True))


# 2. Partner Listing (Consumer)

@router.get("/consumers/partners", response_model=List[PartnerResponse])
async def list_partners_consumer(
    claims: Claims = Depends(require_role("consumer")),
    db: Session = Depends(get_db)
):
    return await list_partners(db, active_only=True)


# 3. Voucher Redemption & Listings (Consumer)

@router.post("/consumers/redeem", response_model=RedeemResponse)
async def redeem_points_route(
    payload: RedeemRequest,
    claims: Claims = Depends(require_role("consumer")),
    db: Session = Depends(get_db)
):
    profile_uuid = parse_uuid(claims["sub"])
    consumer = db.query(Consumer).filter(Consumer.profile_id == profile_uuid).first()
    if not consumer:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Consumer profile not found")

    partner_uuid = parse_uuid(payload.partner_id)
    partner = await get_partner(db, partner_uuid)
    if not partner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partner not found")

    # Get consumer's current balance
    current_balance = db.query(func.sum(PointsLedger.points)).filter(PointsLedger.consumer_id == consumer.id).scalar() or 0

    # Validate redemption constraints
    try:
        redeem_points(
            consumer_id=str(consumer.id),
            partner_id=str(partner.id),
            points_to_use=payload.points_to_use,
            current_balance=current_balance,
            min_redemption=partner.min_redemption,
            max_redemption=partner.max_redemption,
            partner_name=partner.name
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except InsufficientPointsError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Apply database modification
    discount_amount = payload.points_to_use * partner.discount_per_point
    clean_name = "".join(c for c in partner.name if c.isalnum()).upper() if partner.name else "PARTNER"
    voucher_code = f"OIL-{clean_name}-{secrets.token_hex(3).upper()}"

    # Ensure uniqueness
    while db.query(Voucher).filter(Voucher.voucher_code == voucher_code).first() is not None:
        voucher_code = f"OIL-{clean_name}-{secrets.token_hex(3).upper()}"

    expires_at = datetime.now(timezone.utc) + timedelta(days=30)

    voucher = Voucher(
        consumer_id=consumer.id,
        partner_id=partner.id,
        points_used=payload.points_to_use,
        discount_amount=discount_amount,
        voucher_code=voucher_code,
        qr_data=f"oiltrace://voucher/{voucher_code}",
        status="active",
        expires_at=expires_at,
        created_at=datetime.now(timezone.utc)
    )
    db.add(voucher)

    # Insert immutable points_ledger record
    ledger_entry = PointsLedger(
        consumer_id=consumer.id,
        points=-payload.points_to_use,
        transaction_type="redeemed",
        reference=f"Redeemed voucher {voucher_code}",
        balance_after=current_balance - payload.points_to_use,
        created_at=datetime.now(timezone.utc)
    )
    db.add(ledger_entry)

    db.commit()
    db.refresh(voucher)

    return RedeemResponse(
        voucher_code=voucher.voucher_code,
        discount_amount=voucher.discount_amount,
        partner_name=partner.name,
        partner_logo=partner.logo_url,
        expires_at=voucher.expires_at,
        qr_data=voucher.qr_data
    )


@router.get("/consumers/vouchers", response_model=List[VoucherResponse])
async def list_vouchers(
    claims: Claims = Depends(require_role("consumer")),
    db: Session = Depends(get_db)
):
    profile_uuid = parse_uuid(claims["sub"])
    consumer = db.query(Consumer).filter(Consumer.profile_id == profile_uuid).first()
    if not consumer:
        return []
    return await list_vouchers_srv(db, consumer.id)


# 4. Points Balance & Ledger History (Consumer)

@router.get("/consumers/points", response_model=PointsBalanceResponse)
async def get_points_balance(
    claims: Claims = Depends(require_role("consumer")),
    db: Session = Depends(get_db)
):
    profile_uuid = parse_uuid(claims["sub"])
    consumer = db.query(Consumer).filter(Consumer.profile_id == profile_uuid).first()
    if not consumer:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Consumer profile not found")

    balance = db.query(func.sum(PointsLedger.points)).filter(PointsLedger.consumer_id == consumer.id).scalar() or 0
    history = db.query(PointsLedger).filter(PointsLedger.consumer_id == consumer.id).order_by(PointsLedger.created_at.desc()).all()

    return PointsBalanceResponse(
        balance=balance,
        history=history
    )
