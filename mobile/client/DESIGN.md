# OilTrace Design System

A developer handbook for building consistent UI in the OilTrace mobile client.

---

## Architecture

```
src/
  theme/          — Design tokens → semantic theme
    tokens.ts     — Raw values (colors, typography, spacing, radii, shadows)
    theme.ts      — Semantic alias maps per mode (light, dark, dim)
    ThemeContext.tsx — React context providing the active theme
    globalStyles.ts  — Theme-aware StyleSheet factories
  components/
    ui/           — Reusable primitives (Button, GlassCard, Badge, Typography)
  app/            — Expo Router screens
  store/          — Zustand state stores
```

**Rule:** Never hard-code a hex, font name, pixel radius, or shadow in a feature component. Import from `theme/tokens.ts` or use `useTheme()` to get the semantic theme.

---

## Theming

### Theme Modes

The app supports three modes: `light`, `dark`, `dim`. **Light mode is the default.**

```tsx
import { useTheme } from '@/theme/ThemeContext';

function MyComponent() {
  const { theme } = useTheme();
  const { colors, fonts, fontSizes, spacing, radii, shadows } = theme;
  // c is a handy alias for colors
  const c = theme.colors;
}
```

### Theme Context

`ThemeProvider` wraps the app root in `_layout.tsx`. It provides:

| Value   | Description                                |
| ------- | ------------------------------------------ |
| `theme` | Full `Theme` object (colors + tokens)      |
| `mode`  | Current mode string (`'light'`/`'dark'`/`'dim'`) |

### Semantic Color Aliases

Use these from `theme.colors.*` — never raw hex values:

| Token                 | Purpose                                 |
| --------------------- | --------------------------------------- |
| `bg`                  | Screen background                       |
| `surface`             | Card / sheet surface                    |
| `foreground`          | Primary text                            |
| `muted`               | Secondary text / subtle icons           |
| `border`              | Solid borders                           |
| `accent`              | Primary brand (teal) — CTAs, active tab |
| `accentSecondary`     | Gold accent                             |
| `accentSecondaryDark` | Deep gold (on light bg)                 |
| `glassBg`             | Glassmorphic panel fill                 |
| `glassBgElevated`     | Elevated glass fill (modals, sheets)    |
| `glassBorder`         | Glass panel border                      |
| `danger`              | Error / destructive                     |
| `success`             | Success states                          |

---

## Typography

### Font Families

| Role      | Font          | Usage                        |
| --------- | ------------- | ---------------------------- |
| Display   | `Manrope`     | Headings, hero numbers       |
| Body      | `Inter`       | Paragraphs, labels, buttons  |
| Mono      | `JetBrains Mono` | Transaction hashes, codes |

### Font Sizes (from `fontSizes`)

| Token  | Value | Usage                      |
| ------ | ----- | -------------------------- |
| `xxs`  | 10    | Uppercase labels, metadata |
| `xs`   | 11    | Small labels               |
| `sm`   | 12    | Body small, captions       |
| `base` | 14    | Default body               |
| `md`   | 16    | Standard text              |
| `lg`   | 18    | Section headers            |
| `xl`   | 20    | Screen titles              |
| `xxl`  | 24    | Hero numbers               |
| `display` | 30 | Large point balances       |

### Typography Components

Prefer these over raw `<Text>`:

```tsx
<Heading size="lg" />    // Manrope ExtraBold 30px
<Heading size="md" />    // Manrope ExtraBold 24px
<Heading size="sm" />    // Manrope Bold 20px

<BodyText size="md" />           // Inter Regular 14px
<BodyText size="sm" muted />     // Inter Regular 12px, muted color
<BodyText size="sm" accent />    // Inter Regular 12px, accent color

<Label />                // Inter Bold 10px, uppercase, tracking-wide
<Label size="md" />      // Inter Bold 11px, uppercase, tracking-wide

<Mono />                 // JetBrains Mono Regular 11px
```

### Global Styles

For quick layout and common patterns, use the `g` object from `createGlobalStyles(theme)`:

```tsx
const g = createGlobalStyles(theme);
// Available:
g.glassPanel           // Glassmorphic card (base)
g.glassPanelElevated   // Glass card with stronger shadow
g.row                  // flexDirection: 'row', alignItems: 'center'
g.rowBetween           // row + justifyContent: 'space-between'
g.col                  // flexDirection: 'column'
g.textAccent           // { color: colors.accent }
g.textMuted            // { color: colors.muted }
g.btnBase              // Button base shape
g.btnSolidTeal         // Solid teal button
g.btnGlass             // Neutral glass button
g.btnGlassPrimary      // Teal-tinted glass button
g.input                // Text input base style
g.errorBox             // Error banner
g.iconContainerAccent  // Teal icon circle
g.labelSm              // 10px uppercase label
g.labelMd              // 11px uppercase label
g.divider              // Horizontal divider
```

---

## Glassmorphism

### GlassCard

The primary container primitive. Variants:

```tsx
<GlassCard>                          // base glass panel
<GlassCard elevated>                 // elevated shadow
<GlassCard elevated interactive>     // pressable with scale animation
<GlassCard interactive onPress={fn}> // interactive + handler
```

