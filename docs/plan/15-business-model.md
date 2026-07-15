# 15 — Business Model: UCO Aggregator

## Overview

OilTrace operates as a **Used Cooking Oil (UCO) Aggregator** — not a competitor to large collectors and biodiesel producers, but a partner that feeds them volume they can't economically reach.

**The problem:** Large collectors (Chemrez, RMC, Kobkiat) use trucks and target mid-to-large restaurants. Karinderyas produce 3-10L per week — too small for truck-based logistics. As a result, >95% of QC's ~8,000-12,000 karinderyas are unserved by formal collection. Their oil either goes down the drain or to informal collectors who re-refine it into counterfeit cooking oil (a documented health risk).

**OilTrace's solution:** Use ebikes to collect from high-density karinderya clusters, grade oil via IoT sensor, record on blockchain, and sell the aggregated volume to industrial buyers. Karinderyas earn points redeemable at partner stores (not cash — this is what makes the unit economics work).

## Core Value Chain

```
Karinderyas (3-10L each)
        │
        ▼
  OilTrace ebike route (~75L/route)
        │
        ├── IoT sensor grades oil (Premium/Standard/Low)
        ├── Blockchain records grade + hashed location
        ├── Points credited to karinderya wallet
        │
        ▼
  Aggregation point
        │
        ▼
  Sold to buyer (Chemrez, RMC, Kobkiat, etc.)
        │
        ▼
  Buyer processes into biodiesel / SAF
```

## The Karinderya Gap: Why Competitors Can't Serve This Market

| Competitor | Target Customers | Collection Method | Can they do karinderyas? |
|------------|-----------------|-------------------|--------------------------|
| **Chemrez Technologies** (D&L Industries) | Industrial buyer — buys from aggregators, doesn't collect directly | Buys processed UCO in bulk | ❌ No direct collection at all |
| **RMC Oil & Ecosolutions** | Mid-large restaurants, fast food chains | Trucks, minimum volume required | ⚠️ Starting to try, but truck costs too high for 5L stops |
| **Kobkiat Commodity** | Export-oriented, industrial food processors | Trucks, export-grade volume | ❌ No |
| **Informal collectors** | Karinderyas (cash only) | Manual, no tech, no compliance | ✅ Yes — but oil often re-enters food supply |

**Key insight:** The informal collector is the real competition at the karinderya level, not the formal companies. Informal collectors pay ₱15-30/kg cash. OilTrace competes not on price (points are less liquid than cash) but on **convenience + legitimacy + health safety**.

## Revenue Model

OilTrace earns by selling aggregated, sensor-graded, blockchain-verified UCO to industrial buyers. Three models are documented below for team discussion.

### Model A: Fixed Margin per Liter

OilTrace negotiates prices with buyers, keeps a fixed margin per liter, and passes the rest to operations.

**Example (₱5/L margin):**

| Grade | Buyer price | OilTrace keeps | Goes to ops |
|-------|------------|---------------|-------------|
| Premium (15L @ ₱40/L) | ₱600 | ₱75 | ₱525 |
| Standard (30L @ ₱25/L) | ₱750 | ₱150 | ₱600 |
| Low (30L @ ₱15/L) | ₱450 | ₱150 | ₱300 |
| **Per route (75L)** | **₱1,800** | **₱375** | **₱1,425** |

**Pros:** Simple to communicate, predictable margins, easy to negotiate with buyers.
**Cons:** Fixed margin doesn't scale with oil price increases.

### Model B: Percentage Margin ✅ (Team Decision)

OilTrace keeps a fixed percentage (e.g., 15%) of the sale price.

**Example (15% margin):**

| Item | Amount |
|------|--------|
| Revenue per route | ₱1,800 |
| OilTrace keeps (15%) | ₱270 |
| To operations | ₱1,530 |

**Pros:** Scales with oil prices, aligned incentives with buyer.
**Cons:** Less predictable, harder to explain.

