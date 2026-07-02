/**
 * Badge
 *
 * Status / grade badge pill matching the design system variants.
 *
 * Variants:
 *   premium    → teal (SAF grade)
 *   standard   → gold
 *   danger     → red (Low grade / failed)
 *   blockchain-verified | blockchain-pending | blockchain-failed
 *
 * Usage:
 *   <Badge variant="premium">Premium (SAF)</Badge>
 *   <Badge variant="blockchain-verified">Verified</Badge>
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { createGlobalStyles } from '../../theme/globalStyles';
import { fontSizes, fonts, fontWeights } from '../../theme/tokens';

export type BadgeVariant =
  | 'premium'
  | 'standard'
  | 'danger'
  | 'blockchain-verified'
  | 'blockchain-pending'
  | 'blockchain-failed';

interface BadgeProps {
  variant: BadgeVariant;
  children?: React.ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;

  const variantStyles: Record<BadgeVariant, { container: object; text: object; label: string }> = {
    premium: {
      container: g.badgePremium,
      text: g.badgePremiumText,
      label: children ? String(children) : 'Premium (SAF)',
    },
    standard: {
      container: g.badgeStandard,
      text: g.badgeStandardText,
      label: children ? String(children) : 'Standard',
    },
    danger: {
      container: g.badgeDanger,
      text: g.badgeDangerText,
      label: children ? String(children) : 'Low Grade',
    },
    'blockchain-verified': {
      container: { backgroundColor: `${c.accent}14`, borderColor: `${c.accent}40` },
      text: { color: c.accent },
      label: children ? String(children) : 'Verified',
    },
    'blockchain-pending': {
      container: { backgroundColor: `${c.accentSecondary}1A`, borderColor: `${c.accentSecondary}40` },
      text: { color: c.accentSecondaryDark },
      label: children ? String(children) : 'Pending',
    },
    'blockchain-failed': {
      container: g.badgeDanger,
      text: g.badgeDangerText,
      label: children ? String(children) : 'Failed',
    },
  };

  const v = variantStyles[variant];

  return (
    <View style={[g.badge, v.container]}>
      <Text style={[styles.text, v.text]}>{v.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fonts.body,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.xxs,
  },
});
