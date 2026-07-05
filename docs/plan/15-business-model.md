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

### Model A: Fixed Margin per Liter (Recommended)

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

### Model B: Percentage Margin

OilTrace keeps a fixed percentage (e.g., 15%) of the sale price.

**Example (15% margin):**

| Item | Amount |
|------|--------|
| Revenue per route | ₱1,800 |
| OilTrace keeps (15%) | ₱270 |
| To operations | ₱1,530 |

**Pros:** Scales with oil prices, aligned incentives with buyer.
**Cons:** Less predictable, harder to explain.

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
| **Conservative** | 10 pts/L | 5% off (e.g., ₱25 on ₱500) | ~₱5/L equivalent | ✅ Yes, easily |
| **Recommended → 🏆** | **20 pts/L** | **10% off (e.g., ₱50 on ₱500)** | **~₱10/L equivalent** | **✅ Yes — standard promo rate** |
| **Aggressive** | 30 pts/L | 15% off (e.g., ₱75 on ₱500) | ~₱15/L equivalent | ⚠️ Some partners will, some won't |

**Recommendation:** Start at **20 pts/L (10% off)**. It's a standard retail promo that partners already budget for, and combined with scheduled pickup + legitimacy, it's attractive enough to win karinderyas over. If adoption is slow in high-volume corridors, bump to 30 pts/L — OilTrace's profit is the same either way since partners fund the discount.

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

### The Levers (Can Be Combined)

| Lever | Code | How It Works | Impact |
|-------|------|-------------|--------|
| **Buyer premium** | A | Charge buyers 10-15% more for blockchain-verified, sensor-graded oil. SAF/biodiesel producers need auditable chain-of-custody — a real market need they'll pay for. | +₱180-280/route |
| **Lower cash payout** | B | Pay karinderyas ₱12-15/L cash instead of ₱20/L. Below the informal ₱15-30/kg rate, but compensated by scheduled pickup (no waiting), no negotiation, and legitimacy (oil goes to biofuel, not counterfeit cooking oil). | Saves ₱375-600/route |
| **Route density** | C | 20 stops instead of 15, 100L instead of 75L. Same driver cost, more volume. | +₱600/route revenue |
| **Grade-optimized corridors** | D | Start in QC areas where karinderyas do lighter frying (stews, rice toppings, less deep frying) — shifts grade mix toward Premium/Standard (e.g., 30/45/25 instead of 20/40/40). | +₱200-400/route |
| **First-party points** | E | Issue OilTrace-branded points at ₱1-2/L internal cost instead of ₱15-20/L cash. Keeps karinderyas in the points ecosystem without external partners. | Saves ₱900-1,350/route vs cash |
| **Hybrid payout** | F | Pay Premium oil (higher margin) in cash, Standard/Low oil in first-party points. Optimizes cash usage where margin is highest. | Balances cash and points |

### Backup Tiers (For Team Discussion)

| Tier | Levers Combined | Per-Route Net | Notes |
|------|----------------|---------------|-------|
| **Conservative** | A (+10%) + B (₱15/L) + C (100L) | ~₱458 | Modest but positive. Credible to judges — shows you've done the math. |
| **Strong** | A (+15%) + B (₱12/L) + C (100L) + D (30/45/25 mix) | ~₱1,300 | Stronger profit but requires grade-optimized corridor selection. |
| **Combination A+B+E** | A (+10%) + B (₱15/L) + E (first-party points for Low grade) | ~₱800 | Pay Premium/Standard in cash, Low grade in first-party points. |
| **Combination A+E+F** | A (+10%) + E (first-party points) + F (cash for Premium, points for Standard/Low) | ~₱1,055 | Minimizes cash outlay. Uses points for 80% of volume at low internal cost. |
| **Combination C+D+F** | C (100L) + D (grade-optimized) + F (hybrid payout) | ~₱1,100 | Highest volume + best grade mix + smart cash allocation. |
| **Ultimate (all levers)** | A (+15%) + B (₱12/L) + C (100L) + D (30/45/25) + F (hybrid) | ~₱1,900 | Maximum scenario. Not all levers may be achievable simultaneously. |

### How to Present This to Judges

> "Our primary model uses partner-funded points, which makes the economics strongly positive at ~₱1,190/route. But we've modeled a cash-based backup that requires no partnerships — by combining buyer premiums for blockchain traceability, optimized route density, and grade-targeted corridor selection, we remain profitable even without a single partner signed. The partnerships are a growth accelerator, not a dependency."

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

Two options documented for team decision.

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

### Recommendation

Start with **gig model** (Option A) for pilot phase. Drivers are hired per route, no long-term commitment. Once routes are proven and consistent volume is established, transition proven drivers to **salary + bonus** for quality control.

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

## Open Questions (For Team Discussion)

| Question | Options |
|----------|---------|
| **Points tier** | Recommended: 20 pts/L (10% off) / Conservative: 10 pts/L / Aggressive: 30 pts/L |
| **Monetization model** | Fixed margin (₱5/L) / Percentage (15%) / Subscription + volume fee |
| **Driver model** | Gig / Salary + bonus / Phased |
| **First buyer to approach** | Chemrez / RMC / Kobkiat / All in parallel |
| **Backup plan (no partner funding)** | Conservative (A+B+C) / Strong (A+B+C+D) / A+B+E / A+E+F / C+D+F / Ultimate (all levers) |
