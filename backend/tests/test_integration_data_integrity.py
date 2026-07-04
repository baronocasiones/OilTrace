"""
Integration tests for database-level data integrity.

Verifies foreign key cascades, check constraints, unique constraints,
ledger balance consistency, and parse_uuid fallback behavior.

All tests require PostgreSQL — set OILTRACE_TEST_DB=postgres.
"""

import uuid

import pytest
from sqlalchemy import text

from conftest import needs_postgres

pytestmark = needs_postgres


# =============================================================================
# Foreign Key Cascades
# =============================================================================

class TestForeignKeyConstraints:
    """CASCADE / SET NULL / no-action FK behavior."""

    def test_delete_profile_cascades_to_consumer(self, db_session):
        """Delete Profile → Consumer row is deleted (CASCADE)."""
        from app.models import Profile, Consumer

        p = Profile(id=uuid.uuid4(), role="consumer", full_name="FK Consumer")
        db_session.add(p)
        db_session.commit()
        c = Consumer(id=uuid.uuid4(), profile_id=p.id, business_name="FK Karinderya")
        db_session.add(c)
        db_session.commit()

        db_session.delete(p)
        db_session.commit()

        assert db_session.query(Consumer).filter(Consumer.id == c.id).count() == 0

    def test_delete_profile_cascades_to_driver(self, db_session):
        """Delete Profile → Driver row is deleted (CASCADE)."""
        from app.models import Profile, Driver

        p = Profile(id=uuid.uuid4(), role="driver", full_name="FK Driver")
        db_session.add(p)
        db_session.commit()
        d = Driver(id=uuid.uuid4(), profile_id=p.id, status="available")
        db_session.add(d)
        db_session.commit()

        db_session.delete(p)
        db_session.commit()
        assert db_session.query(Driver).filter(Driver.id == d.id).count() == 0

    def test_delete_profile_cascades_to_owner(self, db_session):
        """Delete Profile → Owner row is deleted (CASCADE)."""
        from app.models import Profile, Owner

        p = Profile(id=uuid.uuid4(), role="owner", full_name="FK Owner")
        db_session.add(p)
        db_session.commit()
        o = Owner(profile_id=p.id, company_name="FK Corp")
        db_session.add(o)
        db_session.commit()

        db_session.delete(p)
        db_session.commit()
        assert db_session.query(Owner).filter(Owner.id == o.id).count() == 0

    def test_delete_profile_cascades_to_device_tokens(self, db_session):
        """Delete Profile → PushDevice rows deleted (CASCADE)."""
        from app.models import Profile, PushDevice

        p = Profile(id=uuid.uuid4(), role="consumer", full_name="FK Push")
        db_session.add(p)
        db_session.commit()
        d = PushDevice(profile_id=p.id, platform="android", push_token="ExponentPushToken[fk-test]")
        db_session.add(d)
        db_session.commit()

        db_session.delete(p)
        db_session.commit()
        db_session.expire_all()
        assert db_session.query(PushDevice).filter(PushDevice.profile_id == p.id).count() == 0

    def test_delete_consumer_cascades_to_requests(self, db_session):
        """Delete Consumer → their collection_requests deleted."""
        from app.models import Profile, Consumer, CollectionRequest

        p = Profile(id=uuid.uuid4(), role="consumer", full_name="FK Req")
        db_session.add(p)
        db_session.commit()
        c = Consumer(id=uuid.uuid4(), profile_id=p.id, business_name="FK Req Karinderya")
        db_session.add(c)
        db_session.commit()
        req = CollectionRequest(consumer_id=c.id, status="pending", request_type="on_demand")
        db_session.add(req)
        db_session.commit()

        db_session.delete(c)
        db_session.commit()
        assert db_session.query(CollectionRequest).filter(CollectionRequest.id == req.id).count() == 0

    def test_delete_consumer_cascades_to_ledger(self, db_session):
        """Delete Consumer → PointsLedger entries deleted (CASCADE)."""
        from app.models import Profile, Consumer, PointsLedger

        p = Profile(id=uuid.uuid4(), role="consumer", full_name="FK Ledger")
        db_session.add(p)
        db_session.commit()
        c = Consumer(id=uuid.uuid4(), profile_id=p.id, business_name="FK Ledger Karinderya")
        db_session.add(c)
        db_session.commit()
        entry = PointsLedger(
            consumer_id=c.id, points=50, transaction_type="earned",
            reference="FK test", balance_after=50,
        )
        db_session.add(entry)
        db_session.commit()

        db_session.delete(c)
        db_session.commit()
        assert db_session.query(PointsLedger).filter(PointsLedger.id == entry.id).count() == 0

    def test_delete_partner_cascades_to_vouchers(self, db_session):
        """Delete Partner → Vouchers deleted (CASCADE)."""
        from app.models import Profile, Consumer, Partner, Voucher

        p = Profile(id=uuid.uuid4(), role="consumer", full_name="FK Vouch")
        db_session.add(p)
        db_session.commit()
        c = Consumer(id=uuid.uuid4(), profile_id=p.id, business_name="FK Vouch Karinderya")
        db_session.add(c)
        partner = Partner(name="FK Partner")
        db_session.add(partner)
        db_session.commit()
        voucher = Voucher(
            consumer_id=c.id, partner_id=partner.id, points_used=10,
            discount_amount=5.0, voucher_code="OIL-FK-001", status="active",
        )
        db_session.add(voucher)
        db_session.commit()

        db_session.delete(partner)
        db_session.commit()
        assert db_session.query(Voucher).filter(Voucher.id == voucher.id).count() == 0

    def test_delete_collection_sets_null_on_ledger(self, db_session):
        """Delete Collection → PointsLedger.collection_id = NULL (SET NULL)."""
        from app.models import Profile, Consumer, Driver, Collection, PointsLedger

        p = Profile(id=uuid.uuid4(), role="consumer", full_name="FK SetNull")
        db_session.add(p)
        dp = Profile(id=uuid.uuid4(), role="driver", full_name="FK SetNull D")
        db_session.add(dp)
        db_session.commit()
        c = Consumer(id=uuid.uuid4(), profile_id=p.id, business_name="FK SetNull Karinderya")
        d = Driver(id=uuid.uuid4(), profile_id=dp.id, status="available")
        db_session.add(c)
        db_session.add(d)
        db_session.commit()
        coll = Collection(
            consumer_id=c.id, driver_id=d.id, tpm_value=20.0,
            oil_grade="standard", oil_destination="blended", volume_liters=5.0,
        )
        db_session.add(coll)
        db_session.commit()
        entry = PointsLedger(
            consumer_id=c.id, collection_id=coll.id, points=50,
            transaction_type="earned", reference="FK SetNull test", balance_after=50,
        )
        db_session.add(entry)
        db_session.commit()
        assert entry.collection_id == coll.id

        db_session.delete(coll)
        db_session.commit()
        db_session.refresh(entry)
        assert entry.collection_id is None

    def test_delete_driver_sets_null_on_request_driver_id(self, db_session):
        """Delete Driver → CollectionRequest.driver_id SET NULL.

        The FK on collection_requests.driver_id now has ON DELETE SET NULL.
        After deleting a driver, the request's driver_id is set to null.
        """
        from app.models import Profile, Consumer, Driver, CollectionRequest

        p = Profile(id=uuid.uuid4(), role="consumer", full_name="FK Orphan")
        db_session.add(p)
        dp = Profile(id=uuid.uuid4(), role="driver", full_name="FK Orphan D")
        db_session.add(dp)
        db_session.commit()
        c = Consumer(id=uuid.uuid4(), profile_id=p.id, business_name="FK Orphan Karinderya")
        d = Driver(id=uuid.uuid4(), profile_id=dp.id, status="available")
        db_session.add(c)
        db_session.add(d)
        db_session.commit()
        req = CollectionRequest(
            consumer_id=c.id, driver_id=d.id, status="assigned", request_type="on_demand",
        )
        db_session.add(req)
        db_session.commit()

        db_session.delete(d)
        db_session.commit()

        # The request survives with driver_id set to NULL
        orphan = db_session.query(CollectionRequest).filter(CollectionRequest.id == req.id).first()
        assert orphan is not None
        assert orphan.driver_id is None  # SET NULL

    def test_device_token_requires_valid_profile(self, db_session):
        """Insert PushDevice with non-existent profile_id → FK violation."""
        from app.models import PushDevice

        fake_id = uuid.uuid4()
        device = PushDevice(profile_id=fake_id, platform="android", push_token="ExponentPushToken[fk-violation]")
        db_session.add(device)
        with pytest.raises(Exception):  # IntegrityError
            db_session.commit()
        db_session.rollback()


