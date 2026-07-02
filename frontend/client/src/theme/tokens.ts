/**
 * OilTrace Design Tokens
 *
 * Single source of truth for all raw design values.
 * Extracted from OilTraceDesignSystem(1).html.
 *
 * Rule: Never hard-code a hex, font name, or pixel value in a component.
 *       Always reference a token from this file (or a semantic alias from theme.ts).
 */

// ─── Color Palette ────────────────────────────────────────────────────────────

export const palette = {
  // Brand teal (primary accent)
  teal100: '#e6f4f2',
  teal200: '#b3ddd8',
  teal300: '#80c7bf',
  teal400: '#4db0a5',
  tealLight: '#33a190',   // dark-mode accent
  tealBase: '#227a6c',    // light-mode accent
  tealDim: '#2e9f8f',     // dim-mode accent

  // Brand gold (secondary accent)
  gold100: '#fff8e0',
  goldLight: '#ffd44d',   // dark-mode secondary-dark
  goldBase: '#ffbf00',    // accent-secondary
  goldDark: '#ffc824',    // dark-mode accent-secondary
  goldDeep: '#cc9900',    // accent-secondary-dark (light + dim)

  // Semantic status
  success: '#52c41a',
  successDim: '#64b537',
  danger: '#ef4444',

  // Chart tertiary
  chartGreen: '#52c41a',
  chartGreenDark: '#64b537',

  // Neutral scale — light theme
  lightBg: '#fbf8fe',
  lightSurface: '#ffffff',
  lightForeground: '#09090b',
  lightMuted: '#64748b',
  lightBorder: '#e4e1e7',

  // Neutral scale — dark theme
  darkBg: '#0c0a0f',
  darkSurface: '#141217',
  darkForeground: '#f4f2f7',
  darkMuted: '#8c8896',
  darkBorder: '#2c2833',

  // Neutral scale — dim theme
  dimBg: '#121820',
  dimSurface: '#1a222d',
  dimForeground: '#e2e8f0',
  dimMuted: '#8895a5',
  dimBorder: '#2b3544',

  // Absolute
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────

export const fonts = {
  display: 'Manrope',   // headings / display numbers
  body: 'Inter',        // paragraphs / labels
  mono: 'JetBrains Mono', // transaction hashes / codes
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

export const fontSizes = {
  xxs: 10,   // 0.62rem  — uppercase labels / metadata
  xs: 11,    // 0.68rem  — small labels
  sm: 12,    // 0.75rem  — body small / captions
  base: 14,  // 0.875rem — default body
  md: 16,    // 1rem     — standard text
  lg: 18,    // 1.125rem — section headers
  xl: 20,    // 1.25rem  — screen titles
  xxl: 24,   // 1.5rem   — hero numbers
  display: 30, // large point balances / hero stats
} as const;

export const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

export const letterSpacings = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,    // used for UPPERCASE tracking labels
  widest: 1.5,
} as const;

// ─── Spacing Scale ────────────────────────────────────────────────────────────

export const spacing = {
  0: 0,
  1: 2,
  2: 4,
  3: 6,
  4: 8,
  5: 10,
  6: 12,
  7: 14,
  8: 16,
  9: 18,
  10: 20,
  12: 24,
  14: 28,
  16: 32,
  20: 40,
  24: 48,
  32: 64,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const radii = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 36,
  full: 9999,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────
// React Native shadow properties (iOS) / elevation (Android)

export const shadows = {
  none: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 8,
  },
  // Teal-tinted glass shadow (from design system)
  glassTeal: {
    shadowColor: palette.tealBase,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 6,
  },
  glassTealHover: {
    shadowColor: palette.tealBase,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 10,
  },
} as const;

// ─── Z-Index ──────────────────────────────────────────────────────────────────

export const zIndex = {
  base: 0,
  raised: 1,
  dropdown: 10,
  navbar: 30,
  overlay: 40,
  dynamicIsland: 50,
  toast: 999,
} as const;

// ─── Animation Timing ────────────────────────────────────────────────────────

export const durations = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 400,
  xslow: 600,
} as const;

// ─── Opacity ─────────────────────────────────────────────────────────────────

export const opacities = {
  0: 0,
  5: 0.05,
  8: 0.08,
  10: 0.10,
  12: 0.12,
  15: 0.15,
  20: 0.20,
  25: 0.25,
  40: 0.40,
  55: 0.55,
  65: 0.65,
  75: 0.75,
  80: 0.80,
  90: 0.90,
  100: 1,
} as const;
