# OilTrace Mobile App — Overall State

> **Purpose**: This is the single source of truth for the app's current build state.
> Update this file whenever a feature is completed or the app's structure changes.

---

## App Overview

**Platform**: React Native + Expo  
**Target Users**: Filipino karinderya consumers & collection drivers  
**Chain**: Ethereum Sepolia  
**Last Updated**: 2026-07-02

---

## Current Status

| Phase | Status |
|-------|--------|
| 0 — Project Bootstrap | ✅ Done |
| 1 — Auth & Onboarding | 🔲 Not Started |
| 2 — Consumer Dashboard | ✅ Done |
| 3 — Driver Dashboard | 🔲 Not Started |
| 4 — IoT / Sensor Feed | 🔲 Not Started |
| 5 — Rewards & Points | 🔲 Not Started |
| 6 — Blockchain Records | 🔲 Not Started |
| 7 — Notifications | 🔲 Not Started |
| 8 — Settings & Profile | 🔲 Not Started |

**Legend**: 🔲 Not Started · 🔄 In Progress · ✅ Done

---

## Feature Registry

Each row is updated when the corresponding feature spec (`FEATURES.md`) section is completed.

| # | Feature | Status | Spec | Notes |
|---|---------|--------|------|-------|
| F-001 | Project Bootstrap (Expo + Navigation + Design System) | ✅ | [F-001](feature-plan/FEATURES.md#F-001) | — |
| F-002 | Auth — Login / Register (Consumer & Driver roles) | 🔲 | [F-002](feature-plan/FEATURES.md#F-002) | JWT from FastAPI backend |
| F-003 | Consumer Dashboard — Home Screen | ✅ | [F-003](feature-plan/FEATURES.md#F-003) | Offline first cache |
| F-004 | Collection History | 🔲 | [F-004](feature-plan/FEATURES.md#F-004) | — |
| F-005 | Points & Rewards | 🔲 | [F-005](feature-plan/FEATURES.md#F-005) | Partner store redemption |
| F-006 | Driver Dashboard — Job Queue | 🔲 | — | — |
| F-007 | Driver — Active Pickup & IoT Sensor View | 🔲 | — | ESP32 data |
| F-008 | Blockchain Record Viewer | 🔲 | — | Sepolia explorer link |
| F-009 | Push Notifications | 🔲 | — | Expo Notifications |
| F-010 | Profile & Settings | 🔲 | — | — |

---

## Architecture Snapshot

```
frontend/client/
├── app/               # Expo Router screens (file-based routing)
│   ├── (auth)/        # Login, Register, Onboarding
│   ├── (consumer)/    # Consumer tab group
│   └── (driver)/      # Driver tab group
├── components/        # Shared UI components
├── hooks/             # Custom React hooks
├── lib/               # API client, blockchain utils, constants
├── store/             # Zustand global state
├── theme/             # Design tokens (colors, typography, spacing)
└── assets/            # Images, fonts, icons
```

> ⚠️ Architecture is preliminary — update this section as the structure solidifies during F-001.

---

## API Backend

- **Base URL (local)**: `http://localhost:8000/api/v1`  
- **Auth**: Bearer JWT  
- **Docs**: `backend/` FastAPI app; see `docs/` for system design

---

## How to Update This File

1. When a feature from `FEATURES.md` is **fully implemented and tested**, change its row's status to ✅.
2. Update the **Phase Status** table at the top accordingly.
3. If the folder architecture changes significantly, update the **Architecture Snapshot**.
4. Do **not** put detailed specs here — those live in `FEATURES.md`.
