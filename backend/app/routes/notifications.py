"""
Push notification device token management endpoints.

Consumers and drivers register their Expo push tokens here so the
backend can send them notifications about assignments, completions, etc.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import Claims, get_current_user
from app.models import PushDevice

router = APIRouter(tags=["notifications"])


# ── Request / Response Schemas ──────────────────────────────────────


class RegisterDeviceRequest(BaseModel):
    platform: str = Field(..., pattern=r"^(ios|android)$")
    push_token: str = Field(..., min_length=1)


class UnregisterDeviceRequest(BaseModel):
    push_token: str = Field(..., min_length=1)


class RegisterDeviceResponse(BaseModel):
    status: str
    token_id: str


class UnregisterDeviceResponse(BaseModel):
    status: str


# ── Endpoints ───────────────────────────────────────────────────────


@router.post(
    "/notifications/register",
    response_model=RegisterDeviceResponse,
    status_code=status.HTTP_200_OK,
)
async def register_device(
    body: RegisterDeviceRequest,
    db: Session = Depends(get_db),
    current_user: Claims = Depends(get_current_user),
):
    """Register or update a device push token for the authenticated user.

    If the same ``push_token`` already exists, it will be re-activated
    and the platform updated (upsert behavior). Returns the token record ID.
    """
    profile_id = uuid.UUID(current_user["sub"])

    existing = (
        db.query(PushDevice)
        .filter(PushDevice.push_token == body.push_token)
        .first()
    )

    if existing:
        existing.profile_id = profile_id
        existing.platform = body.platform
        existing.is_active = True
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        token_id = str(existing.id)
    else:
        device = PushDevice(
            profile_id=profile_id,
            platform=body.platform,
            push_token=body.push_token,
            is_active=True,
        )
        db.add(device)
        db.commit()
        db.refresh(device)
        token_id = str(device.id)

    return RegisterDeviceResponse(status="registered", token_id=token_id)


@router.put(
    "/notifications/unregister",
    response_model=UnregisterDeviceResponse,
    status_code=status.HTTP_200_OK,
)
async def unregister_device(
    body: UnregisterDeviceRequest,
    db: Session = Depends(get_db),
    current_user: Claims = Depends(get_current_user),
):
    """Deactivate a device push token (logout).

    Sets ``is_active = False`` so the token is no longer used for delivery.
    Only deactivates tokens owned by the authenticated user.
    """
    profile_id = uuid.UUID(current_user["sub"])
    device = (
        db.query(PushDevice)
        .filter(
            PushDevice.push_token == body.push_token,
            PushDevice.profile_id == profile_id,
        )
        .first()
    )

    if device:
        device.is_active = False
        device.updated_at = datetime.now(timezone.utc)
        db.commit()

    return UnregisterDeviceResponse(status="unregistered")
