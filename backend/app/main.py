from fastapi import FastAPI
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.routes.collections import router as collections_router
from app.routes.auth import router as auth_router

# ── Rate Limiting ────────────────────────────────────────────────────────────

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],
    enabled=True,
)

# ── FastAPI App ──────────────────────────────────────────────────────────────

app = FastAPI(title="OilTrace API", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Routers ──────────────────────────────────────────────────────────────────

app.include_router(collections_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1/auth")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