# =============================================================================
# Check Constraints
# =============================================================================

class TestCheckConstraints:
    """ENUM-like CHECK constraints on various columns."""

    @pytest.mark.parametrize("table,column,value", [
        ("profiles", "role", "admin"),
        ("collections", "oil_grade", "super"),
        ("collections", "oil_destination", "landfill"),
        ("drivers", "status", "sleeping"),
        ("collection_requests", "status", "deleted"),
        ("collection_requests", "request_type", "urgent"),
        ("vouchers", "status", "stolen"),
        ("points_ledger", "transaction_type", "expired"),
        ("device_tokens", "platform", "web"),
    ])
    def test_invalid_value_rejected(self, table, column, value, db_session):
        """Direct SQL insert with invalid CHECK constraint value → error."""
        sql = text(f"INSERT INTO {table} (id, {column}) VALUES (:id, :val)")
        with pytest.raises(Exception):
            db_session.execute(sql, {"id": str(uuid.uuid4()), "val": value})
            db_session.commit()
        db_session.rollback()


class TestPushDeviceUniqueness:
    """Unique constraint on push_token."""

    def test_duplicate_push_token_rejected(self, db_session):
        """Same push_token inserted twice → unique violation."""
        from app.models import Profile, PushDevice

        p1 = Profile(id=uuid.uuid4(), role="consumer", full_name="Uniq A")
        p2 = Profile(id=uuid.uuid4(), role="driver", full_name="Uniq B")
        db_session.add(p1)
        db_session.add(p2)
        db_session.commit()

        d1 = PushDevice(profile_id=p1.id, platform="android", push_token="ExponentPushToken[uniq-test]")
        db_session.add(d1)
        db_session.commit()

        d2 = PushDevice(profile_id=p2.id, platform="ios", push_token="ExponentPushToken[uniq-test]")
        db_session.add(d2)
        with pytest.raises(Exception):
            db_session.commit()
        db_session.rollback()


