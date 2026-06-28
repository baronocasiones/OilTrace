# OilTrace Test Suite

Tests for the FastAPI backend (Python) and the Solidity smart contract (Hardhat).

---

## Quick Start

```bash
# Backend tests (fast, SQLite)
cd backend && pip install pytest pytest-asyncio httpx web3 && python -m pytest tests/ -v

# Contract tests
cd contract && npm ci && npx hardhat test
```

---

## Test Layers

```
backend/tests/          ~112 tests across 11 files
├── conftest.py                  Fixtures, DB switching, auth helpers, RLS seed data
├── test_classification.py       Pure unit — no DB, no HTTP
├── test_points.py               Pure unit — ledger math and expiry
├── test_blockchain_service.py   Service tests — mocked Web3.py + poller state machine
├── test_routes.py               Service tests — mocked OSRM client
├── test_auth_middleware.py      API tests — JWT, roles, IoT auth, rate limiting
├── test_collection_api.py       API tests — CRUD, status transitions, role gating
├── test_push_notifications.py   API tests — token register, send, audit
├── test_partners.py             API tests — partner CRUD, vouchers, settlement
├── test_realtime.py             API tests — channel auth, payload validation, throttling
└── test_rls_boundaries.py       API tests — row-level security isolation (PostgreSQL only)

contract/test/          20+ tests across 1 file
└── OilTrace.test.ts             Deployment, recordCollection, verifyData, gas benchmark
```

---

## Fixture Architecture (`conftest.py`)

The test infrastructure has three concerns chained together:

### 1. Database: SQLite vs PostgreSQL

Controlled by the `OILTRACE_TEST_DB` env var:

| Value | Backend | RLS Tests | Speed | Requirement |
|-------|---------|-----------|-------|-------------|
| `""` (default) | SQLite | ❌ skipped | Fast | None |
| `postgres` or `pg` | PostgreSQL (testcontainers) | ✅ runs | Slow | `pip install testcontainers[postgresql] psycopg2-binary` and Docker |

```python
# conftest.py does this:
USE_REAL_PG = os.environ.get("OILTRACE_TEST_DB", "").lower() in ("postgres", "pg")
if USE_REAL_PG:
    # Spin up a real Postgres 16 container per session
    postgres_container = PostgresContainer("postgres:16-alpine")
else:
    # Use fast SQLite fallback
    TEST_DATABASE_URL = "sqlite:///./test.db"
```

**Why two modes:** SQLite makes the inner loop fast (`pytest tests/ -v` in <3 seconds). But SQLite doesn't support row-level security, so `test_rls_boundaries.py` must run on real Postgres. Run the full suite before pushing:

```bash
OILTRACE_TEST_DB=postgres python -m pytest tests/ -v
```

### 2. Per-test Database Session

Each test gets a **fresh DB session** that's fully torn down after:

```python
@pytest.fixture
def db_session(db_url):
    engine = create_engine(db_url)
    Base.metadata.create_all(bind=engine)   # Create tables
    session = TestSession(bind=engine)

    yield session

    session.close()
    Base.metadata.drop_all(bind=engine)     # Delete everything
```

This means tests never leak data to each other and can assume a clean slate.

### 3. HTTP Client with Dependency Override

The `client` fixture creates a FastAPI `TestClient` (via `httpx.AsyncClient` + `ASGITransport`) that overrides the production database dependency with our test fixture:

```python
@pytest_asyncio.fixture
async def client(db_session):
    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test/api/v1") as ac:
        yield ac
    app.dependency_overrides.clear()
```

All test requests go through this client and hit the actual FastAPI routing/middleware — no `httpx` mocking.

### 4. Auth Helpers

```python
@pytest.fixture
def consumer_jwt() -> str:
    return "mock-consumer-jwt-token"   # Patched in via dependency override

@pytest.fixture
def driver_jwt() -> str:
    return "mock-driver-jwt-token"

@pytest.fixture
def owner_jwt() -> str:
    return "mock-owner-jwt-token"
```

In production, these are Supabase Auth JWTs. In tests, they're placeholder strings that the auth middleware's dependency override interprets as predefined roles. This avoids needing a running Supabase instance.

### 5. RLS Seed Data

The `mock_rls_session` fixture creates two consumers, one driver, and one owner in the database so RLS boundary tests can verify cross-user isolation:

```python
consumer_a = Consumer(profile_id=consumer_a_id, business_name="Karinderya A")
consumer_b = Consumer(profile_id=consumer_b_id, business_name="Karinderya B")
driver = Driver(profile_id=driver_id, status="available")
owner = Owner(profile_id=owner_id, company_name="OilTrace Corp")
```

---

## Test Categories by Pattern

### Pure Unit Tests (fastest, no fixtures needed)

These tests import a service function directly and test pure business logic. No database, no HTTP, no mocking.

**Examples:** `test_classification.py`, `test_points.py`

```python
# test_classification.py — no fixtures at all
def test_premium_at_19_9(self):
    result = classify_oil(19.9)
    assert result.grade == GRADE_PREMIUM
    assert result.destination == "SAF"

def test_negative_tpm_raises_error(self):
    with pytest.raises(ValueError, match="TPM value cannot be negative"):
        classify_oil(-1.0)
```

### Service Tests (mocked external dependencies)

These test a service class with the external dependency (Web3.py, OSRM HTTP client) replaced by `unittest.mock` or `monkeypatch`.

**Examples:** `test_blockchain_service.py`, `test_routes.py`

```python
# test_blockchain_service.py — mock the smart contract
mock_contract = MagicMock()
mock_contract.functions.recordCollection.return_value.transact.return_value = {
    "hash": b'\xab\xcd' * 16
}
monkeypatch.setattr(
    "app.services.blockchain.BlockchainService._get_contract",
    lambda self: mock_contract
)
service = BlockchainService()
result = await service.record_collection(...)
assert result["status"] == "pending"
assert len(result["tx_hash"]) == 66  # "0x" + 64 hex chars
```

### API Tests (full HTTP round-trip)

These use the `client` fixture and test the complete request→middleware→route→service→response pipeline. The database is real (SQLite or Postgres); only external services (Web3, SMS, push) are mocked.

**Examples:** `test_auth_middleware.py`, `test_collection_api.py`, `test_push_notifications.py`

```python
# test_push_notifications.py (API test)
async def test_register_device_token(self, client):
    resp = await client.post(
        "/notifications/register",
        json={
            "token": "ExponentPushToken[test-token-123456]",
            "device_platform": "ios"
        },
        headers={"Authorization": "Bearer mock-consumer-jwt"}
    )
    assert resp.status_code == 200
```

---

## Coverage Details

### Contract Tests (`OilTrace.test.ts`) — 20+ tests

| Category | Tests | What it validates |
|----------|-------|-------------------|
| Deployment | 2 | Owner is set, contract address is correct |
| `recordCollection` | 5 | Valid grades (1, 2, 3) create records and emit events; invalid grade reverts |
| `getRecord` | 4 | Record retrieval by ID, batch reads, non-existent record reverts |
| `verifyData` | 3 | Matching integrity hash → verified; mangled hash → false |
| Edge cases | 4 | Zero address, empty geohash, duplicate record ID, zero volume |
| Gas benchmark | 1 | Records gas cost of `recordCollection` for optimization reference |

### Backend Tests — ~112 tests