**✅ Decision (Jul 2026):** Team selected this model. The 15% margin scales naturally with oil prices and aligns OilTrace's incentives with buyers.

### Model C: Subscription + Volume Fee

Buyers pay a monthly subscription for guaranteed access to verified UCO supply, plus a per-liter volume fee.

**Example:**

| Component | Monthly (20 routes) |
|-----------|-------------------|
| Subscription fee | ₱15,000 |
| Volume fee (1,500L × ₱2/L) | ₱3,000 |
| **Total** | **₱18,000** |

**Pros:** Recurring baseline revenue, buyer has incentive to take maximum volume.
**Cons:** Harder to sell to buyers initially (commitment required), more complex negotiation.

## Karinderya Incentive: Points System

Karinderyas earn **points** (not cash) for each liter of oil collected. Points are redeemed as **percentage-based discounts** at partner stores. Critically, points are **partner-funded** — the partner absorbs the discount as a customer acquisition cost. OilTrace has zero cash liability for points.

For detailed points system mechanics (database schema, API, settlement flow), see **[10-points-system.md](./10-points-system.md)**. Note: this doc was written before the partner-funded model was finalized — some details (e.g., OilTrace settling with partners) may differ from the final model below.

### Points Tiers (For Team Decision)

| Tier | Points per Liter | Discount at Partner | Value to Karinderya | Partner Likely to Accept? |
|------|-----------------|--------------------|--------------------|--------------------------|
| Conservative | 10 pts/L | 5% off (e.g., ₱25 on ₱500) | ~₱5/L equivalent | ✅ Yes, easily |
| **✅ Chosen** | **20 pts/L** | **10% off (e.g., ₱50 on ₱500)** | **~₱10/L equivalent** | **✅ Yes — standard promo rate** |
| Aggressive | 30 pts/L | 15% off (e.g., ₱75 on ₱500) | ~₱15/L equivalent | ⚠️ Some partners will, some won't |

**✅ Decision (Jul 2026):** 20 pts/L (10% off). Standard retail promo that partners already budget for. If adoption is slow in high-volume corridors, bump to 30 pts/L — OilTrace's profit is the same either way since partners fund the discount.

**Why points instead of cash?**

| Metric | Cash to Karinderya | Points to Karinderya |
|--------|-------------------|---------------------|
| Cost to OilTrace per route | ₱1,500 (at ₱20/L) | **₱0** (partner-funded) |
| Driver + ebike cost per route | ₱610 | ₱610 |
| **Net per route** | **-₱310** | **+₱1,190** |
| **Monthly net (20 routes)** | **-₱6,200** | **+₱23,800** |

The business **performs best** with the points model, but a viable cash-based backup exists — see next section.

## Backup Plan — Without Partner Funding

### Why a Backup Is Needed

The primary model relies on **partner-funded points** — partners absorb the discount as a marketing cost, OilTrace pays nothing. This generates ~₱1,190/route profit. However, at the startup/hackathon phase, partnerships may not yet be secured. Judges will question this dependency. A viable backup plan demonstrates that the business is not fragile.

### Honest Assessment: What Works and What Doesn't

Before choosing a backup, it's worth being clear about which levers are backed by real data and which are speculative.