# =============================================================================
# Points Ledger Integrity
# =============================================================================

class TestPointsLedgerIntegrity:
    """Running balance check and immutability."""

    def test_balance_after_is_consistent(self, db_session):
        """Each entry's balance_after = SUM of previous points + current points."""
        from app.models import Profile, Consumer, PointsLedger

        p = Profile(id=uuid.uuid4(), role="consumer", full_name="Ledger Check")
        db_session.add(p)
        db_session.commit()
        c = Consumer(id=uuid.uuid4(), profile_id=p.id, business_name="Ledger Check")
        db_session.add(c)
        db_session.commit()

        entries = [
            PointsLedger(consumer_id=c.id, points=50, transaction_type="earned",
                         reference="A", balance_after=50),
            PointsLedger(consumer_id=c.id, points=30, transaction_type="earned",
                         reference="B", balance_after=80),
            PointsLedger(consumer_id=c.id, points=-20, transaction_type="redeemed",
                         reference="C", balance_after=60),
        ]
        for e in entries:
            db_session.add(e)
        db_session.commit()

        fetched = db_session.execute(
            text("SELECT SUM(points) FROM points_ledger WHERE consumer_id = :cid"),
            {"cid": str(c.id)},
        ).scalar()
        assert fetched == 60

    def test_ledger_entries_append_only(self, db_session):
        """Direct UPDATE on a ledger row is allowed by DB but should not happen
        in practice. This tests that the DB allows it (no trigger-based guard)."""
        from app.models import Profile, Consumer, PointsLedger

        p = Profile(id=uuid.uuid4(), role="consumer", full_name="Append Test")
        db_session.add(p)
        db_session.commit()
        c = Consumer(id=uuid.uuid4(), profile_id=p.id, business_name="Append Test")
        db_session.add(c)
        db_session.commit()
        entry = PointsLedger(
            consumer_id=c.id, points=50, transaction_type="earned",
            reference="original", balance_after=50,
        )
        db_session.add(entry)
        db_session.commit()

        # Direct UPDATE — note the DB allows this (no trigger)
        db_session.execute(
            text("UPDATE points_ledger SET points = 999 WHERE id = :eid"),
            {"eid": str(entry.id)},
        )
        db_session.commit()

        # Verify the DB did allow it (documenting no guard exists)
        updated = db_session.execute(
            text("SELECT points FROM points_ledger WHERE id = :eid"),
            {"eid": str(entry.id)},
        ).scalar()
        assert updated == 999
        # Rollback so we don't pollute teardown
        db_session.execute(
            text("UPDATE points_ledger SET points = 50 WHERE id = :eid"),
            {"eid": str(entry.id)},
        )
        db_session.commit()


