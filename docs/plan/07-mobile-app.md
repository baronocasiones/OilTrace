# 07 — Mobile App Structure (React Native)

## Overview

Single React Native codebase with role-based views. Uses Expo for faster development and over-the-air updates.

### Connectivity Model: Online-First
The apps assume internet connectivity. Local state is cached in AsyncStorage for fast re-renders, but all writes (requests, redemptions, location updates) require a network connection. Error states with retry buttons are shown on network failure.

```
App launch → check network
  ├── Online → fetch fresh data, update AsyncStorage cache
  └── Offline → show cached data with "You're offline" banner
                    → writes are disabled with "Connect to internet" toast
```

## Shared Components

| Component | Purpose |
|-----------|---------|
| `AuthScreen` | Phone OTP login/register |
| `MapView` | OpenStreetMap integration for routes and locations |
| `CollectionCard` | Reusable card showing TPM, grade, date, blockchain verification badge |
| `BlockchainBadge` | ✅ Verified / ⏳ Pending / ❌ Failed — with Etherscan link |
| `PointsDisplay` | Shows points balance with animated counter |
| `QRGenerator` | Generates QR code for voucher redemption |
| `NotificationBell` | Push notification indicator |
| `BottomNav` | Role-based navigation bar |

## Consumer App Screens

### Screen Flow
```
Auth → Dashboard → Request Collection → History → Points → Vouchers → Profile
```

### 1. Dashboard
```
┌─────────────────────────────┐
│  📍 Aling Maria's Karinderya │
│                             │
│  🟢 Points: 240 pts         │
│     = ₱120 discount value   │
│                             │
│  Next Collection: Tomorrow  │
│  Status: ✅ On Schedule     │
│                             │
│  ┌─────────────────────┐    │
│  │  📞 Request Pickup   │    │
│  └─────────────────────┘    │
│                             │
│  Recent:                    │
│  ┌──────────────────────┐   │
│  │ Jun 20 · 5L · TPM 18%│   │
│  │ Grade: 🟢 Premium    │   │
│  │ ✅ Blockchain Verified│  │
│  └──────────────────────┘   │
└─────────────────────────────┘
```

### 2. Request Collection
```
┌─────────────────────────────┐
│  Request Collection         │
│                             │
│  Type:                      │
│  ○ On-Demand (now)          │
│  ● Scheduled (pick date)    │
│                             │
│  📅 Date: [June 25, 2026]   │
│                             │
│  Notes:                     │
│  [May laman na yung        │
│   container ko...]          │
│                             │
│  ┌─────────────────────┐    │
│  │  📩 Send Request     │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

### 3. History
```
┌─────────────────────────────┐
│  Collection History          │
│                             │
│  ┌──────────────────────┐   │
│  │ Jun 20 · 5L          │   │
│  │ TPM: 18.3% · Premium  │   │
│  │ ✅ Verified on-chain  │   │
│  │ 🡕 View on Etherscan  │   │
│  ├──────────────────────┤   │
│  │ Jun 15 · 5L          │   │
│  │ TPM: 24.5% · Standard │   │
│  │ ✅ Verified on-chain  │   │
│  ├──────────────────────┤   │
│  │ Jun 10 · 5L          │   │
│  │ TPM: 34.1% · Low     │   │
│  │ ✅ Verified on-chain  │   │
│  └──────────────────────┘   │
└─────────────────────────────┘
```

### 4. Points & Vouchers
```
┌─────────────────────────────┐
│  🏆 My Points               │
│                             │
│  Balance: 240 pts           │
│  = ₱120 discount value      │
│                             │
│  Redeem at:                 │
│  ┌──────────────────────┐   │
│  │ 🏪 Minola Oil        │   │
│  │ 10 pts = ₱5 off      │   │
│  │ [ Redeem ]           │   │
│  ├──────────────────────┤   │
│  │ 🏪 Baguio Oil        │   │
│  │ 10 pts = ₱10 off     │   │
│  │ [ Redeem ]           │   │
│  ├──────────────────────┤   │
│  │ 🏪 Local Sari-Sari   │   │
│  │ 5 pts = ₱3 off       │   │
│  │ [ Redeem ]           │   │
│  └──────────────────────┘   │
│                             │
│  My Vouchers:               │
│  ┌──────────────────────┐   │
│  │ OIL-MINOLA-7F3A2B   │   │
│  │ ₱25 off · Active    │   │
│  │ [ Show QR ]         │   │
│  └──────────────────────┘   │
└─────────────────────────────┘
```

---

## Driver App Screens

### Screen Flow
```
Auth → Today's Route → Navigation → Record Collection → History → Earnings → Profile
```

### Real-Time Location Sharing
The driver app publishes live GPS location via Supabase Realtime whenever the app is in the foreground and the driver is on an active route.

```
App foreground + route active →
  Subscribe to Realtime channel → driver:{id}:location →
  Every 10s: publish { driver_id, lat, lng, status }
  Owner dashboard subscribes → sees live map markers
  
