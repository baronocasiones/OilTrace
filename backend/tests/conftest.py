"""
Test fixtures for OilTrace backend tests.

Provides:
  - Database (SQLite default, PostgreSQL via testcontainers)
  - HTTP test client with dependency override support
  - Auth claims fixtures for role-based testing
  - Mock RLS session for isolation tests

Uses PostgreSQL via testcontainers (production-like) instead of SQLite
to ensure RLS policies, UUID generation, and JSONB operators work correctly.
If testcontainers is not available, falls back to SQLite for basic unit tests.

Install: pip install testcontainers[postgresql] psycopg2-binary
"""

import os
from uuid import uuid4
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.dependencies import Claims

# ── Conditional PostgreSQL / SQLite ─────────────────────────────────

USE_REAL_PG = os.environ.get("OILTRACE_TEST_DB", "").lower() in ("postgres", "pg")

if USE_REAL_PG:
    try:
        from testcontainers.postgres import PostgresContainer

        @pytest.fixture(scope="session")
        def postgres_container():
            """Spin up a real PostgreSQL container for testing."""
            with PostgresContainer("postgres:16-alpine") as pg:
                yield pg

        @pytest.fixture
        def db_url(postgres_container) -> str:
            return postgres_container.get_connection_url()

    except ImportError:
        USE_REAL_PG = False
        print("WARNING: testcontainers not installed. Falling back to SQLite. "
              "RLS tests will be SKIPPED. Install with: "
              "pip install testcontainers[postgresql] psycopg2-binary")


if not USE_REAL_PG:
    # Fallback to SQLite for basic unit tests
    TEST_DATABASE_URL = "sqlite:///./test.db"

    @pytest.fixture
    def db_url() -> str:
        return TEST_DATABASE_URL


# ── Application Imports (after env setup) ──────────────────────────

# These imports must happen after the database decision
# In a real project, you'd structure this so app modules can be imported
# before the database is connected.


@pytest.fixture
def db_session(db_url: str) -> Generator[Session, None, None]:
    """Create a fresh database session for each test.

    Tables are created before the test and dropped after,
    so every test starts with a clean state.
    """
    from app.database import Base
    
    # 🔥 FIX: Explicitly import your models module here.
    # This forces SQLAlchemy to discover and register all tables (including 'profiles')
    # before metadata.create_all runs on the very first test loop.
    import app.models

    engine = create_engine(db_url)
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine)
    session = TestSession()

    yield session

    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest_asyncio.fixture
async def client(db_session: Session) -> AsyncGenerator[AsyncClient, None]:
    """HTTP test client with overridden database dependency.

    Base fixture — no auth override. Tests that need authentication
    should use consumer_client, driver_client, or owner_client.
    """
    from app.main import app
    from app.database import get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test/api/v1") as ac:
        yield ac

    app.dependency_overrides.clear()


# ── Auth Claims ────────────────────────────────────────────────────

@pytest.fixture
def consumer_claims() -> Claims:
    return Claims(
        sub=str(uuid4()),
        role="consumer",
        phone="+639000000001",
        full_name="Test Consumer",
    )


@pytest.fixture
def driver_claims() -> Claims:
    return Claims(
        sub=str(uuid4()),
        role="driver",
        phone="+639000000002",
        full_name="Test Driver",
    )


@pytest.fixture
def owner_claims() -> Claims:
    return Claims(
        sub=str(uuid4()),
        role="owner",
        phone="+639000000003",
        full_name="Test Owner",
    )


# ── Authenticated Client Fixtures ──────────────────────────────────

def _seed_profile_and_role(db_session: Session, claims: Claims) -> None:
    """Create a Profile and role-specific record matching the claims.

    Routes look up Consumer/Driver/Owner by profile_id, so the test DB
    must contain matching records for authenticated requests to succeed.
    """
    from app.models import Profile, Consumer, Driver, Owner
    from uuid import UUID

    profile_id = UUID(claims["sub"])
    existing = db_session.query(Profile).filter(Profile.id == profile_id).first()
    if existing:
        return

    profile = Profile(
        id=profile_id,
        role=claims["role"],
        full_name=claims.get("full_name", "Test User"),
        phone=claims.get("phone"),
    )
    db_session.add(profile)
    db_session.commit()

    if claims["role"] == "consumer":
        db_session.add(Consumer(profile_id=profile_id, business_name="Test Karinderya"))
    elif claims["role"] == "driver":
        db_session.add(Driver(profile_id=profile_id, status="available"))
    elif claims["role"] == "owner":
        db_session.add(Owner(profile_id=profile_id, company_name="Test OilTrace Corp"))
    db_session.commit()


