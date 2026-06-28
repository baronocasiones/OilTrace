# 04 — API Endpoints (FastAPI)

## Base URL

```
Development: http://localhost:8000/api/v1
Production:  https://oiltrace.onrender.com/api/v1
```

## Authentication

- **Mobile APIs:** Bearer JWT token from Supabase Auth (`Authorization: Bearer <token>`)
- **IoT APIs:** Device ID + Secret for initial auth, then session token for readings
- **Owner APIs:** JWT with `role=owner` claim

---

## Mobile APIs

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | None | Register user via Supabase Auth (phone/email/OTP) |
| POST | `/auth/login` | None | Login via Supabase |
| GET | `/auth/profile` | JWT | Get current user's profile |

**POST /auth/register**
```json
{
  "phone": "+639123456789",
  "password": "temporary-password",
  "role": "consumer",
  "full_name": "Maria Santos"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "...",
  "user": { "id": "uuid", "phone": "+639123456789", "role": "consumer" }
}
```

### Consumer Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/consumers/me` | Get consumer profile + stats |
| PUT | `/consumers/me` | Update consumer profile |
| GET | `/consumers/me/dashboard` | Dashboard (pending requests, points balance, next scheduled) |
| POST | `/consumers/requests` | Create a new collection request |
| GET | `/consumers/requests` | List consumer's collection requests |
| GET | `/consumers/requests/{id}` | Get single request details |
| GET | `/consumers/history` | Collection history with blockchain verification |
| GET | `/consumers/history/{id}` | Single collection detail |
| GET | `/consumers/points` | Points balance + transaction history |
| GET | `/consumers/partners` | Available partner discounts |
| POST | `/consumers/redeem` | Redeem points for a voucher |
| GET | `/consumers/vouchers` | List generated vouchers |
| GET | `/consumers/vouchers/{id}` | Single voucher detail (QR code data) |

**POST /consumers/requests**
```json
{
  "request_type": "on_demand",
  "notes": "May laman na yung container ko"
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "pending",
  "request_type": "on_demand",
  "requested_at": "2026-06-24T10:00:00Z"
}
```

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
  "qr_data": "oiltrace://voucher/OIL-MINOLA-7F3A2B",
  "expires_at": "2026-07-01T00:00:00Z"
}
```

### Driver Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/drivers/me` | Get driver profile |
| PUT | `/drivers/me` | Update driver profile |
| PUT | `/drivers/me/location` | Update current GPS location |
| GET | `/drivers/route` | Get optimized collection route |
| GET | `/drivers/requests` | Get assigned collection requests |
| PUT | `/drivers/requests/{id}/status` | Update request status (accept/start/complete) |
| POST | `/drivers/collect` | Record a collection (manual — without IoT) |
| GET | `/drivers/history` | Collection history |
| GET | `/drivers/earnings` | Earnings summary |

**GET /drivers/route?pending_only=true**
```json
{
  "route": [
    {
      "stop": 1,
      "request_id": "uuid",
      "consumer_name": "Aling Maria's Karinderya",
      "address": "123 Rizal St, Barangay 5",
      "latitude": 14.5832,
      "longitude": 121.0409,
      "estimated_arrival": "10:15 AM",
      "distance_from_prev": 1.2
    },
    {
      "stop": 2,
      "request_id": "uuid",
      "consumer_name": "Kuya Bob's Eatery",
      "address": "456 Mabini Ave",
      "latitude": 14.5901,
      "longitude": 121.0450,
      "estimated_arrival": "10:30 AM",
      "distance_from_prev": 0.8
    }
  ],
  "total_distance_km": 5.4,
  "total_duration_min": 35
}
```

### Owner Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/owners/dashboard` | System overview (stats, chart data) |
| GET | `/owners/consumers` | List all consumers |
| GET | `/owners/consumers/{id}` | Single consumer detail + history |
| GET | `/owners/drivers` | List all drivers with live locations |
| GET | `/owners/drivers/{id}` | Single driver detail |
| POST | `/owners/drivers` | Register a new driver |
| GET | `/owners/requests` | All collection requests (filter by status) |
| PUT | `/owners/requests/{id}/assign` | Assign a driver to a request |
| GET | `/owners/collections` | All completed collections |
| GET | `/owners/blockchain/audit` | Full blockchain audit log |
| GET | `/owners/analytics` | TPM trends, volume by grade, points usage |
| GET | `/owners/partners` | Manage partner stores |
| POST | `/owners/partners` | Add new partner |
| PUT | `/owners/partners/{id}` | Update partner configuration |
| PUT | `/owners/settings/points` | Configure points-per-liter rate |

