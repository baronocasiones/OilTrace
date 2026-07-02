### F-005 — Points & Rewards

**Status**: Done  
**Phase**: 5 — Rewards & Points  
**Dependencies**: F-001, F-003

#### Goal
Provide consumers with an interactive, offline-resilient dashboard to track their points balance, browse available partner stores with visual progress indicators, and seamlessly redeem points for discount vouchers using QR codes.

#### User Stories
- As a consumer, I want to see my total points and peso equivalent prominently, so I understand the value of my used oil.
- As a consumer, I want a breakdown of points earned vs. used, to track my overall activity.
- As a consumer, I want to see partner stores with a progress bar indicating how close I am to a reward, to motivate my next collection.
- As a consumer, I want to redeem points for a voucher with one tap, receiving immediate feedback.
- As a consumer, I want to view my active vouchers as QR codes (even offline), so I can easily claim discounts at partner stores.

#### Screens / UI
- **Rewards Screen** (`app/(consumer)/rewards.tsx`)
  - **Architecture**: Use `SectionList` or `@shopify/flash-list` to render the distinct sections for optimal performance. Wrap the screen content properly handling bottom insets.
  - **Section 1: Points Balance (Sticky Header/Top Area)**
    - Elevated `GlassCard` wrapper for maximum visual prominence.
    - Large `Heading` (size `lg`) for total points (e.g., "240 pts"), explicitly utilizing the `rewardPulse` animation (scale 1.12 + gold color shift) defined in the HTML design system.
    - `BodyText` (muted) for peso value ("= ₱120 value").
    - Small layout row for "Earned: 300 pts | Used: 60 pts".
  - **Section 2: Available Partners**
    - Section header: `Heading` (size `sm`) "Available Partners".
    - Rendered via mapped components or list.
    - Partner `GlassCard` layout:
      - Store name (`Heading` `sm`) and exchange rate (`10 pts = ₱5 off`).
      - **Progress Indicator**: A custom horizontal bar using `react-native-reanimated` that visualizes `min(user_balance / min_redemption, 1)`.
      - Redeem `Button` (`variant="glass-gold"`). Disabled and dimmed if balance < `min_redemption`.
  - **Section 3: My Vouchers**
    - Section header: `Heading` (size `sm`) "My Vouchers".
    - Voucher `GlassCard` layout:
      - `Mono` component for the voucher code (e.g., `OIL-MINOLA-7F3A2B`).
      - Discount description (e.g., "₱25 off · Active").
      - `Badge` component for status (Active/Used/Expired).
      - Expiry `Label`.
      - "Show QR" `Button` (`variant="glass"`).
  - **Offline Banner**: `g.errorBox` rendered conditionally at the top of the view if no network is detected.
- **QR Code Modal**
  - **Implementation**: Instead of a basic React Native Modal, use a smooth animated overlay (via `react-native-reanimated`) for a premium glassmorphic feel.
  - **Content**: 
    - `react-native-qrcode-svg` rendering the `qr_data` deep link (e.g., `oiltrace://voucher/...`).
    - Large voucher code `Mono` text.
    - Dismiss/Close `Button`.

#### API Contracts
| Method | Endpoint | Request Body | Response |
|--------|----------|-------------|----------|
| GET | `/consumers/points` | — | `{balance, peso_value, earned_total, used_total, transactions}` |
| GET | `/consumers/partners` | — | `{partners: [{id, name, brand, logo_url, discount_per_point, points_per_liter, min_redemption}]}` |
| GET | `/consumers/vouchers` | — | `{vouchers: [{id, voucher_code, discount_amount, partner_name, status, expires_at, qr_data}]}` |
| POST | `/consumers/redeem` | `{partner_id, points_to_use}` | `{voucher_code, discount_amount, partner_name, qr_data, expires_at}` |

#### State / Data
- **Global State**:
  - `rewardsStore` (Zustand): Holds `pointsData`, `partners`, and `vouchers`.
  - Implements `persist` middleware with AsyncStorage for offline-first caching.
- **Data Fetching Strategy (Mount vs. Demand)**:
  - On mount: Dispatch a hydration action that loads cached data immediately, then fetches fresh data from `/consumers/points`, `/consumers/partners`, and `/consumers/vouchers` in parallel using `Promise.all`.
  - On demand: `POST /consumers/redeem` triggered by the Redeem button. On success, optimistic UI update or re-fetch points and vouchers.
- **Local State**: `qrModalVisible` boolean and `selectedVoucher` state to drive the QR overlay.

#### Edge Cases & Error Handling
- **Offline / Network Failure**:
  - Show "You're offline" banner.
  - Display cached `rewardsStore` data (offline-first).
  - Disable "Redeem" buttons (mutations require network).
  - QR codes for already cached active vouchers must remain viewable.
- **API Error on Redemption**:
  - Show inline validation or a toast error (e.g., "Redemption failed. Please try again.") without crashing.
- **UI Edge Cases & States (Strictly following DESIGN.md checklist)**:
  - **Loading**: Use `ActivityIndicator` + descriptive text.
  - **Empty States**: Icon + helpful message + CTA. (e.g., "0 pts. Collect oil to earn points!" with an icon and CTA to Dashboard).
  - **Error States**: Error message + retry button (e.g. for failed API fetches).
  - **Insufficient points**: Redeem button uses `disabled` prop and says "Need X more pts".
  - **Expired/Used vouchers**: Distinct styling (strikethrough text, muted opacity, red or gray badges).
  - **QR rendering error**: Fallback to just displaying the voucher code clearly.

#### React Native & UI/UX Best Practices (skills-lock compliant)
- **Performance**: Use `@shopify/flash-list` for rendering lists to guarantee 60fps scrolling. Use `React.memo` on Partner and Voucher cards to prevent unnecessary re-renders during state changes.
- **Animations**: Use `react-native-reanimated` for progress bars, the QR modal transitions (spring animations), and explicitly implement the `rewardPulse` scale/color animation (from `OilTraceDesignSystem(1).html`) on the points total.
- **Design System Fidelity**: Strictly adhere to `createGlobalStyles(theme)` and `DESIGN.md`. Use `GlassCard` (including `elevated` variant), `Button` (e.g., `variant="glass-gold"`), `Badge`, and `Typography` primitives exclusively. No hardcoded hex values.
- **Feedback**: Provide haptic feedback when a user successfully redeems a voucher (if applicable/supported).

#### Acceptance Criteria
- [x] Points balance dynamically shows total points, peso value, and earned/used breakdown with realistic mock data.
- [x] Partner stores section renders mock partners with calculated, animated progress bars based on `min_redemption`.
- [x] Redeem buttons are appropriately disabled with a helpful sub-label when the user lacks sufficient points.
- [x] Successful redemption updates state, gives user feedback, and immediately displays the new voucher.
- [x] Vouchers section accurately lists vouchers with correct statuses, styling, and working "Show QR" buttons.
- [x] QR code overlay animates in smoothly and renders valid QR data via `react-native-qrcode-svg`.
- [x] The screen operates gracefully offline using Zustand/AsyncStorage cached data, disabling only write actions.
- [x] `APP_STATE.md` updated to ✅ for F-005.

#### Notes
- **Dependencies**: `react-native-qrcode-svg`, `@shopify/flash-list`, `react-native-reanimated` (all currently available or easily installable).
- **Mock Data**: Setup `src/mocks/rewards.ts` to return rich objects reflecting the backend DB schema (including realistic `oiltrace://` deep links for `qr_data`).
- **Points Economics Reference**: Base rate 10 pts/L. Discount value PHP 0.50–1.00/pt. Min redemption 10 pts. Expiry 90 days.