@pytest_asyncio.fixture
async def consumer_client(client: AsyncClient, consumer_claims: Claims, db_session: Session) -> AsyncGenerator[AsyncClient, None]:
    """HTTP test client authenticated as a consumer."""
    from app.dependencies import get_current_user
    from app.main import app

    _seed_profile_and_role(db_session, consumer_claims)
    app.dependency_overrides[get_current_user] = lambda: consumer_claims
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest_asyncio.fixture
async def driver_client(client: AsyncClient, driver_claims: Claims, db_session: Session) -> AsyncGenerator[AsyncClient, None]:
    """HTTP test client authenticated as a driver."""
    from app.dependencies import get_current_user
    from app.main import app

    _seed_profile_and_role(db_session, driver_claims)
    app.dependency_overrides[get_current_user] = lambda: driver_claims
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest_asyncio.fixture
async def owner_client(client: AsyncClient, owner_claims: Claims, db_session: Session) -> AsyncGenerator[AsyncClient, None]:
    """HTTP test client authenticated as an owner."""
    from app.dependencies import get_current_user
    from app.main import app

    _seed_profile_and_role(db_session, owner_claims)
    app.dependency_overrides[get_current_user] = lambda: owner_claims
    yield client
    app.dependency_overrides.pop(get_current_user, None)


# ── Auth Override Helper ──────────────────────────────────────────

@pytest.fixture
def set_auth(db_session: Session):
    """Context manager for switching auth mid-test.

    Seeds the DB with matching Profile/role records so routes that
    look up Consumer/Driver/Owner by profile_id succeed.

    Usage:
        def test_multi_role(self, client, set_auth, consumer_claims, owner_claims):
            set_auth(consumer_claims)
            await client.post("/consumers/requests", ...)   # as consumer

            set_auth(owner_claims)
            await client.put("/owners/requests/.../assign", ...)  # as owner
    """
    from app.dependencies import get_current_user
    from app.main import app

    def _set(claims: Claims):
        _seed_profile_and_role(db_session, claims)
        app.dependency_overrides[get_current_user] = lambda: claims

    yield _set

    app.dependency_overrides.pop(get_current_user, None)


# ── Integration Test Skip Marker ───────────────────────────────────

needs_postgres = pytest.mark.skipif(
    not USE_REAL_PG,
    reason="Integration tests require PostgreSQL. Set OILTRACE_TEST_DB=postgres and ensure Docker is running.",
)


# ── Integration Test Fixtures ──────────────────────────────────────

@pytest.fixture
def seed_consumer_with_location(db_session: Session):
    """Create a consumer with known lat/lng for route testing.

    Returns the Consumer object so tests can reference its ID.
    """
    from app.models import Profile, Consumer
    import uuid

    profile_id = uuid.uuid4()
    profile = Profile(
        id=profile_id,
        role="consumer",
        full_name="Located Consumer",
        phone="+639000000010",
    )
    db_session.add(profile)
    db_session.commit()

    consumer = Consumer(
        profile_id=profile_id,
        business_name="Located Karinderya",
        address="123 Rizal St, Barangay 5",
        latitude=14.5832,
        longitude=121.0409,
    )
    db_session.add(consumer)
    db_session.commit()
    return consumer


@pytest.fixture
def seed_collection_scenario(db_session: Session, request):
    """Pre-seed a full set of records for workflow integration tests.

    Creates: 2 consumers (A, B), 1 driver, 1 owner, 1 partner.
    Also creates 1 pending request for Consumer A (unassigned).

    Returns a dict with all UUIDs and the partner_id.
    Usage:
        scenario = seed_collection_scenario  # from fixture injection
        partner_id = scenario["partner_id"]
    """
    from app.models import Profile, Consumer, Driver, Owner, Partner, CollectionRequest
    import uuid

    ids = {
        "consumer_a_id": uuid.uuid4(),
        "consumer_b_id": uuid.uuid4(),
        "driver_id": uuid.uuid4(),
        "owner_id": uuid.uuid4(),
        "partner_id": uuid.uuid4(),
    }

    profiles = [
        Profile(id=ids["consumer_a_id"], role="consumer", full_name="Consumer A", phone="+639000000011"),
        Profile(id=ids["consumer_b_id"], role="consumer", full_name="Consumer B", phone="+639000000012"),
        Profile(id=ids["driver_id"], role="driver", full_name="Driver One", phone="+639000000013"),
        Profile(id=ids["owner_id"], role="owner", full_name="Owner Admin", phone="+639000000014"),
    ]
    for p in profiles:
        db_session.add(p)
    db_session.commit()

    consumers = [
        Consumer(
            id=ids["consumer_a_id"],
            profile_id=ids["consumer_a_id"],
            business_name="Karinderya A",
            address="111 A Street",
            latitude=14.58,
            longitude=121.04,
        ),
        Consumer(
            id=ids["consumer_b_id"],
            profile_id=ids["consumer_b_id"],
            business_name="Karinderya B",
            address="222 B Street",
            latitude=14.59,
            longitude=121.05,
        ),
    ]
    for c in consumers:
        db_session.add(c)
    db_session.commit()

    db_session.add(Driver(
        id=ids["driver_id"],
        profile_id=ids["driver_id"],
        status="available",
        current_lat=14.5800,
        current_lng=121.0400,
    ))
    db_session.add(Owner(
        profile_id=ids["owner_id"],
        company_name="OilTrace Corp",
    ))
    db_session.commit()

    partner = Partner(
        id=ids["partner_id"],
        name="Minola",
        brand="Minola Cooking Oil",
        discount_per_point=0.50,
        points_per_liter=10,
        min_redemption=10,
        max_redemption=500,
        is_active=True,
    )
    db_session.add(partner)

    request_a = CollectionRequest(
        consumer_id=ids["consumer_a_id"],
        status="pending",
        request_type="on_demand",
        notes="Please pickup",
    )
    db_session.add(request_a)
    db_session.commit()
    ids["request_a_id"] = request_a.id

    return ids


