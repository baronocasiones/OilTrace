# 02 — Database Schema (PostgreSQL via Supabase)

All tables use Supabase's built-in `auth.users` as the master user store. The `profiles` table extends it with role-specific data.

## Entity-Relationship

```
auth.users (Supabase)
    │
    ▼
profiles (role: consumer | driver | owner)
    │
    ├── consumers (karinderya info)
    │       │
    │       ├── collection_requests (consumer asks for pickup)
    │       │       │
    │       │       └── collections (completed pickups)
    │       │               │
    │       │               ├── blockchain_records (tx proof)
    │       │               └── points_ledger (earned points)
    │       │
    │       └── vouchers (discount vouchers)
    │
    ├── drivers (collection personnel)
    │       │
    │       └── iot_devices (assigned ESP32)
    │
    └── owners (business admin)
```

## All Tables

### `profiles`
Extends Supabase Auth users with role and display info.

```sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('consumer', 'driver', 'owner')),
  full_name   TEXT,
  phone       TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can read their own profile; owners can read all
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Owners read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );
```

### `consumers`
Karinderya information, linked to a profile with role='consumer'.

```sql
CREATE TABLE consumers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  business_name     TEXT NOT NULL,
  address           TEXT,
  latitude          FLOAT,
  longitude         FLOAT,
  preferred_schedule TEXT,       -- e.g., "Monday & Thursday"
  contact_number    TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Consumers see own record; owners see all
CREATE POLICY "Consumers read own" ON consumers
  FOR SELECT USING (
    profile_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );
CREATE POLICY "Consumers update own" ON consumers
  FOR UPDATE USING (profile_id = auth.uid());
```

### `drivers`
Collection personnel information.

```sql
CREATE TABLE drivers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  current_lat     FLOAT,                    -- real-time location
  current_lng     FLOAT,
  status          VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available','busy','offline')),
  vehicle_info    TEXT,                     -- e.g., "Tricycle ABC-123"
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Drivers see own; owners see all
```

### `owners`
Business admin information.

```sql
CREATE TABLE owners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  company_name    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `iot_devices`
Hardware registry. Each device has a unique ID and a hashed secret for authentication.

```sql
CREATE TABLE iot_devices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id         TEXT UNIQUE NOT NULL,      -- e.g., "OIL-ESP32-001"
  device_secret     TEXT NOT NULL,             -- bcrypt hashed
  assigned_driver_id UUID REFERENCES drivers(id),
  is_active         BOOLEAN DEFAULT true,
  firmware_version  TEXT,
  last_seen_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Only owners can manage devices
```

### `collection_requests`
When a consumer requests a pickup (scheduled or on-demand).

```sql
CREATE TABLE collection_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id     UUID REFERENCES consumers(id) ON DELETE CASCADE NOT NULL,
  driver_id       UUID REFERENCES drivers(id),            -- assigned when accepted
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','assigned','in_progress','completed','cancelled')),
  request_type    VARCHAR(20) NOT NULL CHECK (request_type IN ('scheduled','on_demand')),
  scheduled_date  DATE,                                    -- for scheduled requests
  notes           TEXT,
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  assigned_at     TIMESTAMPTZ
);

-- RLS: Consumers see own requests; drivers see assigned; owners see all
```

### `collections`
The core table — records every completed collection with TPM, grade, and location.

```sql
CREATE TABLE collections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID REFERENCES collection_requests(id),
  consumer_id     UUID REFERENCES consumers(id) NOT NULL,
  driver_id       UUID REFERENCES drivers(id) NOT NULL,
  iot_device_id   UUID REFERENCES iot_devices(id),
  tpm_value       FLOAT NOT NULL,
  oil_grade       VARCHAR(10) NOT NULL CHECK (oil_grade IN ('premium','standard','low')),
  oil_destination VARCHAR(20) NOT NULL CHECK (oil_destination IN ('SAF','biofuel','blended')),
  volume_liters   FLOAT NOT NULL DEFAULT 5.0,
  location_lat    FLOAT,
  location_lng    FLOAT,
  collected_at    TIMESTAMPTZ DEFAULT NOW(),
  consumer_signed BOOLEAN DEFAULT false,    -- consumer confirms collection
  notes           TEXT
);

