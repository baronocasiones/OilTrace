# OilTrace Mobile — Feature Specifications

> **Purpose**: Detailed, spec-driven planning for each feature before implementation begins.
> This is the *design* document — `APP_STATE.md` is the *status* document.
>
> **Workflow**:
> 1. Write the spec here before coding starts.
> 2. Get it reviewed/approved.
> 3. Implement against the spec.
> 4. Mark ✅ in `APP_STATE.md` when done.

---

## Template (copy for each new feature)

```markdown
### F-XXX — [Feature Name]

**Status**: Draft | Approved | In Progress | Done  
**Phase**: [Phase number from APP_STATE.md]  
**Dependencies**: [F-XXX, F-XXX or "None"]

#### Goal
One sentence: what problem does this feature solve for the user?

#### User Stories
- As a [role], I want to [action], so that [outcome].

#### Screens / UI
List every screen or modal this feature introduces. For each:
- **Screen name** (`app/(group)/screen-name.tsx`)
  - Key elements
  - Navigation: where does it go from/to?

#### API Contracts
List every backend endpoint this feature calls.
| Method | Endpoint | Request Body | Response |
|--------|----------|-------------|----------|

#### State / Data
- What goes in Zustand store?
- What is fetched on mount vs. on demand?

#### Edge Cases & Error Handling
- What happens when the network is offline?
- What if the API returns an error?

#### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

#### Notes
Any implementation notes, constraints, or open questions.
```

---

## F-001 — Project Bootstrap

**Status**: Done  
**Phase**: 0 — Project Bootstrap  
**Dependencies**: None

### Goal
Initialize the Expo + React Native project with routing, design system, and base architecture so all future features have a consistent foundation.

### User Stories
- As a developer, I want a running Expo project with file-based routing, so that screens can be added without boilerplate.

### Screens / UI
- Root layout with `Stack` navigator
- Splash / loading screen

### Decisions to Make
- [x] Expo Router v3 or v4? (v4 used with Expo 57)
- [x] State management: Zustand (preferred) or Context? (Zustand used)
- [x] Styling: NativeWind or StyleSheet? (StyleSheet with design system tokens used)
- [x] Design tokens: manual `theme/` folder or a UI library (e.g., Tamagui, Gluestack)? (Manual theme tokens folder used)

### Acceptance Criteria
- [x] `npx expo start` runs without errors
- [x] File-based routing is set up (`app/` directory)
- [x] `APP_STATE.md` updated to ✅ for F-001

---

## F-002 — Auth (Login / Register)

**Status**: Draft  
**Phase**: 1 — Auth & Onboarding  
**Dependencies**: F-001

### Goal
Allow consumers and drivers to create accounts and log in, receiving a JWT to authenticate subsequent API calls.

### User Stories
- As a consumer, I want to register with my phone number and password so I can track my oil pickups.
- As a driver, I want to log in so I can see my job queue.

### Screens / UI
- `app/(auth)/login.tsx` — Email + password fields, Login button, link to Register
- `app/(auth)/register.tsx` — Name, phone, email, password, role selector (Consumer / Driver), Submit
- `app/(auth)/_layout.tsx` — Stack layout, no bottom tabs

### API Contracts
| Method | Endpoint | Request Body | Response |
|--------|----------|-------------|----------|
| POST | `/auth/register` | `{name, phone, email, password, role}` | `{user, token}` |
| POST | `/auth/login` | `{email, password}` | `{user, token}` |

### State / Data
- JWT stored in `expo-secure-store`
- User object in Zustand `authStore`

### Edge Cases & Error Handling
- Invalid credentials → show inline error message
- Network offline → toast "No internet connection"
- Token expiry → redirect to login screen

### Acceptance Criteria
- [ ] Consumer can register and land on consumer dashboard
- [ ] Driver can register and land on driver dashboard
- [ ] JWT persists across app restarts
- [ ] `APP_STATE.md` updated to ✅ for F-002

---

## F-003 — Consumer Dashboard

**Status**: Done  
**Phase**: 2 — Consumer Dashboard  
**Dependencies**: F-001

### Goal
Give consumers an at-a-glance view of their oil collection status, points balance, and recent activity, with a quick way to request a pickup.

### User Stories
- As a consumer, I want to see my points balance and peso equivalent, so I know what I've earned at a glance.
- As a consumer, I want to see the status of my next collection, so I know when the driver is coming.
- As a consumer, I want to request a pickup with one tap, so I can schedule oil collection without hassle.

