"""
Authentication routes for OilTrace.

Handles user registration, login, and profile retrieval.
Uses Supabase Auth as the identity provider with phone OTP as the primary method.

Endpoints:
  POST /auth/register  — Create a new user (phone OTP or email+password)
  POST /auth/login     — Authenticate and return JWT token
  GET  /auth/profile   — Get current user's claims from JWT
"""

import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.dependencies import get_current_user, require_role, Claims

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code, e.g., +639123456789")
    password: str = Field(..., min_length=6, description="Temporary password")
    role: str = Field(default="consumer", pattern=r"^(consumer|driver|owner)$")
    full_name: Optional[str] = None


class LoginRequest(BaseModel):
    phone: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    user: dict


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest):
    """Register a new user via Supabase Auth.

    Creates the user with role embedded in user_metadata.
    The Supabase trigger (handle_new_user) auto-creates the profiles row.
    Uses the service role key for admin-level user creation.
    """
    service_key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not service_key:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail={
                "code": "NOT_IMPLEMENTED",
                "message": "SUPABASE_SERVICE_KEY not configured. Registration requires admin access.",
                "status_code": 501,
            },
        )

    from supabase import create_client

    supabase_url = os.environ.get("SUPABASE_URL", "")
    admin_client = create_client(supabase_url, service_key)

    try:
        response = admin_client.auth.admin.create_user({
            "phone": payload.phone,
            "password": payload.password,
            "user_metadata": {
                "role": payload.role,
                "full_name": payload.full_name or "",
            },
            "email_confirm": True,
            "phone_confirm": True,
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "REGISTRATION_FAILED",
                "message": str(e),
                "status_code": 400,
            },
        ) from e

    user_data = response.user.model_dump() if hasattr(response.user, "model_dump") else {}
    return AuthResponse(
        access_token="",  # User should login to get a token
        refresh_token="",
        user={
            "id": user_data.get("id", ""),
            "phone": payload.phone,
            "role": payload.role,
        },
    )


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    """Authenticate with phone + password via Supabase Auth.

    Returns JWT access_token and refresh_token.
    For phone OTP flows, the OTP request is initiated client-side
    (mobile app → Supabase directly); this endpoint handles password auth.
    """
    from supabase import create_client

    supabase_url = os.environ.get("SUPABASE_URL", "")
    anon_key = os.environ.get("SUPABASE_ANON_KEY", "")
    if not supabase_url or not anon_key:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail={
                "code": "NOT_IMPLEMENTED",
                "message": "Supabase not configured",
                "status_code": 501,
            },
        )

    client = create_client(supabase_url, anon_key)

    try:
        response = client.auth.sign_in_with_password({
            "phone": payload.phone,
            "password": payload.password,
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "LOGIN_FAILED",
                "message": "Invalid credentials",
                "status_code": 401,
            },
        ) from e

    metadata = response.user.user_metadata or {}
    return AuthResponse(
        access_token=response.session.access_token if response.session else "",
        refresh_token=response.session.refresh_token if response.session else "",
        user={
            "id": response.user.id,
            "phone": response.user.phone,
            "role": metadata.get("role", "consumer"),
        },
    )


@router.get("/profile")
def get_profile(claims: Claims = Depends(get_current_user)):
    """Return the current user's claims from the JWT."""
    return {
        "sub": claims["sub"],
        "role": claims["role"],
        "phone": claims.get("phone"),
        "full_name": claims.get("full_name"),
    }
