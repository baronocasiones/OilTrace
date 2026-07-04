# OilTrace — Agent Guide

Used cooking oil collection for Philippine karinderyas. IoT sensor grades oil for SAF/biofuel, records on Ethereum Sepolia, rewards consumers with points at partner stores.

## Repo at a glance

```
backend/    # FastAPI + pytest (114 pass + 87 skipped SQLite; 98 pass + 2 xfailed PG)
contract/   # Solidity 0.8.20 + Hardhat (~20 tests)
mobile/     # React Native + Expo (EMPTY — not started)
hardware/   # ESP32 PlatformIO (EMPTY — not started)
docs/       # 14 system design docs + test reference
```

`mobile/` and `hardware/` are placeholders — no code lives there yet.

## Commands

```bash
# Backend (from repo root or backend/)
cd backend && python -m pytest tests/ -v          # fast (SQLite)
OILTRACE_TEST_DB=postgres python -m pytest tests/ -v  # all tests incl RLS

# Contract
cd contract && npx hardhat test                   # all tests
npx hardhat compile                                # compile Solidity
npx hardhat run scripts/deploy.ts --network sepolia  # deploy
```

No `requirements.txt` exists — CI falls back to `pip install pytest pytest-asyncio httpx web3 supabase slowapi`. Install testcontainers for PG: `pip install testcontainers[postgresql] psycopg2-binary`.

## Test patterns

**Lazy imports required** — import app modules inside test functions, not at module level. `conftest.py` sets up the DB first, so module-level imports would hit an uninitialized DB.

Three test categories with different fixture needs:

| Category | Fixtures | Pattern |
|----------|----------|---------|
| Pure unit | none needed | Import service function directly, test business logic |
| Service | `monkeypatch` | Mock external calls (Web3, OSRM HTTP) |
| API | `client` | Full HTTP round-trip via `TestClient`, DB is real |

API tests that need authentication use the role-specific clients instead:

Key fixtures from `backend/tests/conftest.py`:
- `db_session` — fresh SQLite or PG per test (tables created, then dropped)
- `client` — `httpx.AsyncClient` with `ASGITransport`, base URL `http://test/api/v1`
- `consumer_claims` / `driver_claims` / `owner_claims` — `Claims` TypedDict with UUID, role, phone, full_name
- `consumer_client` / `driver_client` / `owner_client` — authenticated `AsyncClient` with auto-seeded DB records
- `mock_rls_session` — seeds 2 consumers + 1 driver + 1 owner for isolation tests; returns both Profile UUIDs (`*_id`) and record IDs (`*_record_id`) for correct FK references

Tests are `async def` — `asyncio_mode = "auto"` in `pyproject.toml` makes this work automatically.

## Test DB switching

`OILTRACE_TEST_DB` env var controls the database backend:

| Value | Backend | RLS tests |
|-------|---------|-----------|
| `""` (default) | SQLite | Skipped |
| `"postgres"` / `"pg"` | PostgreSQL via testcontainers | Runs |

`test_rls_boundaries.py` requires PostgreSQL (SQLite can't enforce RLS). CI skips it automatically.

## What's not configured

No ruff, no pre-commit, no formatter, no type checker, no editorconfig. No codegen or build steps needed for Python work. Route engine is in `app.services.route_engine` (RouteEngine class + nearest_neighbor fallback) and `app.routes.routes` (POST /routes/optimize endpoint with 30 req/min rate limit, returns `fallback_used` boolean). The `GET /drivers/route` endpoint was upgraded from a stub to real OSRM-powered logic in `app.routes.collections`.

## Rate limiter notes

Two separate `Limiter` instances exist — `app.state.limiter` (in `main.py`, `default_limits=["100/minute"]`, middleware-enforced) and `_limiter` (in `routes.py`, `@_limiter.limit("30/minute")` on the optimize route). The decorator wraps the endpoint with its own rate check *inside* the `async_wrapper`, not just through the middleware. Tests that disable rate limiting must toggle **both** limiters.

## Known test limitations

Two concurrent session tests (`test_two_drivers_collect_same_request_id`, `test_concurrent_collections_different_consumers`) are `xfail`'d — they use `asyncio.gather` with a shared `db_session`, which PostgreSQL's asyncpg rejects on concurrent `commit()` with `IllegalStateChangeError`. They pass with SQLite.

## Commit convention

Prefixes: `backend:`, `contract:`, `mobile:`, `iot:`, `docs:`. Branch from `main`, PR to `main`.

## CI quirks

Two separate workflows that trigger only on changes to their stack path:
- `backend.yml` — runs `pytest tests/ -v` ignoring `test_rls_boundaries.py`, 10 min timeout
- `contract.yml` — runs `npx hardhat test`, 5 min timeout

Changes to `docs/`, `mobile/`, `hardware/` do not trigger any CI.

## Operational notes

- `.env` files in `backend/` and `contract/` contain real-looking deployment secrets — the repo tracks them in git. Do NOT commit sensitive keys.
- Contract uses Sepolia testnet. Hardhat config reads `SEPOLIA_RPC_URL` and `PRIVATE_KEY` from env.
- Backend defaults to `sqlite:///./oiltrace.db` — a local file. `test.db` is a gitignored SQLite test artifact.
- `docs/test.md` is the comprehensive test reference (fixtures, env vars, coverage per file).
