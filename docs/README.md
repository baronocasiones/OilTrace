# OilTrace — Complete System Plan

> Used cooking oil collection + traceability + grading for SAF/biofuel + points-based loyalty for Philippine karinderyas.

## 📑 Sections

| # | File | Description |
|---|------|-------------|
| 01 | [System Architecture](plan/01-system-architecture.md) | High-level architecture, tech stack, data flow diagrams |
| 02 | [Database Schema](plan/02-database-schema.md) | All PostgreSQL tables, relationships, RLS policies |
| 03 | [Smart Contract](plan/03-smart-contract.md) | Solidity contract on Ethereum Sepolia testnet |
| 04 | [API Endpoints](plan/04-api-endpoints.md) | FastAPI route design for mobile, IoT, and admin |
| 05 | [Security Architecture](plan/05-security.md) | Auth, RLS, IoT auth, blockchain security |
| 06 | [Hardware Design](plan/06-hardware-design.md) | ESP32 + SIM800L + TPM sensor wiring and firmware |
| 07 | [Mobile App Structure](plan/07-mobile-app.md) | React Native app screens per user role |
| 08 | [Route Optimization](plan/08-route-optimization.md) | OSRM-based driver routing |
| 09 | [TPM Classification Engine](plan/09-tpm-classification.md) | SAF vs biofuel grading logic |
| 10 | [Points System & Partner Model](plan/10-points-system.md) | Loyalty points economics and partner store model |
| 11 | [Government Compliance](plan/11-government-compliance.md) | DENR, DTI, BIR, LGU, NPC requirements per phase |
| 12 | [Cost Breakdown (PHP)](plan/12-cost-breakdown.md) | Hardware, infrastructure, and permitting costs |
| 13 | [Implementation Roadmap](plan/13-implementation-roadmap.md) | 4-week build schedule |
| 14 | [Risks & Open Questions](plan/14-risks-questions.md) | Risk register and final decisions needed |
| — | [Test Suite](test.md) | How to run, fixture architecture, coverage details |

## 🏆 Locked-In Tech Stack

| Layer | Technology |
|-------|-----------|
| IoT MCU | ESP32 |
| IoT Cellular | SIM800L (2G) |
| TPM Sensor | DFRobot SEN0515 or Simulated |
| Backend | FastAPI (Python) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (phone OTP) |
| Blockchain | Ethereum Sepolia Testnet |
| Smart Contract | Solidity via Hardhat |
| Routing | OSRM |
| Mobile | React Native + Expo |
| Maps | OpenStreetMap |

## 💰 At a Glance

- **Hardware per device:** ~₱3,400
- **Monthly infra:** ~₱150 (SIM data only)
- **Total startup:** ~₱3,550 (1 device + 1 month)
- **Business model:** Sell high-grade oil for SAF, low-grade for biofuel. Reward consumers with points redeemable at partner stores.
