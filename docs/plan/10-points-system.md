# 10 — Points System & Partner Model

## Overview

Consumers earn points for every liter of used oil they provide. These points can be redeemed for real monetary discounts at partner stores (sari-sari stores, grocery brands, oil companies). OilTrace never touches fresh oil inventory — it simply facilitates the discount through a **partner model**.

## How It Works

```
Consumer gives 5L used oil
         │
         ▼
  OilTrace processes collection
         │
         ▼
  Points awarded: 5L × 10 pts/L = 50 points
         │
         ▼
  Consumer opens app → browses partners
         │
         ▼
  Selects: "Minola Oil — 10 pts = ₱5 off"
         │
         ▼
  Clicks Redeem → gets voucher code + QR
         │
         ▼
  Shows QR at partner sari-sari store
         │
         ▼
  Store scans → consumer gets ₱5 off fresh oil
         │
         ▼
  OilTrace settles with partner monthly
```

## Points Economics

### Core Rates

| Parameter | Value | Notes |
|-----------|-------|-------|
| Points per liter | **10 pts/L** | Configurable by owner |
| Discount value per point | **₱0.50-1.00/pt** | Determined per partner |
| Minimum redemption | **10 pts** (₱5-10 discount) | Low barrier for engagement |
| Point expiry | **90 days** | Encourages regular engagement |

### Sample Economics (Owner Config Screen)

```json
{
  "points_per_liter": 10,
  "default_discount_per_point": 0.50,
  "new_user_bonus_points": 50,
  "referral_points": 25,
  "expiry_days": 90
}
```

### Profitability Breakdown per Liter

| Item | Premium (SAF) | Standard | Low (Biofuel) |
|------|--------------|----------|---------------|
| Revenue per liter | ₱40 | ₱25 | ₱15 |
| Minus: Driver commission (30%) | -₱12 | -₱7.50 | -₱4.50 |
| Minus: Logistics + container | -₱3 | -₱3 | -₱3 |
| Minus: Platform ops | -₱0.50 | -₱0.50 | -₱0.50 |
| Minus: Points (₱5 value/L) | -₱5 | -₱5 | -₱5 |
| **Net profit/L** | **₱19.50** | **₱9.00** | **₱2.00** |
| **Margin** | **49%** | **36%** | **13%** |

The system cross-subsidizes — premium oil profits cover any losses on low-grade oil. Overall blended margin: ~35%.

## Partner Store Model

### Partner Types

| Type | Example | Discount Model |
|------|---------|---------------|
| **Cooking Oil Brands** | Minola, Baguio Oil, Palm Oil | Brand provides discount budget or margin share |
| **Sari-Sari Stores** | Local neighborhood stores | OilTrace reimburses the discount amount |
| **Grocery Chains** | Puregold, SM Savemore | Partnership for in-store discounts |
| **E-wallet Partners** | GCash, Maya | Convert points to e-wallet credits (future) |

### Partner Configuration

```json
{
  "id": "uuid",
  "name": "Minola Cooking Oil",
  "logo_url": "https://...",
  "discount_per_point": 0.50,
  "min_redemption": 10,
  "max_redemption": 500,
  "description": "₱5 off per 10 points on any Minola product",
  "is_active": true,
  "settlement_terms": "Monthly, net 15"
}
```

### Settlement Flow

```
End of month:
        │
        ▼
OilTrace generates settlement report:
  Partner: Minola Oil
  Total vouchers used: 150
  Total discount value: ₱7,500
  Settlement due: ₱7,500
        │
        ▼
OilTrace pays partner (or deducts from marketing budget)
        │
        ▼
Partner continues accepting vouchers next month
```

### Why Partners Say Yes

| Reason | Explanation |
|--------|-------------|
| **New customers** | OilTrace brings karinderya owners who buy cooking oil regularly |
| **Data & insights** | Which stores, what volumes, redemption patterns |
| **CSR/ sustainability angle** | Partnering with an environmental initiative |
| **Low cost** | OilTrace handles all the tech — partner just accepts vouchers |
| **Competitive edge** | First-mover advantage in the used oil collection space |

## Database Tables

### `partners`
```sql
CREATE TABLE partners (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  brand             TEXT,
  logo_url          TEXT,
  description       TEXT,
  discount_per_point FLOAT NOT NULL DEFAULT 0.50,
  points_per_liter  INT DEFAULT 10,
  min_redemption    INT DEFAULT 10,
  max_redemption    INT,
  is_active         BOOLEAN DEFAULT true,
  settlement_terms  TEXT DEFAULT 'Monthly, net 15',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### `vouchers`
```sql
CREATE TABLE vouchers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id     UUID REFERENCES consumers(id) NOT NULL,
  partner_id      UUID REFERENCES partners(id) NOT NULL,
  points_used     INT NOT NULL,
  discount_amount FLOAT NOT NULL,
  voucher_code    TEXT UNIQUE NOT NULL,
  qr_data         TEXT,
  status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','used','expired','cancelled')),
  expires_at      TIMESTAMPTZ,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `points_ledger`
```sql
CREATE TABLE points_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_id     UUID REFERENCES consumers(id) NOT NULL,
  collection_id   UUID REFERENCES collections(id),
  points          INT NOT NULL,           -- positive earned, negative redeemed
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('earned','redeemed','expired','bonus')),
  reference       TEXT,
  balance_after   INT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

## Points Redemption API

**POST /consumers/redeem**
```json
{
  "partner_id": "uuid",
  "points_to_use": 50
}
```

**Response:**
```json
{
  "voucher_code": "OIL-MINOLA-7F3A2B",
  "discount_amount": 25.00,
  "partner_name": "Minola Oil",
  "partner_logo": "https://...",
  "expires_at": "2026-07-24T00:00:00Z",
  "qr_data": "oiltrace://voucher/OIL-MINOLA-7F3A2B"
}
```

## Consumer App Screen: Points & Partners

```
┌─────────────────────────────────┐
│  🏆 My Points                   │
│                                 │
│    ╔═══════════════════════════╗│
│    ║      240 pts              ║│
│    ║    = ₱120 value           ║│
│    ╚═══════════════════════════╝│
│                                 │
│  Earned: 300 pts │ Used: 60 pts │
│                                 │
│  ─── Available Partners ───     │
│                                 │
│  🏪 Minola Oil                  │
│  10 pts = ₱5 off               │
│  ████████████████░░░░░░ 240 pts │
│  [ Redeem Now ]                │
│                                 │
│  🏪 Baguio Oil                  │
│  10 pts = ₱10 off              │
│  [ Redeem Now ]                │
│                                 │
│  🏪 Local Sari-Sari             │
│  5 pts = ₱3 off                │
│  [ Redeem Now ]                │
│                                 │
│  ─── My Vouchers ───            │
│  OIL-MINOLA-7F3A2B             │
│  ₱25 off · Active              │
│  Expires: Jul 24, 2026         │
│  [ Show QR ]                   │
│                                 │
└─────────────────────────────────┘
```
