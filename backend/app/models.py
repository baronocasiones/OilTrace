import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Float, DateTime, Boolean, ForeignKey, Date, CheckConstraint, Uuid, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role = Column(String(20), nullable=False)
    full_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("role IN ('consumer', 'driver', 'owner')", name="check_profile_role"),
    )

    consumer = relationship("Consumer", back_populates="profile", uselist=False, cascade="all, delete-orphan")
    driver = relationship("Driver", back_populates="profile", uselist=False, cascade="all, delete-orphan")
    owner = relationship("Owner", back_populates="profile", uselist=False, cascade="all, delete-orphan")


class Consumer(Base):
    __tablename__ = "consumers"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(Uuid(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), unique=True, nullable=False)
    business_name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    preferred_schedule = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    profile = relationship("Profile", back_populates="consumer")
    requests = relationship("CollectionRequest", back_populates="consumer", cascade="all, delete-orphan")
    collections = relationship("Collection", back_populates="consumer", cascade="all, delete-orphan")
    vouchers = relationship("Voucher", back_populates="consumer", cascade="all, delete-orphan")
    ledger_entries = relationship("PointsLedger", back_populates="consumer", cascade="all, delete-orphan")


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(Uuid(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), unique=True, nullable=False)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    status = Column(String(20), default="available", nullable=False)
    vehicle_info = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("status IN ('available', 'busy', 'offline')", name="check_driver_status"),
    )

    profile = relationship("Profile", back_populates="driver")
    requests = relationship("CollectionRequest", back_populates="driver")
    collections = relationship("Collection", back_populates="driver")


class Owner(Base):
    __tablename__ = "owners"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(Uuid(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), unique=True, nullable=False)
    company_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    profile = relationship("Profile", back_populates="owner")


class CollectionRequest(Base):
    __tablename__ = "collection_requests"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consumer_id = Column(Uuid(as_uuid=True), ForeignKey("consumers.id", ondelete="CASCADE"), nullable=False)
    driver_id = Column(Uuid(as_uuid=True), ForeignKey("drivers.id"), nullable=True)
    status = Column(String(20), default="pending", nullable=False)
    request_type = Column(String(20), nullable=False)
    scheduled_date = Column(Date, nullable=True)
    notes = Column(String, nullable=True)
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    assigned_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')", name="check_request_status"),
        CheckConstraint("request_type IN ('scheduled', 'on_demand')", name="check_request_type"),
    )

    consumer = relationship("Consumer", back_populates="requests")
    driver = relationship("Driver", back_populates="requests")
    collections = relationship("Collection", back_populates="request")


class Collection(Base):
    __tablename__ = "collections"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(Uuid(as_uuid=True), ForeignKey("collection_requests.id"), nullable=True)
    consumer_id = Column(Uuid(as_uuid=True), ForeignKey("consumers.id"), nullable=False)
    driver_id = Column(Uuid(as_uuid=True), ForeignKey("drivers.id"), nullable=False)
    iot_device_id = Column(Uuid(as_uuid=True), nullable=True)
    tpm_value = Column(Float, nullable=False)
    oil_grade = Column(String(10), nullable=False)
    oil_destination = Column(String(20), nullable=False)
    volume_liters = Column(Float, nullable=False, default=5.0)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    collected_at = Column(DateTime(timezone=True), server_default=func.now())
    consumer_signed = Column(Boolean, default=False)
    notes = Column(String, nullable=True)

    __table_args__ = (
        CheckConstraint("oil_grade IN ('premium', 'standard', 'low')", name="check_collection_oil_grade"),
        CheckConstraint("oil_destination IN ('SAF', 'biofuel', 'blended')", name="check_collection_oil_destination"),
    )

    request = relationship("CollectionRequest", back_populates="collections")
    consumer = relationship("Consumer", back_populates="collections")
    driver = relationship("Driver", back_populates="collections")


class Partner(Base):
    __tablename__ = "partners"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    brand = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    description = Column(String, nullable=True)
    discount_per_point = Column(Float, nullable=False, default=0.50)
    points_per_liter = Column(Integer, default=10)
    min_redemption = Column(Integer, default=10)
    max_redemption = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    settlement_terms = Column(String, default="Monthly, net 15")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    vouchers = relationship("Voucher", back_populates="partner", cascade="all, delete-orphan")


class Voucher(Base):
    __tablename__ = "vouchers"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consumer_id = Column(Uuid(as_uuid=True), ForeignKey("consumers.id", ondelete="CASCADE"), nullable=False)
    partner_id = Column(Uuid(as_uuid=True), ForeignKey("partners.id", ondelete="CASCADE"), nullable=False)
    points_used = Column(Integer, nullable=False)
    discount_amount = Column(Float, nullable=False)
    voucher_code = Column(String, unique=True, nullable=False)
    qr_data = Column(String, nullable=True)
    status = Column(String(20), default="active", nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("status IN ('active', 'used', 'expired', 'cancelled')", name="check_voucher_status"),
    )

    consumer = relationship("Consumer", back_populates="vouchers")
    partner = relationship("Partner", back_populates="vouchers")


class PointsLedger(Base):
    __tablename__ = "points_ledger"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consumer_id = Column(Uuid(as_uuid=True), ForeignKey("consumers.id", ondelete="CASCADE"), nullable=False)
    collection_id = Column(Uuid(as_uuid=True), ForeignKey("collections.id", ondelete="SET NULL"), nullable=True)
    points = Column(Integer, nullable=False)
    transaction_type = Column(String(20), nullable=False)
    reference = Column(String, nullable=True)
    balance_after = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("transaction_type IN ('earned', 'redeemed', 'expired', 'bonus')", name="check_points_transaction_type"),
    )

    consumer = relationship("Consumer", back_populates="ledger_entries")
    collection = relationship("Collection")