| Lever | Data confidence | Why |
|-------|----------------|-----|
| **C — Route density (100L)** | ✅ **High** | Cargo ebikes in PH have 200kg+ payload (research confirmed). QC target barangays are dense. Food delivery ebikes operate 30-50km/day — a 20-stop route fits easily. |
| **A — Buyer premium (5%)** | ⚠️ **Medium** | Global research confirms blockchain traceability is growing in demand. But PH commodity buyers (Chemrez) buy UCO as bulk feedstock — 10-15% premium is optimistic. 5% is defensible if you can show auditable chain-of-custody. |
| **B — Cash payout (₱15/L)** | ⚠️ **Medium** | Informal collectors pay ₱15-30/kg. ₱15/L is at the floor. Karinderyas will accept it paired with scheduled pickup + legitimacy, but ₱12/L is too low to compete. |
| **F — Differentiated cash by grade** | ⚠️ **Medium** | Paying different rates per grade makes economic sense — but needs clear communication to karinderyas. |
| **D — Grade-optimized corridors** | ❌ **Low** | No PH-specific TPM data exists anywhere. The entire grade estimate (20/40/40) is extrapolated from Indian/Singaporean street food. Trying to identify "lighter frying" corridors without actual TPM measurements is a guess. |
| **E — First-party points** | ⚠️ **Weaker than modeled** | "First-party points" mean OilTrace issues its own points — but what do karinderyas redeem them for? Without partner stores, options are: (a) deferred cash payout later (saves nothing), (b) OilTrace buys goods in bulk to resell (adds complexity), or (c) stackable points that future partners honor later. None of these save ₱13-18/L the way the original model assumed. |

**Key takeaway:** The strongest levers are **C (route density)** and a conservative **A (5% buyer premium)**. Everything else has significant caveats.

### The Levers (Revised)

| Lever | Code | Realistic Impact | Data Basis |
|-------|------|-----------------|------------|
| **Route density** | C | +₱600/route (100L instead of 75L, same driver cost) | Cargo ebike payload + QC density confirmed |
| **Buyer premium (conservative)** | A | +₱120-180/route (5% premium, not 10-15%) | Global traceability demand exists but PH commodity market is price-sensitive |
| **Cash payout (floor rate)** | B | ₱15/L to all grades. Saves ₱375/route vs ₱20/L | At the low end of informal ₱15-30/kg range |
| **Differentiated cash by grade** | F | ₱15/L Premium, ₱12/L Standard, ₱8/L Low. Total ₱1,100/route vs ₱2,000 at flat ₱20/L | Matches cash outlay to buyer value per grade |
| **First-party points** | E | ₱5-8/L effective cost (not ₱1-2/L) — points need real redemption value | Without external partners, you're effectively running delayed cash or a bulk-purchase program |

### Backup Options (Revised for Honesty)

| Option | Levers | Revenue | Cash to karinderya | Other costs | Net/route | Verdict |
|--------|--------|---------|-------------------|-------------|-----------|---------|
| **C + B** | 100L + ₱15/L flat cash | ₱2,400 (no premium) | ₱1,500 | ₱610 | **₱290** | Positive but thin. ₱2.90/L margin. One bad route and it's gone. |
| **C + B + A** | +5% buyer premium | ₱2,520 | ₱1,500 | ₱610 | **₱410** | Modest but safer. ₱4.10/L buffer. |
| **C + F + A** | 100L + differentiated cash (₱15/₱12/₱8) + 5% premium | ₱2,520 | ₱1,100 | ₱610 | **₱810** | Healthiest margin. Pays less for Low-grade (which has least buyer value). Risks losing Low-grade karinderyas to informal collectors. |

### Recommended Backup: C + F + A (Route Density + Differentiated Cash + 5% Buyer Premium)

**Why this one:**

| Reason | Data backing |
|--------|-------------|
| **Route density** is the most certain lever | Cargo ebikes confirmed at 200kg+ payload. QC density supports 20-stop routes. |
| **Differentiated cash** matches payout to actual oil value | Low-grade oil sells for ₱15/L to buyers — paying ₱8/L for it leaves margin. Premium oil sells for ₱40/L — paying ₱15/L for it still leaves ₱25/L. |
| **5% buyer premium** is conservative enough to be believable | Blockchain traceability is a real global trend, but PH buyers won't pay 10-15% for it at this stage. |
| **No reliance on grade-optimized corridors** | We have zero PH TPM data. This plan works with the 20/40/40 estimate as-is. |

**The numbers:**