---

## IoT APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/iot/auth` | DeviceID + Secret | Authenticate device, get session token |
| POST | `/iot/reading` | Session Token | Submit TPM reading |
| GET | `/iot/status` | Session Token | Check device status |

**POST /iot/auth**
```json
{
  "device_id": "OIL-ESP32-001",
  "device_secret": "secret123"
}
```

**Response:**
```json
{
  "session_token": "tmp_eyJ...",
  "expires_in": 3600,
  "assigned_driver": "Driver Name"
}
```

**POST /iot/reading**
```json
{
  "session_token": "tmp_eyJ...",
  "tpm_value": 24.5,
  "consumer_ref": "consumer-uuid",
  "latitude": 14.5832,
  "longitude": 121.0409,
  "collected_at": "2026-06-24T10:30:00Z"
}
```

**Response:**
```json
{
  "status": "success",
  "collection_id": "uuid",
  "grade": "standard",
  "destination": "blended",
  "blockchain_tx_hash": "0xabc...",
  "blockchain_status": "pending",
  "points_awarded": 50
}
```

---

## Blockchain APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/blockchain/verify/{collection_id}` | JWT | Verify collection data against smart contract |
| GET | `/blockchain/status/{tx_hash}` | JWT | Check blockchain transaction status |
| GET | `/blockchain/contract` | None | Get contract address + ABI (public) |

**GET /blockchain/verify/{collection_id}**
```json
{
  "collection_id": "uuid",
  "verified": true,
  "on_chain_record": {
    "consumerRef": "uuid",
    "tpmValue": 2450,
    "grade": 1,
    "volumeMl": 5000,
    "timestamp": 1719218400,
    "locationHash": "wdw3q2",
    "driverRef": "uuid",
    "dataIntegrity": "0xabc..."
  },
  "off_chain_hash": "0xabc...",
  "hash_match": true,
  "tx_hash": "0xabc...",
  "block_number": 12345678
}
```

---

## Notification APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/notifications/register` | JWT | Register device push token for push notifications |
| PUT | `/notifications/unregister` | JWT | Remove device push token (logout) |

**POST /notifications/register**
```json
{
  "platform": "android",
  "push_token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

**Response:**
```json
{
  "status": "registered",
  "token_id": "uuid"
}
```

---

## Blockchain Admin APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/blockchain/poller/status` | Owner JWT | Check background poller health + pending queue |

**GET /blockchain/poller/status**
```json
{
  "poller_running": true,
  "pending_count": 3,
  "last_checked_at": "2026-06-24T10:05:00Z",
  "last_confirmed_tx": "0xabc...",
  "failed_last_hour": 0
}
```

---

## Route APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/routes/optimize` | JWT | Get optimized multi-stop route |

**POST /routes/optimize**
```json
{
  "origin_lat": 14.5800,
  "origin_lng": 121.0400,
  "stops": [
    { "lat": 14.5832, "lng": 121.0409, "id": "request-1" },
    { "lat": 14.5901, "lng": 121.0450, "id": "request-2" },
    { "lat": 14.5750, "lng": 121.0350, "id": "request-3" }
  ]
}
```

**Response:**
```json
{
  "waypoints": [
    { "id": "request-2", "order": 1, "eta_min": 8 },
    { "id": "request-1", "order": 2, "eta_min": 15 },
    { "id": "request-3", "order": 3, "eta_min": 22 }
  ],
  "total_distance_km": 6.2,
  "total_duration_min": 22,
  "polyline": "encoded_polyline_string..."
}
```

---

## Error Response Format

All errors follow a consistent format:

```json
{
  "detail": {
    "code": "NOT_FOUND",
    "message": "Collection request not found",
    "status_code": 404
  }
}
```

Common HTTP status codes:
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid JWT) |
| 403 | Forbidden (wrong role) |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Internal Server Error |
