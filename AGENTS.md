# OilTrace — Agent Guide

Used cooking oil collection for Philippine karinderyas. IoT sensor grades oil for SAF/biofuel, records on Ethereum Sepolia, rewards consumers with points at partner stores.

## Repo at a glance

```
backend/    # FastAPI + pytest (~112 tests)
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

No `requirements.txt` exists — CI falls back to `pip install pytest pytest-asyncio httpx web3`. Install testcontainers for PG: `pip install testcontainers[postgresql] psycopg2-binary`.

## Test patterns

**Lazy imports required** — import app modules inside test functions, not at module level. `conftest.py` sets up the DB first, so module-level imports would hit an uninitialized DB.

Three test categories with different fixture needs:

| Category | Fixtures | Pattern |
|----------|----------|---------|
| Pure unit | none needed | Import service function directly, test business logic |
| Service | `monkeypatch` | Mock external calls (Web3, OSRM HTTP) |
| API | `client` | Full HTTP round-trip via `TestClient`, DB is real |

Key fixtures from `backend/tests/conftest.py`:
- `db_session` — fresh SQLite or PG per test (tables created, then dropped)
- `client` — `httpx.AsyncClient` with `ASGITransport`, base URL `http://test/api/v1`
- `consumer_jwt` / `driver_jwt` / `owner_jwt` — mock JWT strings recognized by auth dependency override
- `mock_rls_session` — seeds 2 consumers + 1 driver + 1 owner for isolation tests

Tests are `async def` — `asyncio_mode = "auto"` in `pyproject.toml` makes this work automatically.

## Test DB switching

`OILTRACE_TEST_DB` env var controls the database backend:

| Value | Backend | RLS tests |
|-------|---------|-----------|
| `""` (default) | SQLite | Skipped |
| `"postgres"` / `"pg"` | PostgreSQL via testcontainers | Runs |

`test_rls_boundaries.py` requires PostgreSQL (SQLite can't enforce RLS). CI skips it automatically.

## What's not configured

No ruff, no pre-commit, no formatter, no type checker, no editorconfig. No codegen or build steps needed for Python work. Backend app is currently minimal (`main.py` = 8 lines, a health endpoint). Tests exercise many `app.services.*` modules that exist.

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