| | Volume | Buyer price (+5%) | Cash to karinderya | OilTrace margin/L |
|---|---|---|---|---|
| Premium | 20L | ₱840 (₱42/L) | ₱300 (₱15/L) | ₱27/L |
| Standard | 40L | ₱1,050 (₱26.25/L) | ₱480 (₱12/L) | ₱14.25/L |
| Low | 40L | ₱630 (₱15.75/L) | ₱320 (₱8/L) | ₱7.75/L |
| **Total** | **100L** | **₱2,520** | **₱1,100** | **₱810 net (₱610 driver+ebike deducted)** |

**The risk:** Paying ₱8/L for Low-grade oil may drive those karinderyas to informal collectors (₱15-30/kg). Mitigation: emphasize free scheduled pickup + legitimacy of proper disposal. If Low-grade karinderyas churn, Standard and Premium still subsidize the route.

**The backup pitch (honest version):**

> "Our primary model uses partner-funded points at ₱0 cost to us — that's the main engine at ₱1,190/route. But if partnerships take longer to secure, our cash-based backup uses three things we can control: higher route density per ebike, cash payouts that match each grade's actual buyer value, and a modest premium for blockchain traceability. It's thinner — ₱810/route instead of ₱1,190 — but it doesn't depend on anyone else's sign-off."

### What This Means for Your Pitch to Judges

The honest answer to "what if you don't get partners?" is:

- **The backup works**, but margins are thinner than the primary model
- **It's not a magic bullet** — it's operational discipline (route density + smart payout structure)
- **It buys time** — enough to operate while signing the partnerships that unlock the full ₱1,190/route
- **The worst case is ₱410/route** (flat ₱15/L cash + 5% premium + 100L density), which still covers costs and keeps the business alive

## Per-Route Economics

### Route Definition

A **route** = one driver + one ebike completing a full collection cycle:

| Parameter | Value |
|-----------|-------|
| Stops per route | 15 karinderyas |
| Volume per stop | 5L average (range 3-10L) |
| Total volume | ~75L |
| Duration | ~3-4 hours |
| Distance | ~15-25 km (within 1-2 barangays) |
| Routes per day per driver | 1-2 (morning + afternoon) |

### Estimated Grade Mix

Based on research of analogous contexts (India, Singapore, Indonesia — no PH-specific TPM study exists):

| Grade | TPM Range | % of Volume | Est. Revenue/L |
|-------|-----------|-------------|---------------|
| Premium (→ SAF) | < 20% | ~20% | ₱35-40/L |
| Standard (→ blended) | 20-30% | ~40% | ₱20-25/L |
| Low (→ biofuel) | > 30% | ~40% | ₱12-15/L |

**Note:** These are estimates. PH-specific TPM data for karinderyas is a critical data gap. The Premium fraction may be smaller if coconut oil (which degrades faster) is the dominant frying medium.

### Unit Economics

| Line Item | Per Route | Per Month (20 routes) |
|-----------|-----------|----------------------|
| **Revenue** | | |
| Premium (15L × ₱40) | ₱600 | ₱12,000 |
| Standard (30L × ₱25) | ₱750 | ₱15,000 |
| Low (30L × ₱15) | ₱450 | ₱9,000 |
| **Total Revenue** | **₱1,800** | **₱36,000** |
| | | |
| **Costs** | | |
| Driver pay | (₱500) | (₱10,000) |
| Ebike amortization (₱60k bike / 2yr) | (₱80) | (₱1,600) |
| Ebike charging + maintenance | (₱30) | (₱600) |
| **Total Cash Costs** | **(₱610)** | **(₱12,200)** |
| | | |
| **Karinderya payment (points)** | **₱0** (partner-funded) | **₱0** |
| | | |
| **Net Margin (points model)** | **₱1,190** | **₱23,800** |
| **Net Margin (if cash paid at ₱20/L)** | **-₱310** | **-₱6,200** |

### Margin Levers

