# 14 — Risk Register & Open Questions

## Active Risk Register

| # | Risk | Probability | Impact | Mitigation |
|---|------|------------|--------|------------|
| 1 | **SIM800L 2G sunset** — Globe/Smart shutting down 2G towers in Metro Manila | Medium (1-2yr) | High — IoT devices lose connectivity | **MVP:** Use ESP32 built-in WiFi + phone hotspot for demo (SIM800L is optional). **Production:** SIM800L for unattended operation; WiFi fallback adds complexity — skip for now. |
| 2 | **TPM sensor accuracy at grade boundaries** — Sensor must sort oil into Premium (<20%), Standard (20-30%), Low (>30%) TPM. Error near boundary thresholds could misclassify oil, affecting revenue accuracy and buyer trust. Oil is collected at room temp (not 180°C+), so thermal accuracy is not a concern. | Medium | Medium — misclassified oil grades | Simulate TPM for MVP. In production: calibrate sensor against lab-tested reference oil samples; use conservative buffering at grade boundaries (e.g., flag 18-22% TPM as "manual review"); add visual inspection (color/appearance) as secondary check. |
| 3 | **Consumer adoption** — Karinderya owners don't download app | Medium | High — empty pipeline | Onboarding via SMS (no app needed to schedule pickup). Partner with sari-sari stores for signup. Use QR codes. |
| 4 | **Driver churn** — Drivers leave, IoT hardware lost | Medium | Medium | Driver deposits hardware cost (₱500). Incentive: drivers are small vehicle owners (tricycle) — flexible gig model. |

## Deferred Risks (Post-MVP / Phase 2+)

