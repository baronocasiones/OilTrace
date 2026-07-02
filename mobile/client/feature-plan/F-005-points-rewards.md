# F-005 — Points & Rewards

**Status**: Draft  
**Phase**: 5 — Rewards & Points  
**Dependencies**: F-001

## Goal
Allow consumers to view their points balance and transaction history, browse partner stores, and redeem points for discount vouchers.

## User Stories
- As a consumer, I want to see my total points and peso value, so I know how much discount I've earned.
- As a consumer, I want to see a breakdown of points earned vs. used, so I understand my spending.
- As a consumer, I want to browse partner stores and their exchange rates, so I can choose where to redeem.
- As a consumer, I want to redeem points for a voucher, so I can get a discount at a partner store.
- As a consumer, I want to see my active vouchers with QR codes, so I can use them at checkout.

## Screens / UI

### `app/(consumer)/rewards.tsx` — Tab 3 of 4

Single scrollable screen using `SectionList` or `ScrollView` with sections.

---

### Section 1 — Points Balance (top, high visual weight)

Wrapped in a `GlassCard` `elevated` for visual prominence:

| Element | Component | Example |
|---|---|---|
| Points total | `Heading` size `lg` | "240 pts" |
| Peso equivalent | `BodyText` muted | "= PHP 120 discount value" |
| Earned vs. used | `BodyText` size `sm` muted | "Earned: 300 pts \| Used: 60 pts" |

**States**:
- **Loading**: Skeleton GlassCard with shimmer.
- **Empty**: "0 pts" with BodyText "Start collecting to earn points!"

---

### Section 2 — Partner Stores

**Section header**: "Redeem at Partner Stores" using `Heading` size `sm`.

Each partner is a `GlassCard` containing:

| Element | Component | Example |
|---|---|---|
| Store name | `Heading` size `sm` | "Minola Oil" |
| Exchange rate | `BodyText` | "10 pts = PHP 5 off" |
| Points progress bar | Visual indicator | User's balance vs. minimum redemption |
| Redeem button | `Button` variant `glass-gold`, `size="sm"` | Tappable if sufficient points |

**States**:
- **No partners available**: "No partner stores yet. Check back soon!" — muted `BodyText`.
- **Insufficient points**: Redeem button disabled (`Button` `disabled` prop) with label "Need X more pts" in `BodyText` danger.
- **Loading**: Skeleton cards.

---

### Section 3 — My Vouchers

**Section header**: "My Vouchers" using `Heading` size `sm`.

Each voucher is a `GlassCard` containing:

| Element | Component | Example |
|---|---|---|
| Voucher code | `Mono` component | "OIL-MINOLA-7F3A2B" |
| Discount amount | `BodyText` accent | "PHP 25 off at Minola Oil" |
| Status badge | `Badge` with custom label | "Active" / "Used" / "Expired" |
| Expiration date | `Label` | "Expires Sep 20, 2026" |
| Show QR button | `Button` variant `glass`, `size="sm"` | Opens QR modal |

**States**:
- **No vouchers**: "No vouchers yet. Redeem your points at a partner store!" — muted `BodyText`.
- **Voucher expired**: Red/danger styling, strikethrough code, "Expired on [date]" note.
- **Voucher used**: Muted styling, "Used on [date]" note.

---

### QR Code Modal

Tapping "Show QR" opens a modal/overlay containing:
- QR code rendered via `react-native-qrcode-svg` (already in package.json).
- Voucher code displayed below the QR.
- Discount amount.
- "Close" button.

---

### Navigation
- Tab 3 of 4 in `(consumer)/_layout.tsx`.
- No sub-screens (single scrollable page with optional QR modal).
- Linked from Dashboard points balance card.

### Offline banner
- Same pattern as other consumer screens: `g.errorBox` at the top with "You're offline".

## API Contracts

| Method | Endpoint | Request Body | Response |
|--------|----------|-------------|----------|
| GET | `/consumers/points` | — | `{balance, peso_value, earned_total, used_total, transactions}` |
| GET | `/consumers/partners` | — | `{partners: [{id, name, brand, logo_url, discount_per_point, points_per_liter, min_redemption}]}` |
| GET | `/consumers/vouchers` | — | `{vouchers: [{id, voucher_code, discount_amount, partner_name, status, expires_at, qr_data}]}` |
| POST | `/consumers/redeem` | `{partner_id, points_to_use}` | `{voucher_code, discount_amount, partner_name, qr_data, expires_at}` |

### GET /consumers/points — Response

```json
{
  "balance": 240,
  "peso_value": 120.00,
  "earned_total": 300,
  "used_total": 60,
  "transactions": [
    {
      "id": "uuid",
      "type": "earned",
      "points": 50,
      "reference": "Collection #C-2026-06-20",
      "balance_after": 240,
      "created_at": "2026-06-20T10:30:00Z"
    }
  ]
}
```

### GET /consumers/partners — Response