-- RLS: Consumers see own; drivers see their collections; owners see all
```

### `blockchain_records`
Links each collection to its Ethereum transaction for auditability.

```sql
CREATE TABLE blockchain_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id   UUID REFERENCES collections(id) ON DELETE CASCADE UNIQUE NOT NULL,
  tx_hash         TEXT,                     -- Ethereum transaction hash
  block_number    BIGINT,
  chain_id        INT DEFAULT 11155111,     -- Sepolia = 11155111
  contract_address TEXT,
  gas_used        BIGINT,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed')),
  data_json       JSONB,                    -- full payload for verification
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Anyone can read (public transparency for blockchain data)
CREATE POLICY "Blockchain records public read" ON blockchain_records
  FOR SELECT USING (true);
```

### `points_ledger`
Tracks all point movements for each consumer.

```sql
CREATE TABLE points_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id     UUID REFERENCES consumers(id) NOT NULL,
  collection_id   UUID REFERENCES collections(id),    -- NULL if redemption
  points          INT NOT NULL,                        -- positive = earned, negative = redeemed
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned','redeemed','expired','bonus')),
  reference       TEXT,                                -- voucher code, partner name, etc.
  balance_after   INT NOT NULL,                        -- running balance
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_points_consumer ON points_ledger(consumer_id);
```

### `partners`
Partner stores/brands that accept points for discounts.

```sql
CREATE TABLE partners (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,                     -- store/partner name
  brand             TEXT,                              -- e.g., "Minola", "Baguio Oil"
  logo_url          TEXT,
  description       TEXT,
  discount_per_point FLOAT NOT NULL,                   -- e.g., ₱0.50 per point
  points_per_liter  INT DEFAULT 10,                    -- points earned per liter collected
  min_redemption    INT DEFAULT 10,                    -- minimum points to redeem
  max_redemption    INT,                               -- max per transaction (NULL = unlimited)
  is_active         BOOLEAN DEFAULT true,
  contact_info      TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### `device_tokens`
Push notification device tokens for Expo Notifications.

```sql
CREATE TABLE device_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  platform        VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  push_token      TEXT NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_device_tokens_token ON device_tokens(push_token);
CREATE INDEX idx_device_tokens_profile ON device_tokens(profile_id);

-- RLS: Users manage their own device tokens
CREATE POLICY "Users manage own tokens" ON device_tokens
  FOR ALL USING (profile_id = auth.uid());
```

### `vouchers`
Generated discount vouchers for point redemption.

```sql
CREATE TABLE vouchers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id     UUID REFERENCES consumers(id) NOT NULL,
  partner_id      UUID REFERENCES partners(id) NOT NULL,
  points_used     INT NOT NULL,
  discount_amount FLOAT NOT NULL,
  voucher_code    TEXT UNIQUE NOT NULL,
  qr_data         TEXT,                              -- QR code content
  status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','used','expired','cancelled')),
  expires_at      TIMESTAMPTZ,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

## RLS Policy Summary

| Table | Consumer Can | Driver Can | Owner Can |
|-------|-------------|-----------|-----------|
| profiles | Read/update own | Read/update own | Read all |
| consumers | Read/update own | Read assigned | Read/update all |
| drivers | — | Read/update own | Read/update all |
| collection_requests | Create/read own | Read assigned | Read/update all |
| collections | Read own | Read/update their collections | Read/update all |
| blockchain_records | Read (public) | Read (public) | Read (public) |
| points_ledger | Read own | — | Read/configure all |
| partners | Read active | Read | Read/update all |
| vouchers | Read/use own | — | Read/issue all |
| device_tokens | Read/update own | Read/update own | Read/update all |
| iot_devices | — | Read own assigned | Read/update all |
