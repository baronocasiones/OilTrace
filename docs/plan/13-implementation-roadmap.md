# 13 — Implementation Roadmap (1 Month)

## Overview

4-week build schedule for the OilTrace hackathon MVP. Each week has clear deliverables. Work in parallel where possible.

---

## Week 1: Foundation

**Goal:** Project setup, authentication, database, basic API

### Day 1-2: Project Scaffolding

| Task | Owner | Details |
|------|-------|---------|
| Supabase project setup | Backend | Enable Auth (phone OTP), create all tables via SQL editor or migrations |
| FastAPI scaffold | Backend | Project structure, health check, database connection, environment variables |
| React Native scaffold | Mobile | Expo init, Supabase JS client, navigation structure |
| Hardhat project | Blockchain | `npx hardhat init`, create OilTrace.sol, deploy to Sepolia testnet |

### Day 3-4: Auth + Database

| Task | Owner | Details |
|------|-------|---------|
| Supabase Auth integration | Mobile | Phone OTP login flow, JWT handling, auto-refresh |
| All PostgreSQL tables | Backend | Run full schema (profiles, consumers, drivers, requests, collections, blockchain_records, points, partners, vouchers, iot_devices) |
| FastAPI models + CRUD | Backend | SQLAlchemy models, Pydantic schemas, basic CRUD for all entities |
| RLS policies | Backend | Row Level Security on every table |
| Basic mobile screens | Mobile | Login screen, role-based landing, profile screen |

### Day 5: Core API

| Task | Owner | Details |
|------|-------|---------|
| Collection request API | Backend | Create, list, update, assign |
| Consumer/driver/owner endpoints | Backend | Profile CRUD, dashboard data |
| Mobile: Dashboard + navigation | Mobile | Consumer and Driver home screens |

---

## Week 2: IoT + Blockchain Core

**Goal:** Working IoT device sending data, blockchain traceability operational

### Day 6-7: Hardware Assembly

| Task | Owner | Details |
|------|-------|---------|
| ESP32 + SIM800L wiring | IoT/Hardware | Connect per wiring diagram, test AT commands |
| TPM sensor I2C communication | IoT/Hardware | Read TPM values, calibrate with known samples |
| Cellular HTTP POST | IoT/Hardware | Send test JSON payload to FastAPI endpoint |
| Power management | IoT/Hardware | Deep sleep between readings, power bank integration |

### Day 8: IoT Endpoint

| Task | Owner | Details |
|------|-------|---------|
| Device auth endpoint | Backend | POST /api/iot/auth — Device ID + Secret validation |
| Reading ingestion endpoint | Backend | POST /api/iot/reading — store TPM, trigger classification |
| Full hardware test | All | ESP32 → SIM800L → FastAPI → PostgreSQL end-to-end |

### Day 9-10: Blockchain Integration

| Task | Owner | Details |
|------|-------|---------|
| FastAPI Web3.py service | Backend | Contract interaction, ABI loading, gas estimation |
| Write to Sepolia | Backend | On collection: call recordCollection(), store tx_hash in DB |
| Verification endpoint | Backend | GET /api/blockchain/verify/{id} — compare DB with on-chain data |
| Blockchain badge in mobile | Mobile | Show verification status per collection |

---

## Week 3: Mobile Apps

**Goal:** All three role-based apps functional with core features

### Day 11-13: Consumer App

| Task | Owner | Details |
|------|-------|---------|
| Dashboard screen | Mobile | Points balance, status, recent collections |
| Request collection flow | Mobile | On-demand/scheduled, notes, submit |
| History screen | Mobile | List past collections with blockchain badge |
| Collection detail screen | Mobile | TPM, grade, driver, tx hash → Etherscan link |

### Day 14-16: Driver App

| Task | Owner | Details |
|------|-------|---------|
| Route view | Mobile | Sorted stop list with addresses + distances |
| Turn-by-turn navigation | Mobile | Map with polyline, current location tracking |
| Record collection screen | Mobile | Connect IoT, view TPM reading, confirm collection |
| History + Earnings | Mobile | Past collections, earnings summary |