```json
{
  "partners": [
    {
      "id": "uuid",
      "name": "Minola Oil",
      "brand": "Minola",
      "logo_url": "https://...",
      "discount_per_point": 0.50,
      "points_per_liter": 10,
      "min_redemption": 10,
      "max_redemption": null
    }
  ]
}
```

### GET /consumers/vouchers — Response

```json
{
  "vouchers": [
    {
      "id": "uuid",
      "voucher_code": "OIL-MINOLA-7F3A2B",
      "discount_amount": 25.00,
      "partner_name": "Minola Oil",
      "status": "active",
      "expires_at": "2026-09-20T00:00:00Z",
      "qr_data": "oiltrace://voucher/OIL-MINOLA-7F3A2B"
    }
  ]
}
```

### POST /consumers/redeem — Request

```json
{
  "partner_id": "uuid",
  "points_to_use": 50
}
```

### POST /consumers/redeem — Response

```json
{
  "voucher_code": "OIL-MINOLA-7F3A2B",
  "discount_amount": 25.00,
  "partner_name": "Minola Oil",
  "qr_data": "oiltrace://voucher/OIL-MINOLA-7F3A2B",
  "expires_at": "2026-07-01T00:00:00Z"
}
```

## Points Economics Reference

| Metric | Value |
|---|---|
| Base rate | 10 points per liter collected |
| Discount value per point | PHP 0.50–1.00 (set per partner) |
| Minimum redemption | 10 points |
| Points expiry | 90 days |

## State / Data

- **Future Zustand store**: `rewardsStore` — holds points balance, partner list, vouchers list, redemption state.
- **Fetch on mount**: Points, partners, and vouchers all fetched via their respective GET endpoints.
- **On demand**: `POST /consumers/redeem` when consumer taps Redeem. Success refreshes points + vouchers.
- **Mock data**: `src/mocks/rewards.ts` returns 3–5 partner stores and 2–3 vouchers with varied statuses.
- **QR modal state**: Local `useState` for showing/hiding QR code overlay. No global state needed.

## Edge Cases & Error Handling

| Scenario | Behavior |
|---|---|
| **Zero points** | Show "0 pts" with prompt "Collect oil to earn points! Each liter earns you 10 points." |
| **No partners** | "No partner stores available yet. Check back soon!" — no Redeem buttons |
| **No vouchers** | "No vouchers yet. Redeem your points at a partner store above!" |
| **Insufficient points** | Redeem button disabled with `BodyText` danger "Need 10 more pts". Use `Button` `disabled` prop |
| **Redemption fails (API)** | Show inline error in partner card: "Redemption failed. Please try again." using `g.errorText` |
| **Redemption success** | Show success toast/animation, refresh points + vouchers, auto-open QR modal |
| **Offline** | Banner "You're offline" at top. Cached balance shown if available. Redeem buttons hidden or disabled |
| **Voucher expired** | `Badge` with red/danger styling, strikethrough text, "Expired on [date]" note |
| **Voucher used** | `Badge` with muted styling, "Used on [date]" note |
| **QR code generation fails** | Fallback to showing voucher code in large text |

## Acceptance Criteria

- [ ] Points balance screen shows total points, peso value, and earned/used breakdown with mock data.
- [ ] Partner stores section renders 3+ mock partners with exchange rates and Redeem buttons.
- [ ] Redeem button is disabled when user has insufficient points, with helpful message.
- [ ] Tapping Redeem on a partner with sufficient points shows a success state and generates a mock voucher.
- [ ] Vouchers section lists active/existing vouchers with codes, discount amounts, status badges, and expiration.
- [ ] Tapping "Show QR" opens a modal with the QR code rendered via `react-native-qrcode-svg`.
- [ ] Offline banner displays, and redemption is disabled when offline.
- [ ] Empty states render correctly for zero points, no partners, and no vouchers.
- [ ] `APP_STATE.md` updated to ✅ for F-005.

## Design Reuse

Reuses these existing components (no new UI primitives needed):

| Component | Usage |
|---|---|
| `GlassCard` | Balance card, partner cards, voucher cards |
| `Button` | Redeem (glass-gold), Show QR (glass), retry actions |
| `Badge` | Voucher status (Active/Used/Expired with custom labels) |
| `Heading` | Points total, section headers |
| `BodyText` | Peso value, descriptions, earned/used breakdown |
| `Label` | Expiration dates, metadata |
| `Mono` | Voucher code display |

## Notes
- `react-native-qrcode-svg` is already in package.json.
- QR modal can be implemented with React Native `Modal` or a lightweight bottom sheet using `react-native-reanimated`.
- Partner logos are mocked with placeholder colors/gradients — no actual image URLs needed for mock phase.
- Voucher code format: `OIL-{BRAND}-{RANDOM_6CHAR}` (e.g., "OIL-MINOLA-7F3A2B").
- Points expiry (90 days) is backend-enforced. The consumer app displays expiry warnings — spec'd in Notifications phase (F-010).
- The progress bar for points vs. minimum redemption can be a simple `View` with dynamic width — no progress bar component needed.