| Lever | Impact | Notes |
|-------|--------|-------|
| Higher route density | +₱ per route | 100L/route (20 stops) increases revenue without increasing driver cost much |
| Two routes/day per driver | 2× routes | Same ebike, same driver, double volume |
| Restaurant stops on route | +₱ per stop | 20-50L per restaurant stop — high margin |
| Premium-heavy corridor | +₱ per liter | Target areas where karinderyas do lighter frying |
| Lower driver cost | -₱ variable | Start with gig model, optimize route density |

## Target Market: Quezon City High-Density Corridors

### Initial Target Areas (QC)

High-density karinderya clusters with narrow streets unsuitable for trucks:

| Area | Why OilTrace fits |
|------|------------------|
| **Cubao** (Araneta Center, surrounding barangays) | High foot traffic, dense karinderya clusters, narrow side streets |
| **Project 2 & 3** (Kamuning, Roxas District) | Residential + commercial mix, many karinderyas |
| **Tandang Sora / Commonwealth** (barangay roads, not the highway) | Dense population, university belt |
| **San Juan / Greenhills edge** | Mixed karinderya + small restaurant density |

### Expansion: Unserved Restaurants

If a mid-size restaurant along a collection route is not already served by a competitor, include them. Even 1-2 restaurant stops per route (20-50L each) significantly improve per-route economics without adding much transit time.

## Driver Model

**✅ Decision (Jul 2026):** Team selected **Option B — Salary + Bonus**.

### Option A: Gig / Commission-Based

| Detail | Value |
|--------|-------|
| Pay structure | ₱400-600 per completed route |
| Routes per day | 1-2 (driver chooses) |
| Benefits | None (independent contractor) |
| Ebike provided by | OilTrace |
| Best for | Testing, flexibility, low fixed cost |

### Option B: Salary + Bonus

| Detail | Value |
|--------|-------|
| Base pay | ₱500-800/day |
| Bonus | ₱1-2/L collected |
| Benefits | SSS, PhilHealth (if formal employee) |
| Ebike provided by | OilTrace |
| Best for | Service quality, retention, accountability |

### Rationale

Salary + bonus provides predictable service quality and driver retention from the start. The daily base (₱500-800) covers QC living costs, while the per-liter bonus (₱1-2/L) incentivizes thorough collection and route efficiency. This model is better suited for building long-term karinderya relationships compared to gig-based routes.

## Buyer Partnership Strategy

### Target Buyers

| Buyer | Why They Need OilTrace | Status |
|-------|----------------------|--------|
| **Chemrez Technologies** (D&L Industries) | Operates PH's largest continuous-process biodiesel plant in QC. Needs steady UCO feedstock. Currently buys from intermediaries. | **Ideal first partner** — in QC, needs volume, industrial buyer |
| **RMC Oil & Ecosolutions** | Already DENR-accredited in QC. Has truck-based collection. Can't reach karinderyas economically. OilTrace feeds them that volume. | **Potential competitor-turned-partner** |
| **Kobkiat Commodity** | Exports UCO to European biodiesel producers. Needs volume for export. | **Backup buyer** — export-focused, may pay less |

### Phased Approach

**Phase 1 — Hackathon / MVP (Now)**
- Demonstrate IoT sensor + blockchain + mobile app
- Collect from 3-5 friendly karinderyas (friends, family, pilot)
- Generate sample data showing grade distribution
- Document the technical pipeline end-to-end

**Phase 2 — Pilot (Post-Hackathon)**
- Apply for DENR accreditation (starts early — can take months)
- Onboard 20-30 karinderyas in one barangay
- Sign MOU with a buyer (approach Chemrez with pilot data)
- Prove route economics at small scale

**Phase 3 — Scale**
- Based on buyer commitments, scale to multiple routes
- Hire/train drivers
- Expand to additional QC barangays
- Negotiate fixed margin pricing with buyers

## Competitive Positioning

### Competitive Matrix

