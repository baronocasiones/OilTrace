# OilTrace Mobile — Agent Instructions

## Scope: `frontend/client` Folder Only

All development must be strictly restricted to the `frontend/client/` directory.
This folder builds the **consumer-facing screens** of the OilTrace mobile app.
Follow `docs/plan/07-mobile-app.md` — **Consumer App section only** — as the canonical screen spec.

Consumer screen flow (from the plan):
```
Auth → Dashboard → Request Collection → History → Points & Vouchers → Profile
```

---

## Hard Rules

1. **Strictly Frontend/Client Only.** Do not create or modify files outside of `frontend/client/`. If a backend API is needed, mock it locally.
2. **Mock data only.** No real network/API calls, no live blockchain or database connections. Use static mocks (e.g., TS files in `src/mocks/`). Never use `fetch()`, `axios`, or live database integrations.
3. **Follow the spec.** Refer directly to the consumer screens defined in `docs/plan/07-mobile-app.md`. Do not implement unauthorized/extra features.
4. **Update planning docs** after every completed feature:
   - `APP_STATE.md` → flip feature status to ✅
   - `FEATURES.md` → mark spec Status as Done
   - `ERROR_LOG.md` → log any errors encountered (newest first, ERR-XXX format)
5. **Verify type safety** before committing or marking a feature as done by running `npx tsc --noEmit`. Fix any TypeScript or missing import errors immediately.

---

## Tech Stack (from plan)

| Library | Purpose |
|---------|---------|
| React Native + Expo | App framework |
| expo-router | File-based routing |
| react-native-paper | UI components |
| react-navigation | Screen navigation |
| expo-notifications | Push notifications (mocked) |
| expo-camera / expo-qr-code | QR scanning / generation (mocked) |

---

## Design System & Styling

> **Core rule: Never hard-code a color hex, font name, pixel size, or opacity in a component.**
> Always pull values from the design system.

### Folder structure

```
src/
├── theme/
│   ├── tokens.ts          ← Raw values: colors, fonts, spacing, radii, shadows, durations
│   ├── theme.ts           ← Semantic aliases per mode (light / dark / dim)
│   ├── ThemeContext.tsx   ← useTheme() hook + <ThemeProvider>
│   ├── globalStyles.ts    ← StyleSheet factory → mirrors .glass-panel, .btn-*, etc.
│   └── index.ts           ← Barrel: import { useTheme, palette, spacing } from '@/theme'
│
├── components/
│   ├── ui/                ← Reusable primitives (NO feature logic here)
│   │   ├── GlassCard.tsx  ← glassmorphic container
│   │   ├── Button.tsx     ← all 6 button variants
│   │   ├── Badge.tsx      ← grade + blockchain status badges
│   │   ├── OilInput.tsx   ← themed TextInput with label/prefix/error
│   │   ├── Typography.tsx ← Heading, BodyText, Label, Mono
│   │   └── index.ts       ← barrel
│   │
│   └── [feature]/         ← Feature-specific composite components
│       e.g. CollectionCard, PointsDisplay, QRGenerator
│
├── screens/               ← Expo Router screen files (app/)
├── mocks/                 ← Static mock data (TS files)
└── hooks/                 ← Custom hooks (useOilCollection, usePoints, etc.)
```

### How to style a new component

```tsx
// 1. Get the theme
import { useTheme } from '@/theme';
import { createGlobalStyles } from '@/theme/globalStyles';

// 2. Destructure inside the component
const { theme } = useTheme();
const g = createGlobalStyles(theme);

// 3. Compose global styles + local overrides
<View style={[g.glassPanel, g.roundedXl, styles.card]}>
  <Label>Available Points</Label>
  <Heading size="lg" style={g.textAccent}>{balance}</Heading>
</View>
```

### Reusable primitive quick reference

| Component | Import | When to use |
|-----------|--------|-------------|
| `GlassCard` | `@/components/ui` | Any card / panel container |
| `Button` | `@/components/ui` | All touchable actions |
| `Badge` | `@/components/ui` | Grade labels, blockchain status |
| `OilInput` | `@/components/ui` | All text/phone/OTP inputs |
| `Heading` | `@/components/ui` | Screen titles, section heads |
| `BodyText` | `@/components/ui` | Paragraphs, descriptions |
| `Label` | `@/components/ui` | UPPERCASE metadata labels |
| `Mono` | `@/components/ui` | TX hashes, voucher codes |

