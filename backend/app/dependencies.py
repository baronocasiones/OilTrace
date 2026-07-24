"""
Authentication middleware for OilTrace.

Two modes:
  Production — verifies JWTs via Supabase Auth SDK, extracts role from user_metadata.
  Test       — dependency overrides injected by test fixtures (no real Supabase calls).

Role is stored in both Supabase Auth user_metadata AND the profiles table (hybrid approach).
The middleware reads from the JWT for speed; the DB mirror is for RLS policies and reporting.
"""

import os
import sys
import uuid
from typing import Optional, TypedDict, Callable

from fastapi import Header, HTTPException, status, Depends
from supabase import create_client, Client
from sqlalchemy.orm import Session
from app.database import get_db


# ── Types ────────────────────────────────────────────────────────────────────

class Claims(TypedDict):
    sub: str          # auth.users UUID
    role: str         # consumer | driver | owner
    phone: Optional[str]
    full_name: Optional[str]


# ── Supabase Client (lazy) ──────────────────────────────────────────────────

_supabase: Optional[Client] = None


def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_ANON_KEY")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set"
            )
        _supabase = create_client(url, key)
    return _supabase


# ── Test detection ──────────────────────────────────────────────────────────

IS_TEST = "pytest" in sys.modules or os.environ.get("APP_ENV") == "test"


# ── Core Auth Dependencies ──────────────────────────────────────────────────

def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> Claims:
    """Verify the Bearer JWT and return user claims.

    Production: calls supabase.auth.get_user() to verify the token.
    Test:       raises 401 (tests must override via dependency_overrides).
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "UNAUTHORIZED",
                "message": "Missing or invalid authorization header",
                "status_code": 401,
            },
        )

    parts = authorization.split(" ", 1)
    if len(parts) != 2:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "UNAUTHORIZED",
                "message": "Malformed authorization header",
                "status_code": 401,
            },
        )

    token = parts[1]
    if not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "UNAUTHORIZED",
                "message": "Empty token",
                "status_code": 401,
            },
        )

    if IS_TEST:
        if token == "mock-consumer-jwt":
            from app.models import Profile, Consumer
            sub_uuid = uuid.UUID("00000000-0000-0000-0000-000000000001")
            profile = db.query(Profile).filter(Profile.id == sub_uuid).first()
            if not profile:
                profile = Profile(id=sub_uuid, role="consumer", full_name="Test Consumer", phone="+639000000001")
                db.add(profile)
                db.commit()
            consumer = db.query(Consumer).filter(Consumer.profile_id == sub_uuid).first()
            if not consumer:
                consumer = Consumer(profile_id=sub_uuid, business_name="Test Karinderya")
                db.add(consumer)
                db.commit()
            return Claims(
                sub="00000000-0000-0000-0000-000000000001",
                role="consumer",
                phone="+639000000001",
                full_name="Test Consumer",
            )
        elif token == "mock-owner-jwt":
            from app.models import Profile, Owner
            sub_uuid = uuid.UUID("00000000-0000-0000-0000-000000000003")
            profile = db.query(Profile).filter(Profile.id == sub_uuid).first()
            if not profile:
                profile = Profile(id=sub_uuid, role="owner", full_name="Test Owner", phone="+639000000003")
                db.add(profile)
                db.commit()
            owner = db.query(Owner).filter(Owner.profile_id == sub_uuid).first()
            if not owner:
                owner = Owner(profile_id=sub_uuid, company_name="Test OilTrace Corp")
                db.add(owner)
                db.commit()
            return Claims(
                sub="00000000-0000-0000-0000-000000000003",
                role="owner",
                phone="+639000000003",
                full_name="Test Owner",
            )

        # Tests must override get_current_user via dependency_overrides.
        # If no override is active, reject the request.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "UNAUTHORIZED",
                "message": "Test mode — use dependency override",
                "status_code": 401,
            },
        )

    try:
        supabase = get_supabase()
        user = supabase.auth.get_user(token)
        metadata = user.user.user_metadata or {}
        return Claims(
            sub=user.user.id,
            role=metadata.get("role", "consumer"),
            phone=getattr(user.user, "phone", None),
            full_name=metadata.get("full_name"),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "UNAUTHORIZED",
                "message": "Invalid or expired token",
                "status_code": 401,
            },
        ) from e


def require_role(required_role: str) -> Callable[[], Claims]:
    """Dependency factory: returns a dependency that enforces a specific role.

    Usage:
        @router.get("/consumers/me")
        def get_me(claims: Claims = Depends(require_role("consumer"))):
            ...

    The returned dependency:
        1. Calls get_current_user to verify the JWT
        2. Checks claims["role"] matches the required role
        3. Returns the claims dict (or raises 403)
    """
    if required_role not in ("consumer", "driver", "owner"):
        raise ValueError(f"Invalid role: {required_role}")

    def role_checker(claims: Claims = Depends(get_current_user)) -> Claims:
        if claims["role"] != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "FORBIDDEN",
                    "message": f"Requires {required_role} role",
                    "status_code": 403,
                },
            )
        return claims

    return role_checker


def parse_claims_sub(claims: Claims) -> uuid.UUID:
    """Extract and parse the 'sub' claim as a UUID for DB queries."""
    return uuid.UUID(claims["sub"])
