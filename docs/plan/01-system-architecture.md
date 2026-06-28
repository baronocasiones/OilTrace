# 01 — System Architecture

## High-Level Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        MOBILE APPS (React Native)                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                │
│  │  Consumer App   │  │   Driver App   │  │   Owner App    │                │
│  │  (Karinderya)   │  │  (Collector)   │  │  (Admin/Ops)   │                │
│  │                 │  │                │  │                │                │
│  │ • View history  │  │ • Optimized    │  │ • Dashboard    │                │
│  │ • Request       │  │   route map    │  │ • Manage users │                │
│  │   collection    │  │ • Turn-by-turn │  │ • Blockchain   │                │
│  │ • View points   │  │   navigation   │  │   audit log    │                │
│  │ • Redeem        │  │ • Record       │  │ • Analytics    │                │
│  │   vouchers      │  │   collection   │  │ • Point system │                │
│  │ • Blockchain    │  │ • View earnings│  │   management   │                │
│  │   verification  │  │                │  │                │                │
│  └───────┬─────────┘  └───────┬────────┘  └───────┬────────┘                │
└──────────┼────────────────────┼────────────────────┼────────────────────────┘
           │                    │                    │
           │          HTTPS + JWT (Supabase Auth)    │
           ▼                    ▼                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    FASTAPI PYTHON BACKEND                                   │
│                                                                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ Auth MW    │  │ Collection │  │ Blockchain │  │  Route     │           │
│  │ (JWT)      │  │ API        │  │ Service    │  │  Engine    │           │
│  │            │  │ CRUD       │  │ (Web3.py)  │  │  (OSRM)    │           │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘           │
│                                                                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │   IoT API  │  │Classifictn │  │   Points   │  │  Partners  │           │
│  │ (Dev Auth) │  │  Engine    │  │  Service   │  │  Service   │           │
│  │            │  │ SAF/Biofuel│  │            │  │            │           │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘           │
└──────┬──────────────┬──────────────┬──────────────┬────────────────────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Supabase │  │  PostgreSQL  │  │   Ethereum   │  │    OSRM      │
│   Auth   │  │  (Supabase)  │  │   Sepolia    │  │   Routing    │
│          │  │              │  │   Testnet    │  │   Engine     │
│ Phone/   │  │ All app data │  │              │  │              │
│ Email/   │  │              │  │ OilTrace     │  │ Multi-stop   │
│ OTP      │  │              │  │ Smart        │  │ optimization │
│          │  │              │  │ Contract     │  │              │
└──────────┘  └──────────────┘  └──────────────┘  └──────────────┘
                                         ▲
                                         │ API Key (Device ID + Secret)
                                         ▼
                    ┌───────────────────────────────────────────────┐
                    │        IoT DEVICE (Driver-Carried)            │
                    │                                               │
                    │  ┌───────────┐   ┌─────────────────────────┐ │
                    │  │ TPM Sensor│──▶│       ESP32             │ │
                    │  │(SEN0515   │   │                         │ │
                    │  │ or Sim)   │   │ Reads TPM via I2C       │ │
                    │  └───────────┘   │ Packages as JSON        │ │
                    │                 │ Sends via SIM800L HTTP   │ │
                    │  ┌───────────┐   │ Deep sleep after use     │ │
                    │  │ SIM800L   │──▶└─────────────────────────┘ │
                    │  │ (2G Cell) │                               │
                    │  └───────────┘                               │
                    │  Power: 10,000mAh Power Bank                 │
                    └───────────────────────────────────────────────┘