| Dimension | RMC Oil | Kobkiat | Informal Collectors | OilTrace |
|-----------|---------|---------|--------------------|----------|
| Karinderya coverage | ❌ No | ❌ No | ✅ Yes (cash) | ✅ Yes |
| IoT sensor grading | ❌ No | ❌ No | ❌ No | ✅ Yes |
| Blockchain traceability | ❌ No | ❌ No | ❌ No | ✅ Yes |
| Points rewards | ❌ No | ❌ No | ❌ No (cash only) | ✅ Yes |
| Ebike logistics | ❌ No (trucks) | ❌ No (trucks) | ❌ No (manual) | ✅ Yes |
| DENR accredited | ✅ Yes | ✅ Yes | ❌ Usually not | ⏳ Phase 2 |

### Moats

| Moat | How OilTrace Builds It |
|------|----------------------|
| **First-mover network effects** | Sign exclusive collection agreements with karinderyas early. Switching costs increase as drivers build relationships. |
| **Route data** | Oil quality patterns by area, optimized route sequences, driver performance data — accumulates over time and is hard to replicate |
| **Blockchain certification** | Getting approved as a verified UCO feedstock provider with auditable chain-of-custody records creates switching costs for buyers |
| **Trademark** | Register "OilTrace" with IPOPHL (immediate, ~₱20k total) |
| **Trade secrets** | Sensor calibration methodology, grading algorithms — keep unpublished |

## Risks (Business-Specific)

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| **Points not attractive enough** — karinderyas prefer cash from informal collectors | Medium | High — empty pipeline | Start with higher points tier (30 pts/L = 15% off). Educate on health risks of informal collectors. Emphasize convenience of scheduled pickup. |
| **Buyer concentration** — only 1-2 buyers in Metro Manila | Low | High | Diversify: Chemrez for local biodiesel, Kobkiat for export. Build relationships with both. |
| **DENR accreditation delay** | Medium | Medium | Start application in Phase 1. Pilot with or without it (enforcement is weak in practice). |
| **Ebike regulatory risk** — LTO ban on national roads (Jan 2026) | Medium | Medium | Plan routes exclusively on barangay/secondary roads. Register cargo ebikes as L3 vehicles (₱240). Avoid EDSA, C-5, Commonwealth Ave, Quezon Ave. |
| **Grade mix worse than estimated** — more Low-grade oil than modeled | Medium | Medium | Premium pricing for blockchain-verified oil. Buffer margin with restaurant stops. Adjust points rate if needed. |

## Relationship to Other Docs

| Doc | Connection |
|-----|-----------|
| **[10-points-system.md](./10-points-system.md)** | Points database schema, API, settlement flow. Note: this doc uses an older model where OilTrace funds points — see section above for updated partner-funded model. |
| **[09-tpm-classification.md](./09-tpm-classification.md)** | TPM grading logic (Premium/Standard/Low) that determines oil value and buyer pricing. |
| **[08-route-optimization.md](./08-route-optimization.md)** | Route engine used to optimize karinderya collection sequences. |
| **[14-risks-questions.md](./14-risks-questions.md)** | Risk register — business-specific risks are duplicated here for convenience. |
| **[11-government-compliance.md](./11-government-compliance.md)** | DENR accreditation, RA 6969 compliance details. |
| **[13-implementation-roadmap.md](./13-implementation-roadmap.md)** | Overall project timeline — Phase 1/2/3 mapping. |

## Resolved Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Monetization model** | **Percentage margin (15%)** | Scales with oil prices, aligns incentives with buyers. |
| **Driver model** | **Salary + bonus (Option B)** | Predictable service quality and driver retention. Daily base + per-liter bonus. |
| **Points tier** | **20 pts/L (10% off)** | Standard retail promo rate partners already budget for. Bump to 30 if adoption is slow. |
| **Buyer approach** | **All in parallel** | Approach Chemrez, RMC, and Kobkiat simultaneously. Maximizes options and leverage. |

## Open Questions (For Team Discussion)

| Question | Options |
|----------|---------|
| **Backup plan (no partner funding)** | C+B (₱290/route — thin) / C+B+A (₱410/route — modest) / **Recommended: C+F+A (₱810/route — healthiest)** |