### Day 17: Owner App

| Task | Owner | Details |
|------|-------|---------|
| Dashboard screen | Mobile | Stats cards, recent activity feed |
| Consumer management | Mobile | List, search, view consumer detail + history |
| Driver management | Mobile | List, live locations on map, assign requests |
| Blockchain audit screen | Mobile | View all on-chain records, verify, search by tx_hash |

---

## Week 4: Polish & Demo Prep

**Goal:** Working end-to-end system ready for judging

### Day 18-20: Route Optimization

| Task | Owner | Details |
|------|-------|---------|
| OSRM integration | Backend | Format waypoints, call OSRM API, parse response |
| Route optimization endpoint | Backend | POST /api/routes/optimize |
| Driver route UI enhancements | Mobile | Stop order, ETA display, pull-to-refresh |

### Day 21-23: Integration Testing

| Task | Owner | Details |
|------|-------|---------|
| End-to-end test | All | Full flow: request → assign → route → collect → IoT → blockchain → points |
| Edge case handling | All | Failed tx, device offline, duplicate readings |
| Bug fixes | All | Based on testing results |
| Push notifications | Mobile | Notify driver of new request, consumer of collection |

### Day 24-26: UI Polish

| Task | Owner | Details |
|------|-------|---------|
| Loading states + error handling | Mobile | Spinners, error screens, retry buttons |
| Branding | Mobile | Logo, colors (OilTrace theme), app icon |
| Responsive layouts | Mobile | Tablet and phone support |
| Dark mode (optional) | Mobile | Low effort with React Native Paper |

### Day 27-30: Demo Preparation

| Task | Owner | Details |
|------|-------|---------|
| Deploy FastAPI to Render | Backend | Production URL, environment variables, CORS |
| Deploy mobile app | Mobile | Expo build for Android APK (or Expo Go) |
| Record demo video | All | Walk through all three apps, show hardware, blockchain verification |
| Prepare pitch deck | Product | Problem, solution, architecture, business model, demo, team |
| Rehearse presentation | All | 5-7 minute pitch, live demo with mock data |

---

## Detailed Day-by-Day Checklist

### Week 1

```
Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun
────┼─────┼─────┼─────┼─────┼─────┼─────
SUP │ SUP │ AUTH│ AUTH│ API │ API │ REST
FAS │ FAS │ DB  │ DB  │     │     │ or
REN │ REN │ SCRN│ SCRN│     │     │ CATCH
ACT │ ACT │     │     │     │     │ UP
```

### Week 2

```
Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun
────┼─────┼─────┼─────┼─────┼─────┼─────
IOT │ IOT │ IOT │ IOT │ BLK │ BLK │ REST
HW  │ HW  │ API │ TEST│ CHN │ CHN │ or
    │     │     │     │     │     │ CATCH
    │     │     │     │     │     │ UP
```

### Week 3

```
Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun
────┼─────┼─────┼─────┼─────┼─────┼─────
CONS│ CONS│ CONS│ DRV │ DRV │ DRV │ OWNR
    │     │     │     │     │     │
```

### Week 4

```
Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun
────┼─────┼─────┼─────┼─────┼─────┼─────
ROUT│ INT │ INT │ UI  │ UI  │ DEMO│ DEMO
E   │ GR  │ GR  │ POL │ POL │ PREP│ PITCH
    │ TST │ TST │     │     │     │
```

## Dependencies

```
Week 1 must finish before Week 3 can start (foundation for mobile)
Week 1 must finish before Week 2 can start (API needed for IoT)
Week 2 must finish before Week 3 collection screens
Week 3 must finish before Week 4 integration testing

Parallel work possible:
  - IoT hardware (Week 2) independent of mobile (Week 3)
  - Smart contract (Week 2) independent of mobile (Week 3)
  - Owner app (Day 17) independent of consumer/driver (earlier days)
```