| File | Tests | What it validates | Category |
|------|-------|-------------------|----------|
| `test_classification.py` | 12 | TPM boundaries (19.9/20.0/29.9/30.0), negative TPM error, zero/edge values, per-grade descriptions, 10K-call throughput benchmark | Pure unit |
| `test_points.py` | 14 | Earn calculation (10 pts/L), redemption deduction, insufficient balance → 400, 90-day expiry, running ledger integrity across 5+ transactions | Pure unit |
| `test_blockchain_service.py` | 15 | Web3.py write with correct args, contract-owner-only guard, RPC connection failure, verification endpoint, poller state machine: confirmed/failed/stale/RPC recovery/retry count max | Service |
| `test_routes.py` | 8 | Multi-stop/single-stop/zero-stop routes, OSRM success response parsing, OSRM timeout fallback, OSRM HTTP error fallback, nearest-neighbor ordering correctness | Service |
| `test_auth_middleware.py` | 16 | No-auth → 401, malformed/expired/wrong-role JWT → 401, consumer/driver/owner role enforcement on protected endpoints, IoT device credentials (valid/invalid/missing), rate limiting headers | API |
| `test_collection_api.py` | 12 | Create collection request, driver assignment (role-gated), TPM validation on recording, status transitions: pending→assigned→in_progress→completed, cancel from wrong role → 403, completed→cancel → 400 | API |
| `test_push_notifications.py` | 10 | Register/unregister device token, send on assignment/completion/expiry, malformed token → 400, rate limiting (burst of 20), notification audit log for owner | API |
| `test_partners.py` | 8 | Create/list partners (owner-only), voucher code format (`OIL-XXXXXXXX`), QR data format (`oiltrace://voucher/...`), expiry display, settlement amount math | API |
| `test_realtime.py` | 8 | Channel authorization: driver subscribes OK, consumer can subscribe to assigned driver, consumer rejected for unassigned driver, unauthenticated → 401, payload field validation, rate limit after 10 updates/second, disconnect cleanup | API |
| `test_rls_boundaries.py` | 9 | Consumer A can't see Consumer B's requests, driver sees only their assigned requests, owner sees all, unauthenticated → empty, public blockchain records accessible without auth, own profile always readable (PostgreSQL only) | API (PG) |

---

## Environment Variables

| Variable | Default | Purpose | Required for |
|----------|---------|---------|-------------|
| `OILTRACE_TEST_DB` | `""` | `"postgres"` or `"pg"` enables real PostgreSQL via testcontainers | `test_rls_boundaries.py` |
| `DATABASE_URL` | `sqlite:///./test.db` | Custom connection string when using PG directly | Advanced usage |
| `ETH_RPC_URL` | `http://localhost:8545` | Sepolia RPC endpoint for Web3.py tests | `test_blockchain_service.py` |
| `SUPABASE_URL` | `http://localhost:54321` | Supabase project URL for Realtime channel tests | `test_realtime.py` |

---

## CI Pipeline (two workflow files)

Each stack has its own CI workflow that **only triggers when its files change** — so pushing docs or hardware code won't fire false failures on unrelated test suites.

### `.github/workflows/contract.yml`

| Trigger | Job | Timeout |
|---------|-----|---------|
| Any push touching `contract/**` (any branch) | `npx hardhat test` (Node.js 20) | 5 min |
| PR to `main` touching `contract/**` | Same | 5 min |

Caches `node_modules` via npm.

### `.github/workflows/backend.yml`

| Trigger | Job | Timeout |
|---------|-----|---------|
| Any push touching `backend/**` (any branch) | `pytest tests/ -v` (Python 3.11) | 10 min |
| PR to `main` touching `backend/**` | Same | 10 min |

Runs all backend tests in SQLite mode. RLS boundary tests run only if `OILTRACE_TEST_DB=postgres` is set. Caches pip packages.

### What doesn't fire CI

Pushing changes to `docs/`, `hardware/`, `mobile/`, root `.md` files, or anything outside `backend/` and `contract/` — **no CI runs**. Clean green checks across the board.

---

## Adding New Tests

### Backend test (new service)

1. Create `backend/tests/test_<service>.py`
2. Use `client` fixture for API tests, no fixture for pure unit tests, `monkeypatch` for service tests
3. Import the service/module inside the test function (lazy import — conftest sets up the DB first)

```python
# Pure unit — no fixture needed
def test_some_business_logic(self):
    from app.services.my_service import calculate
    assert calculate(5) == 25

# API test — just use client
async def test_my_endpoint(self, client):
    resp = await client.get("/my/endpoint", headers=auth_header)
    assert resp.status_code == 200
```

### Contract test (new function)

1. Add tests to `contract/test/OilTrace.test.ts`
2. Use `loadFixture` to avoid state pollution between tests
3. Test both the happy path and the `revert` cases

---

## Known Limitations

- **RLS tests require PostgreSQL** — skipped automatically with a message when on SQLite
- **Blockchain tests use mocked Web3.py** — no actual Sepolia RPC calls during unit tests
- **Route tests use mocked OSRM responses** — no live OSRM calls; integration tests would need a real endpoint
- **Async tests** use `pytest-asyncio` — test functions must be `async def` or they won't await properly
- **Supabase Auth** is not tested at the unit level — the JWT verification is replaced by a mock dependency; full auth flow requires Supabase local dev or staging
