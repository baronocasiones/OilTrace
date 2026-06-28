# 12 — Cost Breakdown (Philippine Peso ₱)

**Exchange rate used:** 1 USD ≈ ₱61.00 (June 2026)
**Source:** Local PH prices from Shopee, Lazada, Carousell, Deeco Electronics

## 1. Hardware Costs (Per IoT Device)

| Component | Source (PH) | PHP Cost | USD Est. |
|-----------|-------------|----------|----------|
| ESP32 Dev Board (30-pin) | Shopee / Lazada | ₱270 - ₱350 | ~$5 |
| SIM800L GSM Module + antenna | Shopee / Lazada | ₱150 - ₱300 | ~$4 |
| TPM Sensor (DFRobot SEN0515) | AliExpress / DFRobot | ₱1,500 - ₱2,000 | ~$28 |
| Power Bank 10,000mAh | Shopee / Lazada (Xiaomi/Baseus) | ₱650 - ₱999 | ~$13 |
| Globe/Smart Prepaid SIM | Globe/Smart store (one-time) | ₱50 | ~$1 |
| Project Enclosure (waterproof) | Shopee / Deeco | ₱150 - ₱300 | ~$3 |
| Dupont wires + breadboard | Shopee / Deeco | ₱50 - ₱100 | ~$1 |
| **Subtotal per device** | | **₱2,820 - ₱4,099** | **~$46-67** |

### Cost by Scenario

| Scenario | Includes | PHP Total |
|----------|----------|-----------|
| **🥇 Full hardware** | ESP32 + SIM800L + TPM sensor + Power Bank + enclosure | **~₱3,400** |
| **🥈 Simulated sensor** | ESP32 + SIM800L + Power Bank (simulate TPM via potentiometer) | **~₱1,600** |
| **🥉 Software-only** | No hardware — mock IoT via API | **₱0** |

## 2. Infrastructure Costs (Monthly)

| Service | Plan | PHP Cost | Notes |
|---------|------|----------|-------|
| Supabase | Free tier | **₱0** | 500MB DB, 50K rows, 2GB storage |
| Render (FastAPI hosting) | Free tier | **₱0** | 512MB RAM, sleeps after inactivity |
| Ethereum Sepolia Testnet | Testnet faucet | **₱0** | Free ETH for development |
| OSRM Routing | Public demo server | **₱0** | Rate-limited but fine for MVP |
| Globe/Smart Data (IoT SIM) | Prepaid promo | **₱99 - ₱149/mo** | GoEXTRA99/ PowerAll99 |
| Domain name (optional) | .com | **₱0 - ₱550/yr** | Skip for MVP |
| **Subtotal per month** | | **₱99 - ₱149/mo** | |

## 3. Government Compliance Costs (One-Time)

| Phase | Requirement | PHP Cost |
|-------|-------------|----------|
| **Phase 2** | DTI Business Name Registration | ₱500 - ₱2,000 |
| | BIR Tax Registration (COR) | ₱0 - ₱500 |
| | LGU Mayor's Permit | ₱2,000 - ₱10,000 |
| | DENR Hazardous Waste Generator ID | ₱0 - ₱2,000 |
| | LGU Accreditation as Collector | ₱500 - ₱2,000 |
| | NPC Data Privacy Registration | ₱0 - ₱2,000 |
| | **Total Phase 2** | **₱3,000 - ₱18,500** |
| **Phase 3** | DENR Transport Permit | ₱5,000 - ₱15,000 |
| | DTI Sales Promotion (if needed) | ₱5,000 - ₱10,000 |
| | **Total Phase 3** | **₱10,000 - ₱25,000** |

## 4. Development Tools (₱0 — All Free)

| Tool | Cost |
|------|------|
| VS Code | Free |
| Arduino IDE | Free |
| React Native + Expo | Free |
| Hardhat / Foundry (Solidity) | Free |
| FastAPI (Python) | Free |
| Git + GitHub (private repos) | Free |
| OpenStreetMap | Free |
| Postman / Insomnia (API testing) | Free |

## 5. Complete Startup Cost Summary

### Starting from Scratch (1 Device + 1 Month)

| Item | PHP |
|------|-----|
| 1x IoT Device (full hardware) | ~₱3,400 |
| 1x Prepaid SIM (one-time) | ~₱50 |
| 1st Month IoT Data (GoEXTRA99) | ~₱99 |
| FastAPI hosting (free tier) | ₱0 |
| Supabase (free tier) | ₱0 |
| Sepolia testnet | ₱0 |
| **Total MVP Startup** | **~₱3,550** |

### With Government Permits (Phase 2)

| Item | PHP |
|------|-----|
| MVP Startup (above) | ~₱3,550 |
| DTI + BIR + LGU + DENR + NPC | ~₱10,000 |
| **Total Pilot Launch** | **~₱13,550** |

### Per-Device Add-on

Each additional IoT device: **~₱3,400**
Each additional SIM data/month: **~₱100**

## 6. Cost Comparison Table

| Item | USD | PHP (₱61/USD) |
|------|-----|----------------|
| ESP32 | $4.50 | ₱275 |
| SIM800L | $3.00 | ₱183 |
| TPM Sensor | $28.00 | ₱1,708 |
| Power Bank | $12.00 | ₱732 |
| Enclosure + wiring | $4.00 | ₱244 |
| SIM Card | $0.80 | ₱50 |
| Monthly data | $1.60 | ₱100 |
| Supabase (free tier) | $0 | ₱0 |
| Render (free tier) | $0 | ₱0 |
| Sepolia testnet | $0 | ₱0 |
| **1 device + 1 month** | **~$55** | **~₱3,355** |

## 7. Budget Recommendations

| For | Go With | PHP Budget |
|-----|---------|-----------|
| **Hackathon demo** | Simulated sensor + 1 ESP32 | ~₱1,500 |
| **Pilot test (5 karinderyas)** | 1 real device + SIM | ~₱3,500 |
| **Full pilot + permits** | 1 device + permits | ~₱13,500 |
| **Scale (10 devices)** | 10 devices + 10 SIMs | ~₱35,000 |