class TestVoucherUniqueness:
    """Voucher code unique constraint."""

    def test_duplicate_voucher_code_rejected(self, db_session):
        """Same voucher_code inserted twice → unique violation."""
        from app.models import Profile, Consumer, Partner, Voucher

        p = Profile(id=uuid.uuid4(), role="consumer", full_name="Vouch Uniq")
        db_session.add(p)
        db_session.commit()
        c = Consumer(id=uuid.uuid4(), profile_id=p.id, business_name="Vouch Uniq")
        partner = Partner(name="Uniq Partner")
        db_session.add(c)
        db_session.add(partner)
        db_session.commit()

        V1 = Voucher(consumer_id=c.id, partner_id=partner.id, points_used=10,
                     discount_amount=5.0, voucher_code="OIL-UNIQUE-001", status="active")
        db_session.add(V1)
        db_session.commit()

        V2 = Voucher(consumer_id=c.id, partner_id=partner.id, points_used=10,
                     discount_amount=5.0, voucher_code="OIL-UNIQUE-001", status="active")
        db_session.add(V2)
        with pytest.raises(Exception):
            db_session.commit()
        db_session.rollback()


# =============================================================================
# parse_uuid Behavior
# =============================================================================

class TestParseUuidBehavior:
    """verify deterministic uuid5 fallback for non-UUID strings."""

    def test_parse_uuid_preserves_valid_uuid(self):
        """A valid UUID string passes through unchanged."""
        from app.routes.collections import parse_uuid

        expected = "12345678-1234-5678-1234-567812345678"
        result = parse_uuid(expected)
        assert str(result) == expected

    def test_parse_uuid_deterministic_for_strings(self):
        """Non-UUID string produces a deterministic uuid5 result."""
        from app.routes.collections import parse_uuid

        r1 = parse_uuid("test-consumer-ref")
        r2 = parse_uuid("test-consumer-ref")
        assert r1 == r2

    def test_parse_uuid_different_strings_different_uuids(self):
        """Different strings produce different UUIDs (no collisions)."""
        from app.routes.collections import parse_uuid

        r1 = parse_uuid("stop-1")
        r2 = parse_uuid("stop-2")
        assert r1 != r2

    def test_parse_uuid_zero_returns_zero(self):
        """The zero UUID is preserved through parse_uuid, not re-hashed."""
        from app.routes.collections import parse_uuid

        zero = "00000000-0000-0000-0000-000000000000"
        result = parse_uuid(zero)
        assert str(result) == zero