```

## Component Descriptions

### Mobile Apps (React Native)
Three role-based apps (or one app with role-based views):
- **Consumer:** View history, request collection, check points, redeem vouchers, verify blockchain
- **Driver:** Optimized route with turn-by-turn nav, record collections, view earnings
- **Owner:** Dashboard, manage users, configure points, partner management, blockchain audit

### FastAPI Backend (Python)
Single API server handling all business logic:
- **Auth Middleware:** JWT verification for Supabase Auth tokens
- **Collection API:** CRUD for collection requests and records
- **Classification Engine:** TPM → grade (SAF/biofuel/blended)
- **Blockchain Service:** Web3.py — write to Sepolia, verify transactions
- **Route Engine:** OSRM-based multi-stop optimization
- **IoT API:** Device authentication + TPM reading ingestion
- **Points Service:** Earn/redeem points, voucher generation
- **Partners Service:** Partner store management, discount configuration
- **Push Notification Service:** Send notifications via Expo Push API when requests are assigned or collections completed
- **Location Service:** Drivers push live location via Supabase Realtime; owner dashboard subscribes
- **Blockchain Poller:** Background thread checks pending tx hashes every 30s, updates status to confirmed/failed
- **Sentry Integration:** Error tracking — captures all unhandled exceptions with request context

### Supabase Auth
- Phone OTP primary authentication
- JWT tokens (1hr expiry, refresh tokens)
- Row Level Security for data isolation

### PostgreSQL (Supabase)
All relational data: users, profiles, collections, blockchain records, points, partners.

### Ethereum Sepolia Testnet
Smart contract stores immutable proof of each collection (TPM, grade, volume, timestamp).

### OSRM Routing Engine
Open Source Routing Machine — calculates optimal multi-stop collection routes.

### IoT Device (Driver-Carried)
Portable ESP32 + SIM800L + TPM sensor. Driver brings it to each karinderya, measures oil, sends data via cellular.

## Core Data Flows

### 1. Collection Request Flow
```
Consumer app → POST /api/v1/consumers/request → DB insert (status=pending) → 
Owner dashboard sees request → assigns driver → Driver gets push notification
```

### 2. Collection + IoT Flow
```
Driver arrives → connects ESP32 → reads TPM →
POST /api/v1/iot/reading → 
   1. Store raw reading in `collections`
   2. Run classification → get grade
   3. Award points to consumer
   4. Write to blockchain (grade included)
   5. Update `collection_requests` status
   6. Send push notification to consumer
```

### 3. Blockchain Traceability Flow
```
Collection → FastAPI Web3.py → Sepolia Smart Contract →
Tx hash stored in `blockchain_records` (status=pending) →
Background poller confirms tx → status=confirmed →
Consumer/Owner can verify: compare DB hash with on-chain hash
```

### 4. Points Redemption Flow
```
Consumer app → view partners → select discount →
POST /api/v1/consumers/redeem → generate voucher code →
Show QR to partner store → store scans →
OilTrace settles with partner monthly
```

### 5. Route Optimization Flow
```
Driver app → GET /api/v1/drivers/route →
FastAPI fetches pending collections → calls OSRM →
Returns optimized stop order → Driver app renders map
```

### 6. Push Notification Flow
```
Event triggers notification:
  • Owner assigns driver → notify driver
  • Collection completed → notify consumer (points awarded)
  • Consumer creates request → notify owner/driver pool
        │
        ▼
FastAPI Push Service → Expo Push API →
FCM/APNs → Mobile app receives notification
```

### 7. Real-Time Location Flow
```
Driver app → Supabase Realtime channel (driver:location) →
  Publishes { driver_id, lat, lng, status } every 10s
        │
        ▼
Owner dashboard → Supabase Realtime subscription →
  Receives live location updates → renders on map
```

### 8. Blockchain Tx Confirmation Flow
```
POST /api/v1/iot/reading → FastAPI writes to Sepolia →
  blockchain_records.status = 'pending'
        │
        ▼
Background Poller (every 30s):
  SELECT * FROM blockchain_records WHERE status = 'pending'
  For each: check tx receipt on Sepolia via Web3.py
  If confirmed:  UPDATE status = 'confirmed', block_number
  If failed:     UPDATE status = 'failed',  retry
```
