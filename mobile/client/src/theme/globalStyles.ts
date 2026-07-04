/**
 * globalStyles.ts
 *
 * Pre-built StyleSheet fragments that map 1-to-1 with the CSS utility classes
 * defined in OilTraceDesignSystem(1).html.
 *
 * These are THEME-AWARE — you must call createGlobalStyles(theme) to get them.
 *
 * Usage:
 *   const { theme } = useTheme();
 *   const g = createGlobalStyles(theme);
 *   <View style={[g.glassPanel, g.interactiveCard]}>
 */

import { StyleSheet } from 'react-native';
import type { Theme } from './theme';

export function createGlobalStyles(theme: Theme) {
  const { colors, radii, spacing, shadows, fontSizes, fonts, fontWeights, letterSpacings } = theme;

  return StyleSheet.create({

    // ── Layout ────────────────────────────────────────────────────────────────

    screenBg: {
      flex: 1,
      backgroundColor: colors.bg,
    },

    surfaceBg: {
      backgroundColor: colors.surface,
    },

    // ── Glass Panel (.glass-panel) ────────────────────────────────────────────

    glassPanel: {
      backgroundColor: colors.glassBg,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      ...shadows.glassTeal,
    },

    glassPanelElevated: {
      backgroundColor: colors.glassBgElevated,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
      ...shadows.glassTealHover,
    },

    // ── Border Radius presets ────────────────────────────────────────────────

    rounded: { borderRadius: radii.lg },         // rounded-xl  (12px)
    roundedLg: { borderRadius: radii.xl },        // rounded-2xl (16px)
    roundedXl: { borderRadius: radii.xxl },       // rounded-2xl (20px)
    roundedFull: { borderRadius: radii.full },    // rounded-full

    // ── Interactive Card (.interactive-card) ─────────────────────────────────
    // Note: pressable state handled via Animated.View in components.

    interactiveCard: {
      // Static styles — animated transform applied at component level
      borderRadius: radii.xxl,
      overflow: 'hidden',
    },

    // ── Typography ────────────────────────────────────────────────────────────

    // Display / headings (Manrope)
    displayLg: {
      fontFamily: fonts.display,
      fontWeight: fontWeights.extrabold,
      fontSize: fontSizes.display,
      color: colors.foreground,
    },
    displayMd: {
      fontFamily: fonts.display,
      fontWeight: fontWeights.extrabold,
      fontSize: fontSizes.xxl,
      color: colors.foreground,
    },
    displaySm: {
      fontFamily: fonts.display,
      fontWeight: fontWeights.bold,
      fontSize: fontSizes.xl,
      color: colors.foreground,
    },

    // Body (Inter)
    bodyLg: {
      fontFamily: fonts.body,
      fontWeight: fontWeights.regular,
      fontSize: fontSizes.md,
      color: colors.foreground,
    },
    bodyMd: {
      fontFamily: fonts.body,
      fontWeight: fontWeights.regular,
      fontSize: fontSizes.base,
      color: colors.foreground,
    },
    bodySm: {
      fontFamily: fonts.body,
      fontWeight: fontWeights.regular,
      fontSize: fontSizes.sm,
      color: colors.foreground,
    },

    // Labels — bold uppercase (tracking wider)
    labelMd: {
      fontFamily: fonts.body,
      fontWeight: fontWeights.bold,
      fontSize: fontSizes.xs,
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: letterSpacings.wider,
    },
    labelSm: {
      fontFamily: fonts.body,
      fontWeight: fontWeights.bold,
      fontSize: fontSizes.xxs,
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: letterSpacings.wider,
    },

    // Monospace (JetBrains Mono — tx hashes, codes)
    mono: {
      fontFamily: fonts.mono,
      fontWeight: fontWeights.regular,
      fontSize: fontSizes.xs,
      color: colors.muted,
    },

    // ── Accent Text ───────────────────────────────────────────────────────────

    textAccent: { color: colors.accent },
    textGold: { color: colors.accentSecondaryDark },
    textMuted: { color: colors.muted },
    textForeground: { color: colors.foreground },
    textDanger: { color: colors.danger },

    // ── Buttons ───────────────────────────────────────────────────────────────
    // Base pressable shape — pair with a variant below.

    btnBase: {
      borderRadius: radii.full,
      paddingVertical: spacing[6],
      paddingHorizontal: spacing[8],
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: spacing[4],
    },

    // .btn-solid-teal
    btnSolidTeal: {
      backgroundColor: colors.accent,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
      ...shadows.md,
    },
    btnSolidTealText: {
      fontFamily: fonts.body,
      fontWeight: fontWeights.bold,
      fontSize: fontSizes.sm,
      color: '#ffffff',
    },

    // .btn-glass-primary (teal tint)
    btnGlassPrimary: {
      backgroundColor: `${colors.accent}1A`, // ~10% opacity
      borderWidth: 1,
      borderColor: `${colors.accent}40`,      // ~25% opacity
    },
    btnGlassPrimaryText: {
      fontFamily: fonts.body,
      fontWeight: fontWeights.bold,
      fontSize: fontSizes.sm,
      color: colors.accent,
    },

    // .btn-glass (neutral)
    btnGlass: {
      backgroundColor: `${colors.foreground}0D`, // ~5%
      borderWidth: 1,
      borderColor: `${colors.foreground}1F`,      // ~12%
    },
    btnGlassText: {
      fontFamily: fonts.body,
      fontWeight: fontWeights.semibold,
      fontSize: fontSizes.sm,
      color: colors.foreground,
    },

    // .btn-glass-secondary (muted)
    btnGlassSecondary: {
      backgroundColor: `${colors.muted}0F`, // ~6%
      borderWidth: 1,
      borderColor: `${colors.muted}26`,     // ~15%
    },
    btnGlassSecondaryText: {
      fontFamily: fonts.body,
      fontWeight: fontWeights.semibold,
      fontSize: fontSizes.sm,
      color: colors.muted,
    },

    // .btn-glass-gold
    btnGlassGold: {
      backgroundColor: `${colors.accentSecondary}14`, // ~8%
      borderWidth: 1,
      borderColor: `${colors.accentSecondary}33`,      // ~20%
    },
    btnGlassGoldText: {
      fontFamily: fonts.body,
      fontWeight: fontWeights.bold,
      fontSize: fontSizes.sm,
      color: colors.accentSecondaryDark,
    },

    // .btn-glass-danger
    btnGlassDanger: {
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    btnGlassDangerText: {
      fontFamily: fonts.body,
      fontWeight: fontWeights.bold,
      fontSize: fontSizes.sm,
      color: colors.danger,
    },

    // ── Badges / Pills ────────────────────────────────────────────────────────

    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[1],
      borderRadius: radii.full,
      borderWidth: 1,
      alignSelf: 'flex-start',
    },
    badgeText: {
      fontFamily: fonts.body,
      fontWeight: fontWeights.bold,
      fontSize: fontSizes.xxs,
    },

    // Grade badges
    badgePremium: {
      backgroundColor: `${colors.accent}1A`,
      borderColor: `${colors.accent}40`,
    },
    badgePremiumText: { color: colors.accent },

    badgeStandard: {
      backgroundColor: `${colors.accentSecondary}1A`,
      borderColor: `${colors.accentSecondary}40`,
    },
    badgeStandardText: { color: colors.accentSecondaryDark },

    badgeDanger: {
      backgroundColor: colors.dangerBg,
      borderColor: colors.dangerBorder,
    },
    badgeDangerText: { color: colors.danger },

    // ── Divider ───────────────────────────────────────────────────────────────

    divider: {
      height: 1,
      backgroundColor: colors.border,
      opacity: 0.4,
    },

    // ── Input ────────────────────────────────────────────────────────────────

    input: {
      fontFamily: fonts.body,
      fontWeight: fontWeights.bold,
      fontSize: fontSizes.sm,
      color: colors.foreground,
      backgroundColor: `${colors.surface}99`, // 60% opacity
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      paddingVertical: spacing[5],
      paddingHorizontal: spacing[6],
    },

    inputFocused: {
      borderColor: colors.accent,
    },

    // ── Error state (form) ────────────────────────────────────────────────────

    errorBox: {
      padding: spacing[5],
      borderRadius: radii.lg,
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    errorText: {
      fontFamily: fonts.body,
      fontWeight: fontWeights.semibold,
      fontSize: fontSizes.sm,
      color: colors.danger,
      textAlign: 'center',
    },

    // ── Icon container ────────────────────────────────────────────────────────

    iconContainerAccent: {
      padding: spacing[5],
      borderRadius: radii.xl,
      backgroundColor: `${colors.accent}1A`,
      borderWidth: 1,
      borderColor: `${colors.accent}26`,
    },

    iconContainerGold: {
      padding: spacing[5],
      borderRadius: radii.xl,
      backgroundColor: `${colors.accentSecondary}14`,
      borderWidth: 1,
      borderColor: `${colors.accentSecondary}26`,
    },

    // ── Row / Stack helpers ───────────────────────────────────────────────────

    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowEnd: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    col: {
      flexDirection: 'column',
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}

export type GlobalStyles = ReturnType<typeof createGlobalStyles>;