On pause / route complete → unsubscribe from channel
```

**Supabase Realtime Setup:**
```ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Subscribe (owner dashboard)
const channel = supabase
  .channel('driver-locations')
  .on('broadcast', { event: 'location' }, (payload) => {
    updateDriverMarker(payload)
  })
  .subscribe()

// Publish (driver app)
supabase.channel(`driver:${driverId}:location`).send({
  type: 'broadcast',
  event: 'location',
  payload: { driver_id, lat, lng, status: 'busy' }
})
```

### 1. Today's Route
```
┌─────────────────────────────┐
│  🗺️ Today's Route           │
│                             │
│  [ MAP DISPLAY ]            │
│  ┌─────────── 3 stops ────┐ │
│  │ 🟢 Stop 1: Aling Maria's │
│  │    123 Rizal St         │
│  │    ETA: 10:15 AM · 1.2km│
│  │ 🟡 Stop 2: Kuya Bob's   │
│  │    456 Mabini Ave       │
│  │    ETA: 10:30 AM · 0.8km│
│  │ 🔴 Stop 3: Jolli-Kalan  │
│  │    789 Katipunan        │
│  │    ETA: 10:50 AM · 1.5km│
│  └────────────────────────┘ │
│                             │
│  Total: 5.4 km · 35 min    │
│  [ Start Navigation ]      │
└─────────────────────────────┘
```

### 2. Record Collection
```
┌─────────────────────────────┐
│  📸 Record Collection       │
│                             │
│  Consumer: Aling Maria's    │
│  Address: 123 Rizal St      │
│                             │
│  🔵 Connect IoT Device...   │
│                             │
│  Device: OIL-ESP32-001      │
│  Status: ✅ Connected        │
│                             │
│  TPM Reading: 24.5%         │
│  Grade: 🟡 Standard         │
│  Destination: Blended       │
│                             │
│  Volume: 5.0 L              │
│                             │
│  □ Consumer confirmed       │
│                             │
│  ┌─────────────────────┐    │
│  │  ✅ Confirm & Record │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

---

## Owner App Screens

### Screen Flow
```
Auth → Dashboard → Consumers → Drivers → Collections → Analytics → Partners → Settings
```

### 1. Dashboard
```
┌─────────────────────────────┐
│  📊 OilTrace Dashboard      │
│                             │
│  ┌──────┐ ┌──────┐ ┌──────┐│
│  │45    │ │12    │ │3     ││
│  │Total │ │Active│ │Pending││
│  │Collect││Drivers││Reqs  ││
│  └──────┘ └──────┘ └──────┘│
│                             │
│  📈 Collections This Week   │
│  ████████▁▁▁▁▁▁▁▁▁▁ 8      │
│                             │
│  🟢 Premium (SAF): 45%     │
│  🟡 Standard: 35%          │
│  🔴 Low (Biofuel): 20%     │
│                             │
│  Recent Blockchain:         │
│  ✅ 0xabc... confirmed     │
│  ✅ 0xdef... confirmed     │
│  ⏳ 0x123... pending       │
└─────────────────────────────┘
```

---

## Push Notifications (Expo Notifications)

Notifications are sent via Expo Push API (backed by FCM on Android). The flow:

```
1. App launches → request notification permission
2. On grant → get Expo push token from Expo Notifications API
3. POST /api/v1/notifications/register { platform, push_token }
4. FastAPI stores token in device_tokens table
5. On trigger events:
   • Collection assigned → FastAPI sends push to driver's token
   • Collection completed → FastAPI sends push to consumer's token
6. App receives → shows notification → navigate to relevant screen

On logout → PUT /api/v1/notifications/unregister
```

**Notification Types:**
| Event | Recipient | Title | Body |
|-------|-----------|-------|------|
| New collection request | Driver pool | "New pickup!" | "Aling Maria's — 5L — 2km away" |
| Request assigned | Driver | "Assigned!" | "You're assigned to collect from Aling Maria's" |
| Collection completed | Consumer | "Oil collected! 🎉" | "5L collected. You earned 50 points!" |
| Points about to expire | Consumer | "Points expiring!" | "Your 50 points expire in 3 days" |

## Tech Stack

| Library | Purpose |
|---------|---------|
| React Native + Expo | App framework |
| @supabase/supabase-js | Auth + DB client |
| react-native-maps | Map display (OpenStreetMap) |
| react-navigation | Screen navigation |
| expo-router | File-based routing |
| expo-notifications | Push notifications |
| expo-camera | QR code scanning |
| expo-qr-code | Generate redemption QR |
| react-native-paper | UI component library |
| victory-native | Charts (owner dashboard) |
| ethers | Blockchain interaction (optional, read-only) |