GlassCard automatically applies:
- `backgroundColor: colors.glassBg`
- `borderWidth: 1, borderColor: colors.glassBorder`
- `borderRadius: radii.xxl` (20px)
- Teal-tinted shadow

### Frosted Nav Bar (iOS)

The custom tab bar uses `BlurView` on iOS with tint matching the active mode. On Android, it falls back to `colors.glassBg` with elevation.

---

## Buttons

### Variants

| Variant          | Style                                  |
| ---------------- | -------------------------------------- |
| `solid-teal`     | Solid teal fill, white text (primary)  |
| `glass-primary`  | Teal-tinted glass outline              |
| `glass`          | Neutral glass outline                  |
| `glass-secondary`| Muted glass outline                    |
| `glass-gold`     | Gold-tinted glass outline              |
| `glass-danger`   | Red-tinted glass outline               |

### Sizes

| Size | Padding (V, H) | Font |
| ---- | -------------- | ---- |
| `sm` | 6, 10          | 11   |
| `md` | 10, 16         | 13   |
| `lg` | 14, 20         | 14   |

### Props

```tsx
<Button
  variant="solid-teal"
  size="md"
  fullWidth
  loading={isSubmitting}
  onPress={handleSubmit}
  disabled={isOffline}
>
  Submit
</Button>
```

Every button has a built-in scale animation (0.96 on pressIn, spring back on pressOut).

---

## Icons

Use `@expo/vector-icons/MaterialCommunityIcons` for general UI icons.

```tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
<MaterialCommunityIcons name="bell-outline" size={22} color={c.foreground} />
```

For the bottom tab bar, inline SVG icons are used with a consistent **1.75px stroke weight** for a cohesive outline style.

---

## Layout Structure

### Screen Pattern

```tsx
export default function Screen() {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;

  return (
    <View style={g.screenBg}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 220 }}
        refreshControl={<RefreshControl ... />}
      >
        {/* Content here */}
      </ScrollView>
    </View>
  );
}
```

### Brand Header

The top header bar on the Dashboard follows this pattern:

```
┌──────────────────────────────┐
│  [logo] OILTRACE        [🔔] │
└──────────────────────────────┘
```

- Logo: `OilTraceLogo.png` (34×34)
- Title: `Manrope ExtraBold 22px`
- Bell icon with unread badge count

### Bottom Tab Bar

The custom tab bar uses:
- 4 tabs: Dashboard, History, Rewards, Profile
- Animated sliding pill indicator on the active tab
- Spring-based scale animation on press (0.92 press, 1.08 active, 1.0 idle)
- Tab label font: `Inter-SemiBold` (active) / `Inter-Regular` (inactive) at 10px
- iOS: `BlurView` with light/dark tint; Android: `glassBg` fallback
- Container bottom padding accounts for safe-area inset

---

## Spacing & Radii

### Spacing Scale

Use `spacing[N]` from tokens — values in `theme.spacing`:

`0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64`

### Border Radius

| Token  | Value | Usage                  |
| ------ | ----- | ---------------------- |
| `sm`   | 4     | Small elements         |
| `md`   | 8     |                        |
| `lg`   | 12    | Inputs, buttons        |
| `xl`   | 16    | Icon containers        |
| `xxl`  | 20    | Cards, panels          |
| `2xl`  | 24    |                        |
| `3xl`  | 32    |                        |
| `full` | 9999  | Pills, circular badges |

---

## Creating a New Feature

1. **Create the screen file** in `src/app/(consumer)/<feature>.tsx`
2. **Register the tab** in `src/app/(consumer)/_layout.tsx`
3. **Use semantic aliases** — never raw hex values
4. **Use Typography components** — avoid raw `<Text>` for body content
5. **Use `g` (createGlobalStyles)** for layout (`row`, `rowBetween`, `center`)
6. **Use `GlassCard`** for containers that need the glass aesthetic
7. **Use `Button`** variants for interactions
8. **Handle all states**: loading, empty, error, success, offline
9. **Add styles to the component's StyleSheet** — group by section with comments

### State Handling Checklist

| State     | Pattern                                  |
| --------- | ---------------------------------------- |
| Loading   | `ActivityIndicator` + descriptive text   |
| Empty     | Icon + helpful message + CTA if possible |
| Error     | Error message + retry button             |
| Success   | Success message / confirmation           |
| Offline   | Banner at top of screen                  |

---

## Shadows

Shadows use teal-tinted colors for the glass aesthetic:

```ts
// Available shadow presets (from tokens.ts):
shadows.none
shadows.sm     // 0 2px 8px, opacity 0.06
shadows.md     // 0 4px 16px, opacity 0.10
shadows.lg     // 0 8px 32px, opacity 0.15
shadows.glassTeal      // teal-tinted, 0 8px 32px, opacity 0.08
shadows.glassTealHover // teal-tinted, 0 12px 40px, opacity 0.12
```

---

## Key Conventions

- **Types** are defined inline or in a co-located types file
- **Mocks** live in `src/mocks/` and match the API response shape
- **Stores** use Zustand with AsyncStorage persistence for offline support
- **No inline styles** in render functions — use StyleSheet.create or `g` helpers
- **Screens** are PascalCase function components exported as default
- **Components** are PascalCase named exports