@pytest.fixture
def mock_osrm_success(monkeypatch):
    """Mock RouteEngine._fetch_osrm to return a valid single-stop OSRM response.

    Route distance = 1200 m, duration = 480 s → 1.2 km / 8 min.
    Polyline is a stub string for map rendering.
    """
    async def _mock_fetch(*args, **kwargs):
        return {
            "code": "Ok",
            "waypoints": [
                {"location": [121.0409, 14.5832], "waypoint_index": 0},
            ],
            "routes": [{
                "distance": 1200.0,
                "duration": 480.0,
                "geometry": "mock_polyline",
            }],
        }

    monkeypatch.setattr(
        "app.services.route_engine.RouteEngine._fetch_osrm",
        _mock_fetch,
    )


@pytest.fixture
def mock_osrm_failure(monkeypatch):
    """Mock RouteEngine._fetch_osrm to raise TimeoutError (simulate OSRM down).

    The route engine should fall back to haversine nearest-neighbor.
    """
    async def _mock_timeout(*args, **kwargs):
        raise TimeoutError("OSRM timed out")

    monkeypatch.setattr(
        "app.services.route_engine.RouteEngine._fetch_osrm",
        _mock_timeout,
    )


@pytest.fixture
def mock_expo_push_success(monkeypatch):
    """Mock PushService.send_push to return success without calling Expo.

    Records the call arguments into a shared list accessible via push_call_log.
    """
    recorded = []

    async def _mock_send(token: str, title: str, body: str) -> dict:
        recorded.append({"token": token, "title": title, "body": body})
        return {"status": "ok"}

    monkeypatch.setattr(
        "app.services.push_notifications.PushService.send_push",
        _mock_send,
    )
    return recorded


@pytest.fixture
def mock_expo_push_failure(monkeypatch):
    """Mock PushService.send_push to always raise an Exception.

    Tests verify that PushService retries (MAX_RETRIES=2) and
    eventually returns an error status instead of crashing.
    """
    async def _mock_fail(*args, **kwargs):
        raise Exception("Expo API error")

    monkeypatch.setattr(
        "app.services.push_notifications.PushService.send_push",
        _mock_fail,
    )


# ── RLS Seed Data ─────────────────────────────────────────────────

@pytest.fixture
def mock_rls_session(db_session: Session):
    """Seed minimal data for RLS boundary tests.

    Creates two consumers and one driver so we can verify isolation.
    Returns the UUIDs used so tests can configure their auth claims accordingly.
    """
    from app.models import Profile, Consumer, Driver, Owner

    consumer_a_id = uuid4()
    consumer_b_id = uuid4()
    driver_id = uuid4()
    owner_id = uuid4()

    profiles = [
        Profile(id=consumer_a_id, role="consumer", full_name="Consumer A"),
        Profile(id=consumer_b_id, role="consumer", full_name="Consumer B"),
        Profile(id=driver_id, role="driver", full_name="Driver One"),
        Profile(id=owner_id, role="owner", full_name="Owner Admin"),
    ]
    for p in profiles:
        db_session.add(p)

    consumers = [
        Consumer(profile_id=consumer_a_id, business_name="Karinderya A"),
        Consumer(profile_id=consumer_b_id, business_name="Karinderya B"),
    ]
    for c in consumers:
        db_session.add(c)

    db_session.add(Driver(profile_id=driver_id, status="available"))
    db_session.add(Owner(profile_id=owner_id, company_name="OilTrace Corp"))

    db_session.commit()

    return {
        "consumer_a_id": consumer_a_id,
        "consumer_b_id": consumer_b_id,
        "driver_id": driver_id,
        "owner_id": owner_id,
    }