### Button variants

| `variant` prop | Mirrors CSS class | Use case |
|----------------|------------------|----------|
| `solid-teal` | `.btn-solid-teal` | Primary CTA (Send OTP, Confirm) |
| `glass-primary` | `.btn-glass-primary` | Secondary accent actions |
| `glass` | `.btn-glass` | Neutral / tertiary actions |
| `glass-secondary` | `.btn-glass-secondary` | Muted / cancel |
| `glass-gold` | `.btn-glass-gold` | Points / voucher redemption |
| `glass-danger` | `.btn-glass-danger` | Destructive / delete |

### Global style fragments (from `createGlobalStyles`)

| Style key | Mirrors | Purpose |
|-----------|---------|---------|
| `glassPanel` | `.glass-panel` | Base glassmorphic card |
| `glassPanelElevated` | `.glass-panel-elevated` | Modal / overlay cards |
| `interactiveCard` | `.interactive-card` | Cards with hover/press affordance |
| `displayLg/Md/Sm` | Manrope headings | Hero numbers, screen titles |
| `bodyLg/Md/Sm` | Inter body | Paragraphs, descriptions |
| `labelMd/Sm` | Uppercase labels | Section metadata |
| `mono` | JetBrains Mono | Tx hashes, codes |
| `btnBase + btn*` | `.btn-*` | Button shapes |
| `badge + badge*` | Badge pills | Status indicators |
| `divider` | `border-t` separator | Row dividers |
| `input` | Input field | Text inputs |
| `errorBox/Text` | Error state | Form validation |
| `iconContainerAccent/Gold` | Icon wrappers | Icon background containers |
| `row/rowBetween/col/center` | Flexbox helpers | Layout composition |

### Theme tokens overview

| File | Contents |
|------|----------|
| `tokens.ts → palette` | All named colors (tealBase, goldDark, lightBg…) |
| `tokens.ts → fonts` | display / body / mono font families |
| `tokens.ts → fontSizes` | xxs (10) → display (30) |
| `tokens.ts → fontWeights` | regular → extrabold |
| `tokens.ts → spacing` | 0 → 64 (numeric scale, value = px) |
| `tokens.ts → radii` | none → full (9999) |
| `tokens.ts → shadows` | none / sm / md / lg / glassTeal / glassTealHover |
| `tokens.ts → durations` | instant (100ms) → xslow (600ms) |
| `theme.ts → ColorTokens` | bg / surface / foreground / muted / border / accent… |

---

## Anti-patterns to Avoid

❌ **Never** write `color: '#227a6c'` — use `theme.colors.accent`
❌ **Never** write `fontFamily: 'Inter'` — use `fonts.body` from tokens
❌ **Never** write `fontSize: 10` — use `fontSizes.xxs`
❌ **Never** write `borderRadius: 9999` — use `radii.full`
❌ **Never** create a one-off `StyleSheet.create` with duplicated glass/button styles — use `createGlobalStyles(theme)`
❌ **Never** call `createGlobalStyles` outside a component (it reads live theme)

---

## Skills to Use

Only pull in skills that are needed for the current task:

| Skill | When to use |
|-------|------------|
| `prototype` | Sketching a new screen layout quickly |
| `building-components` | Building a reusable UI component |
| `implement` | Implementing a complete feature end-to-end |
| `tdd` | When adding logic that needs test coverage |
| `codebase-design` | Before making a structural/architectural decision |
| `react-native-best-practices` | Ensuring optimal React Native styling, hooks, and performance patterns |

Do **not** invoke `grilling` or `grill-with-docs` mid-build — use them only for final review.

---

## Planning Docs

| File | Read it when... |
|------|----------------|
| `APP_STATE.md` | Starting a session — check what's done and what's next |
| `FEATURES.md` | Starting a feature — read the spec before writing any code |
| `ERROR_LOG.md` | Hitting an error — scan first before debugging |