| # | Risk | Deferred To | Original Mitigation |
|---|------|-------------|-------------------|
| D1 | **Blockchain gas costs** — Ethereum Sepolia is free, but mainnet would cost $3-10 per collection | Phase 3 | Design chain-agnostic from day 1. Polygon mainnet: $0.01-0.05 per tx. Batch collections into single tx. |
| D2 | **Government delays** — DENR permits take 6+ months | Phase 2 | Start DENR application early. Pilot with LGU only in parallel (many LGUs don't enforce DENR yet). |
| D3 | **Regulatory change** — BSP classifies points as stored value | Phase 2 | Design points as partner-funded discounts (not OilTrace liability). Points never sold for cash. |

## Removed Risks

| # | Risk | Reason |
|---|------|--------|
| — | **Bank/GCash block** — Gas stations or GCash block crypto-related transactions | Removed. No real crypto payments in MVP; off-ramp is fiat only. Not relevant to current business model. |

## Resolved Decisions (Locked In)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| IoT reliability | Simple retry loop (3x, exponential backoff) | Keeps firmware simple; ESP32 SPIFFS buffer deferred |
| Mobile offline behavior | Online-first (AsyncStorage cache, writes require network) | Fastest path to MVP; offline-first adds ~1 week of dev time |
| Blockchain tx confirmation | Background poller (30s interval, checks pending tx hashes) | No external dependency; works with any RPC provider |
| Real-time driver location | Supabase Realtime (broadcast channel) | Zero additional infra; reuses existing Supabase connection |
| API versioning | `/api/v1/` prefix from day one | Prevents breaking mobile clients on future changes |
| Push notifications | Expo Notifications API (backed by FCM) | Built into Expo; no extra service needed |
| Error monitoring | Sentry (free tier) | Captures exceptions with full request context |
| Media storage (photos/avatars) | Skip for MVP | Deferred until pilot; Supabase Storage available when needed |

## Open Technical Questions

### 1. TPM Sensor — Simulate or Buy?

| Option | Pros | Cons |
|--------|------|------|
| **Simulate** (potentiometer + ESP32) | ₱0 additional cost, works immediately, good for hackathon demo | Not real data, less impressive to judges |
| **Buy SEN0515** | Real TPM readings, more impressive demo, reusable in pilot | ₱1,800 cost, ~2 week shipping from AliExpress/DFRobot |

**Recommendation:** Simulate for the hackathon. Order a SEN0515 anyway for post-hackathon calibration. The simulation can be done with a simple voltage divider that maps 0-3.3V to 0-200°C.

### 2. Hosting — Render vs Railway vs VPS?

| Option | Pros | Cons |
|--------|------|------|
| **Render Free Tier** | Simple, free, FastAPI-native | Sleeps after inactivity (30s cold start), 512MB RAM limit |
| **Railway** | Free $5 credit, less sleep issues | More complex setup, smaller free tier |
| **Self-hosted VPS (Linode/DigitalOcean $6/mo)** | Always-on, full control | Cost ($360/yr), maintenance overhead |

**Recommendation:** Render Free Tier for hackathon. If cold starts are an issue, upgrade to Render $7/mo plan. Self-host only if scaling beyond free tier limits.

### 3. Map Provider — OSM vs Google Maps?

| Option | Pros | Cons |
|--------|------|------|
| **OpenStreetMap + Leaflet** | Free, no API key needed, OSRM compatible | Less polished UI, limited geocoding |
| **Google Maps** | Beautiful, well-documented, Places API | Free tier: $200/mo credit, then pay-as-you-go. Need billing setup. |

**Recommendation:** OSM for the backend (route optimization via OSRM). React Native Maps with OSM provider for the mobile app. Switch to Google Maps if free tier credit is sufficient and you want better UX.

### 4. App Distribution — APK vs Play Store?

| Option | Pros | Cons |
|--------|------|------|
| **APK Sideload** | Free, instant distribution, no review | Users must enable "install unknown apps", harder to update |
| **Google Play** | Professional, easy updates, trusted | $25 one-time fee, ~2 day review, must meet Play Store policies |

**Recommendation:** APK sideload for hackathon judging. If piloting with real users, publish to Google Play ($25 fee).

### 5. Partner Brands — Real or Mock?

| Option | Pros | Cons |
|--------|------|------|
| **Mock partners** | Zero effort, full control, looks great in demo | Less real-world validation |
| **Reach out to real brands** | Validates business model, impressive to judges | Time investment, risk of rejection |

**Recommendation:** Mock partners (Minola, Baguio Oil, Generic Sari-Sari Store) for the hackathon. Begin brand outreach during/after the event if you win.

### 6. Expo Dev Client vs Expo Go for Testing?

| Option | Pros | Cons |
|--------|------|------|
| **Expo Go** | Instant reload, no build, easy demos | No custom native modules (e.g., Bluetooth if needed) |
| **Expo Dev Client (EAS Build)** | Full native module support | Slayer build times (~5 min), more setup |

**Recommendation:** Expo Go for hackathon (no custom native modules needed). EAS Build for pilot (needs APK/Play Store).

## Business Strategy Questions

### 7. What's the pricing model for karinderyas?

| Option | Pros | Cons |
|--------|------|------|
| **Free collection** (OilTrace profits from selling oil) | Zero friction for adoption, easiest onboarding | Need sufficient volume to be profitable |
| **Fee per collection** (₱10-20 per 5L) | Additional revenue, signals value | Friction for adoption |
| **Hybrid** (free collection + premium points) | Best of both — consumers get points, OilTrace gets oil | Complex to explain |

**Recommendation:** Free collection. Revenue comes from selling the oil to biofuel/SAF producers. Points are an incentive, not the business model.

### 8. Single-owner model or franchise?

| Option | Pros | Cons |
|--------|------|------|
| **Single company** (one OilTrace corp) | Full control, unified brand | Scalability bottleneck |
| **Franchise** (local operators per city) | Rapid expansion, local knowledge | Quality control, legal complexity |

**Recommendation:** Start single-owner. Consider franchise model after proving unit economics in 1-2 cities.

### 9. What about restaurant chains (Jollibee, McDonald's)?

| Opportunity | Challenge |
|-------------|-----------|
| Much higher volume (50-200L/month per branch) | Already have collection partners (often free) |
| Brand credibility boost | Complex corporate procurement process |
| Better oil quality (less abused) | May require formal bids and contracts |

**Recommendation:** Target karinderyas first. Approach chains only after proving the model with 100+ karinderyas. Chains will want to see track record and permits.

## Design Decisions (Locked In)

### Driver-Carried vs Karinderya-Installed
**Decision: Driver-carried.** One device serves ~20 karinderyas per route.

### Cash vs Points Only
**Decision: Points only.** Cash equivalent through partner discounts. If pilots show resistance, add cash option later.

### Data Privacy — What Goes On-Chain
**Decision: Only grade + hashed geohash on-chain.** Full consumer data stays in PostgreSQL.