### Screens / UI
- **`app/(consumer)/dashboard.tsx`** — Default tab of the consumer tab group.
  - **Business name header** — Consumer's business name (e.g., "Aling Maria's Karinderya") displayed at the top of the screen.
  - **Points balance GlassCard** — Large "240 pts" using `Heading` component, with "= PHP 120 discount value" as `BodyText` muted beneath. Use `GlassCard` with `elevated` variant.
  - **Next collection status card** — Shows current request state using `Badge`. States:
    - *No requests*: "No upcoming pickups" — subtle prompt to request one.
    - *Pending*: "Waiting for driver assignment" — `Badge` variant `blockchain-pending`.
    - *Assigned*: "Driver on the way!" — `Badge` variant `blockchain-verified`.
    - *In progress*: "Collection in progress" — shimmer/loading indicator.
    - *Completed*: Hide this card; show the recent collection card below instead.
  - **Request Pickup button** — `Button` with `variant="solid-teal"`, `fullWidth`, label "Request Pickup". Tapping navigates to a request flow (to be spec'd as a sub-feature or separate F-number).
  - **Recent collection card** — `GlassCard` showing the most recent collection: date, volume in liters, TPM percentage, grade badge (`Badge` variant `premium`/`standard`/`danger`), blockchain verification badge (`Badge` variant `blockchain-verified`/`blockchain-pending`/`blockchain-failed`).
  - **Offline banner** — When disconnected, a banner using `g.errorBox` + `g.errorText` reading "You're offline — showing cached data" at the top of the screen.
  - **Navigation**: Tab 1 of 4 in `(consumer)/_layout.tsx`. Points balance tappable → navigates to Rewards tab. Recent collection card tappable → navigates to `history/[id]`.

### API Contracts
| Method | Endpoint | Request Body | Response |
|--------|----------|-------------|----------|
| GET | `/consumers/me/dashboard` | — | `{business_name, points_balance, points_peso_value, next_request, recent_collection}` |
| POST | `/consumers/requests` | `{notes}` | `{id, status, created_at}` |

**GET /consumers/me/dashboard** response shape:
```json
{
  "business_name": "Aling Maria's Karinderya",
  "points_balance": 240,
  "points_peso_value": 120.00,
  "next_request": {
    "id": "uuid-req-1",
    "status": "assigned", // none, pending, assigned, in_progress, completed
    "driver_name": "Kuya Jojo",
    "scheduled_date": "2026-07-03T10:00:00Z"
  },
  "recent_collection": {
    "id": "uuid-col-1",
    "collected_at": "2026-06-25T14:30:00Z",
    "volume_liters": 15.5,
    "tpm_value": 18.3,
    "oil_grade": "premium",
    "blockchain_status": "verified",
    "points_awarded": 50
  }
}
```

### State / Data
- **Future Zustand store**: `dashboardStore` — holds dashboard data, loading/error state, and collection request submission state.
- **Fetch on mount**: Dashboard data via `GET /consumers/me/dashboard`.
- **On demand**: `POST /consumers/requests` when submitting a pickup request.
- **Mock data**: Initial implementation uses mock data from `src/mocks/dashboard.ts`. Real API integration scheduled for later.
- **Caching**: Last-known-good response cached in AsyncStorage for offline display.

### Edge Cases & Error Handling
- **Offline with cache** → Show banner "You're offline — showing cached data" + display cached dashboard data.
- **Offline without cache** → Show centered state: `BodyText` "Connect to internet to get started" + retry button.
- **First-time user (no collections)** → Show empty state: "Welcome! Request your first oil pickup" with prominent Request Pickup button. Points balance shows 0.
- **API error** → Show `g.errorBox` with "Something went wrong. Pull to retry." + pull-to-refresh on `ScrollView`.
- **Loading** → Show skeleton `GlassCard` placeholders with shimmer animation (reuse `ActivityIndicator` or Reanimated shimmer).
- **Request submission failure** → Inline error text: "Could not send request. Please try again."

### Acceptance Criteria
- [x] Dashboard loads and displays business name, points balance, collection status, and recent collection with mock data.
- [x] Each collection request status (no request, pending, assigned, in_progress, completed) renders a distinct UI.
- [x] Request Pickup button is visible and navigates to the request flow.
- [x] Offline banner appears when network is disconnected.
- [x] First-time user sees empty state with welcome message.
- [x] Pull-to-refresh reloads dashboard data.
- [x] `APP_STATE.md` updated to ✅ for F-003.

### Notes
- Request Pickup flow (on-demand / scheduled with date picker + notes) will be spec'd as a sub-feature under F-003 or a standalone F-number.
- Design reuses: `GlassCard`, `Button` (solid-teal, glass variants), `Badge` (premium/standard/danger, blockchain variants), `Heading`, `BodyText`, `Label`, `createGlobalStyles`.
- No new UI primitives needed for this screen.

---

## F-004 — Collection History

**Status**: Draft  
**Phase**: 2 — Consumer Dashboard  
**Dependencies**: F-001

### Goal
Allow consumers to review their past oil collections with quality grades, volumes, and blockchain-verified tamper-proof records.

### User Stories
- As a consumer, I want to see a chronological list of my past collections, so I can track my oil disposal history.
- As a consumer, I want to tap a collection to see full details (TPM, grade, driver, blockchain tx), so I have a complete record.
- As a consumer, I want to verify a collection on Etherscan, so I know the record is immutable and trustworthy.

### Screens / UI
- **`app/(consumer)/history.tsx`** — Collection list, Tab 2 of 4.
  - **FlatList** of collection items. Each item is a `GlassCard` (non-elevated, interactive) containing:
    - Date (e.g., "Jun 20, 2026") using `Label` component.
    - Volume (e.g., "5L") using `Heading` size `sm`.
    - TPM value (e.g., "18.3% TPM") using `BodyText`.
    - Grade badge (`Badge` variant `premium`/`standard`/`danger`).
    - Blockchain verification badge (`Badge` variant `blockchain-verified`/`blockchain-pending`/`blockchain-failed`).
  - **Empty state**: "No collections yet" with `BodyText` muted and a subtle illustration/icon area.
  - **Loading state**: Skeleton `GlassCard` placeholders (3–4 items).
  - **Offline banner**: Same pattern as F-003 — `g.errorBox` banner at top.
  - **Navigation**: Tab 2 of 4. Tapping a card navigates to `history/[id]`.
  - **Pagination**: FlatList `onEndReached` wired for future cursor-based pagination. In mock mode, all records load at once.

- **`app/(consumer)/history/[id].tsx`** — Collection detail screen.
  - **Back navigation**: Header back arrow to return to history list.
  - **GlassCard (elevated)** containing:
    - Collection date and time.
    - Volume in liters (large `Heading`).
    - TPM value with unit (`BodyText`).
    - Grade badge + destination label (e.g., "Premium — Suitable for SAF").
    - Driver name (mocked: "Juan dela Cruz").
    - Location (mocked: "Brgy. San Isidro, General Trias").
  - **Blockchain verification section** — Second `GlassCard` containing:
    - Verification status badge (`Badge`).
    - Transaction hash displayed with `Mono` component, tappable to open Etherscan via `expo-web-browser`.
    - Block number.
    - "View on Etherscan" link/button using `Button` variant `glass`.
  - **Points awarded** — Small section showing "You earned 50 points from this collection" with `BodyText` accent.
  - **Offline behavior**: Show cached detail if available; banner if not.

### API Contracts
| Method | Endpoint | Request Body | Response |
|--------|----------|-------------|----------|
| GET | `/consumers/history` | — | `{collections: [...], next_cursor}` |
| GET | `/consumers/history/{id}` | — | Full collection record |
| GET | `/blockchain/verify/{collection_id}` | — | `{verified, tx_hash, block_number, hash_match}` |

**GET /consumers/history** response shape:
```json
{
  "collections": [
    {
      "id": "uuid",
      "collected_at": "2026-06-20T10:30:00Z",
      "volume_liters": 5.0,
      "tpm_value": 18.3,
      "oil_grade": "premium",
      "blockchain_status": "verified",
      "points_awarded": 50
    }
  ],
  "next_cursor": "cursor_string"
}
```

**GET /consumers/history/{id}** response shape:
```json
{
  "id": "uuid",
  "collected_at": "2026-06-20T10:30:00Z",
  "volume_liters": 5.0,
  "tpm_value": 18.3,
  "oil_grade": "premium",
  "oil_destination": "SAF",
  "driver_name": "Juan dela Cruz",
  "driver_id": "uuid",
  "location": "Brgy. San Isidro, General Trias",
  "points_awarded": 50,
  "consumer_signed": true,
  "blockchain_record": {
    "tx_hash": "0xabc123...",
    "block_number": 12345678,
    "status": "confirmed",
    "contract_address": "0x..."
  }
}
```

### State / Data
- **Future Zustand store**: Part of a shared consumer store or standalone `historyStore` — holds collection list, cursor, detail cache.
- **Fetch on mount**: Collection list via `GET /consumers/history`. Detail fetched on navigation to `history/[id]` via `GET /consumers/history/{id}`.
- **On demand**: Blockchain verification via `GET /blockchain/verify/{collection_id}`.
- **Mock data**: `src/mocks/history.ts` returns 10–15 varied records (mix of premium/standard/low grades and blockchain-verified/pending/failed statuses).

### Edge Cases & Error Handling
- **Empty history** → Show "No collections yet. Once your oil is collected, it will appear here." with a subtle illustration.
- **Offline** → Show cached history list if available. Detail screen shows banner "Some information may be unavailable offline."
- **Etherscan link offline** → `expo-web-browser` fails gracefully; toast "Could not open link. Check your internet connection."
- **Blockchain verification pending** → Show `Badge` `blockchain-pending` with note "Verification in progress — typically confirmed within 2 minutes."
- **Blockchain verification failed** → Show `Badge` `blockchain-failed` with note "This record could not be verified on-chain. Contact support."
- **API error on list** → Show error box with retry button and pull-to-refresh.
- **API error on detail** → Show error box with "Could not load collection details" + back button.

### Acceptance Criteria
- [ ] History list renders 10+ mock collection items with grades, volumes, and blockchain badges.
- [ ] Empty state displays when there are no collections.
- [ ] Tapping a collection item navigates to the detail screen.
- [ ] Detail screen shows full record: date, volume, TPM, grade, destination, driver, blockchain info.
- [ ] Transaction hash is tappable and opens Etherscan (mock URL in mock mode).
- [ ] Pull-to-refresh reloads the list.
- [ ] Offline banners display appropriately on both list and detail screens.
- [ ] `APP_STATE.md` updated to ✅ for F-004.

### Notes
- Reuses: `GlassCard`, `Badge` (all 6 variants), `Heading`, `BodyText`, `Label`, `Mono`, `Button`.
- `expo-web-browser` is already in package.json for Etherscan deep links.
- No new UI primitives needed. A `CollectionCard` convenience component (composing GlassCard + Badge) may be extracted during implementation if repeated across Dashboard and History.

---

## F-005 — Points & Rewards

**Status**: Draft  
**Phase**: 5 — Rewards & Points  
**Dependencies**: F-001

### Goal
Allow consumers to view their points balance and transaction history, browse partner stores, and redeem points for discount vouchers.

### User Stories
- As a consumer, I want to see my total points and peso value, so I know how much discount I've earned.
- As a consumer, I want to see a breakdown of points earned vs. used, so I understand my spending.
- As a consumer, I want to browse partner stores and their exchange rates, so I can choose where to redeem.
- As a consumer, I want to redeem points for a voucher, so I can get a discount at a partner store.
- As a consumer, I want to see my active vouchers with QR codes, so I can use them at checkout.

### Screens / UI
- **`app/(consumer)/rewards.tsx`** — Single scrollable screen, Tab 3 of 4. Uses `SectionList` or `ScrollView` with sections.

  **Section 1 — Points Balance** (sticky header-like):
  - Large points number using `Heading` size `lg` (e.g., "240 pts").
  - Peso equivalent: "= PHP 120 discount value" using `BodyText` muted.
  - Earned vs. used breakdown: "Earned: 300 pts | Used: 60 pts" using `BodyText` small muted.
  - All wrapped in a `GlassCard` `elevated` for visual prominence.
  - **Loading state**: Skeleton GlassCard with shimmer.
  - **Empty state**: "0 pts" with BodyText "Start collecting to earn points!"

  **Section 2 — Partner Stores**:
  - Section header: "Redeem at Partner Stores" using `Heading` size `sm`.
  - FlatList horizontal scroll or vertical card list. Each partner is a `GlassCard` containing:
    - Store name (`Heading` size `sm`).
    - Exchange rate (e.g., "10 pts = PHP 5 off") using `BodyText`.
    - Points progress bar (visual indicator of user's balance vs. minimum redemption).
    - "Redeem" button (`Button` variant `glass-gold`, `size="sm"`).
  - **No partners available**: Show "No partner stores yet. Check back soon!" muted text.
  - **Insufficient points**: "Redeem" button disabled with text "Need X more pts". Button `disabled` applies `opacity: 0.5`.

  **Section 3 — My Vouchers**:
  - Section header: "My Vouchers" using `Heading` size `sm`.
  - List of voucher `GlassCard` items, each showing:
    - Voucher code (e.g., "OIL-MINOLA-7F3A2B") using `Mono` component.
    - Discount amount (e.g., "PHP 25 off at Minola Oil") using `BodyText` accent.
    - Status badge (`Badge` with custom label: "Active" / "Used" / "Expired").
    - Expiration date using `Label`.
    - "Show QR" button (`Button` variant `glass`, `size="sm"`).
  - **No vouchers**: Show "No vouchers yet. Redeem your points at a partner store!" muted text.
  - **QR code modal**: Tapping "Show QR" opens a modal/overlay with the QR code generated by `react-native-qrcode-svg` (already in deps), voucher code, and discount amount.

  - **Navigation**: Tab 3 of 4. No sub-screens (single scrollable page with optional QR modal).
  - **Offline banner**: Same pattern — `g.errorBox` at the top.

### API Contracts
| Method | Endpoint | Request Body | Response |
|--------|----------|-------------|----------|
| GET | `/consumers/points` | — | `{balance, peso_value, earned_total, used_total, transactions: [...]}` |
| GET | `/consumers/partners` | — | `{partners: [{id, name, brand, logo_url, discount_per_point, points_per_liter, min_redemption}]}` |
| GET | `/consumers/vouchers` | — | `{vouchers: [{id, voucher_code, discount_amount, partner_name, status, expires_at, qr_data}]}` |
| POST | `/consumers/redeem` | `{partner_id, points_to_use}` | `{voucher_code, discount_amount, partner_name, qr_data, expires_at}` |

**GET /consumers/points** response shape:
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

**GET /consumers/partners** response shape:
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

**GET /consumers/vouchers** response shape:
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

### State / Data
- **Future Zustand store**: `rewardsStore` — holds points balance, partner list, vouchers list, redemption state.
- **Fetch on mount**: Points, partners, and vouchers all fetched via their respective GET endpoints.
- **On demand**: `POST /consumers/redeem` when consumer taps Redeem. Success refreshes points + vouchers.
- **Mock data**: `src/mocks/rewards.ts` returns 3–5 partner stores and 2–3 vouchers with varied statuses.
- **QR modal state**: Local `useState` for showing/hiding QR code overlay. No global state needed.

### Edge Cases & Error Handling
- **Zero points** → Show "0 pts" with prompt "Collect oil to earn points! Each liter earns you 10 points."
- **No partners** → Partner section shows "No partner stores available yet. Check back soon!" — no Redeem buttons.
- **No vouchers** → Vouchers section shows "No vouchers yet. Redeem your points at a partner store above!"
- **Insufficient points for redemption** → Redeem button disabled with `BodyText` danger "Need 10 more pts". Use `Button` `disabled` prop.
- **Redemption fails (API error)** → Show inline error in partner card: "Redemption failed. Please try again." using `g.errorText`.
- **Redemption success** → Show success toast/animation, refresh points balance and vouchers list, auto-open QR modal for the new voucher.
- **Offline** → Banner "You're offline" displayed at top. Points balance shows cached value if available. Redeem button hidden or disabled.
- **Voucher expired** → Show `Badge` with red/danger styling, stripe through the code, "Expired on [date]" note.
- **Voucher used** → Show `Badge` with muted styling, "Used on [date]" note.
- **QR code generation failure** → Fallback to showing voucher code in large text as alternative.

### Acceptance Criteria
- [ ] Points balance screen shows total points, peso value, and earned/used breakdown with mock data.
- [ ] Partner stores section renders 3+ mock partners with exchange rates and Redeem buttons.
- [ ] Redeem button is disabled when user has insufficient points, with helpful message.
- [ ] Tapping Redeem on a partner with sufficient points shows a success state and generates a mock voucher.
- [ ] Vouchers section lists active/existing vouchers with codes, discount amounts, status badges, and expiration.
- [ ] Tapping "Show QR" opens a modal with the QR code rendered via `react-native-qrcode-svg`.
- [ ] Offline banner displays, and redemption is disabled when offline.
- [ ] Empty states render correctly for zero points, no partners, and no vouchers.
- [ ] `APP_STATE.md` updated to ✅ for F-005.

### Notes
- Requires `react-native-qrcode-svg` (already in package.json).
- QR modal can be implemented with React Native `Modal` or a lightweight bottom sheet using `react-native-reanimated`.
- Partner logos are mocked with placeholder colors/gradients — no actual image URLs needed for mock phase.
- Voucher code format: `OIL-{BRAND}-{RANDOM_6CHAR}` (e.g., "OIL-MINOLA-7F3A2B").
- Points expiry (90 days) is backend-enforced. The consumer app displays expiry warnings — spec'd in Notifications phase (F-010).
