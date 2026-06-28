# 05 — Security Architecture

## Overview

OilTrace uses a defense-in-depth approach with five security layers.

```
┌──────────────────────────────────────────────────────────────────┐
│                     SECURITY LAYERS                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  L1: Supabase Auth                                               │
│  ├── Phone OTP, Email/Password, Magic Link                       │
│  ├── JWT tokens (short-lived 1hr, refresh tokens)                │
│  └── Built-in rate limiting, bot detection                       │
│                                                                  │
│  L2: FastAPI Middleware                                           │
│  ├── JWT verification on all /api/* endpoints                    │
│  ├── Role-based access control (consumer/driver/owner)           │
│  └── Rate limiting (100 req/min per user)                        │
│                                                                  │
│  L3: Database (Supabase RLS)                                     │
│  ├── Row Level Security policies on every table                  │
│  ├── Consumers see only their own data                           │
│  ├── Drivers see assigned collections only                       │
│  └── Owners have full access                                     │
│                                                                  │
│  L4: IoT Device Authentication                                   │
│  ├── Device ID + Secret → temporary session token                │
│  ├── Secrets hashed with bcrypt in database                      │
│  ├── Session token expires in 1 hour                             │
│  └── Only active devices can submit readings                     │
│                                                                  │
│  L5: Ethereum Smart Contract                                     │
│  ├── onlyOwner modifier — only FastAPI's wallet can write        │
│  ├── Anyone can read/verify (transparency)                       │
│  └── Immutable once written (tamper-proof)                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Layer Details

### L1: Supabase Auth
- **Primary method:** Phone OTP (most accessible for PH karinderya owners)
- **Fallback:** Email + password, Magic Link
- **Token lifetime:** JWT expires in 3600 seconds (1hr)
- **Refresh tokens:** Valid for 30 days, single-use
- **MFA:** Optional for owner accounts

### L2: FastAPI JWT Middleware

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client

security = HTTPBearer()

async def verify_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Verify Supabase JWT and return user claims."""
    try:
        user = supabase.auth.get_user(credentials.credentials)
        return user.user.dict()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

async def require_role(required_role: str):
    """Dependency factory for role-based access."""
    async def role_checker(user: dict = Depends(verify_jwt)) -> dict:
        user_role = user.get("user_metadata", {}).get("role")
        if user_role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {required_role} role"
            )
        return user
    return role_checker
```

### L3: Row Level Security (RLS)

Every table has RLS enabled. Example policies:

```sql
-- collections table: consumers see only their own
CREATE POLICY "consumer_own_collections" ON collections
  FOR SELECT
  USING (
    consumer_id IN (
      SELECT id FROM consumers WHERE profile_id = auth.uid()
    )
  );

-- collections table: drivers see their own collections
CREATE POLICY "driver_own_collections" ON collections
  FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM drivers WHERE profile_id = auth.uid()
    )
  );

-- collections table: owners see everything
CREATE POLICY "owner_all_collections" ON collections
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );
```

### L4: IoT Device Auth Flow

```
Device powers on
        │
        ▼
POST /api/iot/auth  { device_id, device_secret }
        │
        ▼
FastAPI:
  1. Look up device by device_id
  2. Verify device_secret (bcrypt compare)
  3. Check device is_active AND assigned to a driver
  4. Generate temporary session_token (JWT, 1hr expiry)
  5. Return token
        │
        ▼
Device stores token in memory
        │
        ▼
POST /api/iot/reading  { session_token, tpm_value, ... }
        │
        ▼
FastAPI validates session_token → processes reading
```

**Device secret storage:**
- Secret is hashed with bcrypt before storing in `iot_devices` table
- Plaintext secret is only known at device provisioning time
- If device is lost, deactivate it via owner dashboard → new secret issued

### L5: Smart Contract Security
- **onlyOwner modifier:** Only the FastAPI service wallet (stored as env var) can call `recordCollection()`
- **No user wallets:** Consumers/drivers don't need MetaMask or any crypto wallet
- **Gas paid by service:** The service wallet pays all gas fees (free on testnet)
- **Verification is free:** `getRecord()` and `verifyData()` are read-only — no gas needed

## Data Privacy

| Data | On-Chain? | Off-Chain (PostgreSQL)? | Notes |
|------|-----------|------------------------|-------|
| Consumer name | ❌ No | ✅ Yes | Only in DB, never on blockchain |
| Exact GPS | ❌ No | ✅ Yes | Full coords in DB for routing |
| Geohash location | ✅ Yes | ✅ Yes | ~1km² area, privacy-preserving |
| TPM value | ✅ Yes (×100) | ✅ Yes | On-chain for immutability |
| Grade (SAF/biofuel) | ✅ Yes | ✅ Yes | On-chain for proof |
| Driver name | ❌ No | ✅ Yes | Only UUID ref on chain |
| Volume | ✅ Yes | ✅ Yes | On-chain for audit |
| Points balance | ❌ No | ✅ Yes | Purely off-chain (can be adjusted) |
| Partner discounts | ❌ No | ✅ Yes | Business data, no blockchain needed |

### Supabase Realtime Security
Driver live location is broadcast via Supabase Realtime channels. Access control:
- **Driver sends location:** Authenticated via JWT (same Supabase Auth). Only the driver's own profile can publish to `driver:{id}:location`.
- **Owner subscribes:** JWT with `role=owner` claim required. Realtime channel enforces RLS — only owners can subscribe to all driver locations.
- **Channel name pattern:** `driver:{driver_id}:location` — prevents spoofing by other drivers.
- **Data in transit:** TLS encrypted (Supabase handles this).

## Environment Variables (Sensitive)

```bash
# Never commit these to git
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
ETHER_PRIVATE_KEY=...        # Sepolia service wallet private key
ETHER_CONTRACT_ADDRESS=...
JWT_SECRET=...
DATABASE_URL=...
```

## Rate Limiting

| Endpoint Group | Limit | Window |
|---------------|-------|--------|
| Auth (login/register) | 5 requests | 1 minute |
| IoT readings | 60 requests | 1 minute |
| All other API | 100 requests | 1 minute |
| Route optimization | 30 requests | 1 minute |
