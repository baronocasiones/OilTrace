/**
 * OilTrace Semantic Theme
 *
 * Maps raw design tokens → semantic role names.
 * Components MUST import from here, never directly from tokens.ts.
 *
 * Mirrors the three theme variants from OilTraceDesignSystem(1).html:
 *   theme-light  →  light
 *   theme-dark   →  dark
 *   theme-dim    →  dim
 */

import { palette, shadows, fonts, fontWeights, fontSizes, letterSpacings, spacing, radii } from './tokens';

// ─── Type Definitions ─────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'dim';

export interface ColorTokens {
  // Layout
  bg: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;

  // Brand accents
  accent: string;
  accentSecondary: string;
  accentSecondaryDark: string;

  // Glass surface variants
  glassBg: string;
  glassBgElevated: string;
  glassBorder: string;

  // Chart-specific
  chartPrimary: string;
  chartPrimaryGlow: string;
  chartSecondary: string;
  chartSecondaryGlow: string;
  chartTertiary: string;
  chartTertiaryGlow: string;
  chartBg: string;
  chartGrid: string;
  chartText: string;

  // Status
  danger: string;
  dangerBg: string;
  dangerBorder: string;
  success: string;
  successBg: string;
}

// ─── Theme Definitions ────────────────────────────────────────────────────────

const light: ColorTokens = {
  bg: palette.lightBg,
  surface: palette.lightSurface,
  foreground: palette.lightForeground,
  muted: palette.lightMuted,
  border: palette.lightBorder,

  accent: palette.tealBase,
  accentSecondary: palette.goldBase,
  accentSecondaryDark: palette.goldDeep,

  glassBg: 'rgba(255, 255, 255, 0.55)',
  glassBgElevated: 'rgba(255, 255, 255, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.65)',

  chartPrimary: palette.tealBase,
  chartPrimaryGlow: 'rgba(34, 122, 108, 0.15)',
  chartSecondary: palette.goldBase,
  chartSecondaryGlow: 'rgba(255, 191, 0, 0.15)',
  chartTertiary: palette.chartGreen,
  chartTertiaryGlow: 'rgba(82, 196, 26, 0.15)',
  chartBg: 'rgba(228, 225, 231, 0.35)',
  chartGrid: 'rgba(228, 225, 231, 0.6)',
  chartText: palette.lightMuted,

  danger: palette.danger,
  dangerBg: 'rgba(239, 68, 68, 0.08)',
  dangerBorder: 'rgba(239, 68, 68, 0.2)',
  success: palette.success,
  successBg: 'rgba(82, 196, 26, 0.10)',
};

const dark: ColorTokens = {
  bg: palette.darkBg,
  surface: palette.darkSurface,
  foreground: palette.darkForeground,
  muted: palette.darkMuted,
  border: palette.darkBorder,

  accent: palette.tealLight,
  accentSecondary: palette.goldDark,
  accentSecondaryDark: palette.goldLight,

  glassBg: 'rgba(20, 18, 23, 0.65)',
  glassBgElevated: 'rgba(30, 27, 35, 0.8)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',

  chartPrimary: palette.tealLight,
  chartPrimaryGlow: 'rgba(51, 161, 144, 0.25)',
  chartSecondary: palette.goldDark,
  chartSecondaryGlow: 'rgba(255, 200, 36, 0.25)',
  chartTertiary: palette.chartGreenDark,
  chartTertiaryGlow: 'rgba(100, 181, 55, 0.25)',
  chartBg: 'rgba(44, 40, 51, 0.4)',
  chartGrid: 'rgba(44, 40, 51, 0.65)',
  chartText: palette.darkMuted,

  danger: palette.danger,
  dangerBg: 'rgba(239, 68, 68, 0.08)',
  dangerBorder: 'rgba(239, 68, 68, 0.2)',
  success: palette.chartGreenDark,
  successBg: 'rgba(100, 181, 55, 0.10)',
};

const dim: ColorTokens = {
  bg: palette.dimBg,
  surface: palette.dimSurface,
  foreground: palette.dimForeground,
  muted: palette.dimMuted,
  border: palette.dimBorder,

  accent: palette.tealDim,
  accentSecondary: palette.goldBase,
  accentSecondaryDark: palette.goldDeep,

  glassBg: 'rgba(26, 34, 45, 0.7)',
  glassBgElevated: 'rgba(36, 47, 62, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',

  chartPrimary: palette.tealDim,
  chartPrimaryGlow: 'rgba(46, 159, 143, 0.25)',
  chartSecondary: palette.goldBase,
  chartSecondaryGlow: 'rgba(255, 191, 0, 0.25)',
  chartTertiary: palette.chartGreen,
  chartTertiaryGlow: 'rgba(82, 196, 26, 0.25)',
  chartBg: 'rgba(43, 53, 68, 0.45)',
  chartGrid: 'rgba(43, 53, 68, 0.65)',
  chartText: palette.dimMuted,

  danger: palette.danger,
  dangerBg: 'rgba(239, 68, 68, 0.08)',
  dangerBorder: 'rgba(239, 68, 68, 0.2)',
  success: palette.success,
  successBg: 'rgba(82, 196, 26, 0.10)',
};

export const themes: Record<ThemeMode, ColorTokens> = { light, dark, dim };

// ─── Full Theme Object ────────────────────────────────────────────────────────
// Combines colors + non-color tokens into one shape.

export interface Theme {
  mode: ThemeMode;
  colors: ColorTokens;
  fonts: typeof fonts;
  fontWeights: typeof fontWeights;
  fontSizes: typeof fontSizes;
  letterSpacings: typeof letterSpacings;
  spacing: typeof spacing;
  radii: typeof radii;
  shadows: typeof shadows;
}

export function buildTheme(mode: ThemeMode): Theme {
  return {
    mode,
    colors: themes[mode],
    fonts,
    fontWeights,
    fontSizes,
    letterSpacings,
    spacing,
    radii,
    shadows,
  };
}

export const defaultTheme = buildTheme('light');
