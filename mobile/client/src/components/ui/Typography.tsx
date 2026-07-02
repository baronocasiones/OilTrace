/**
 * Typography
 *
 * Convenience wrappers so features don't repeat font/weight/color
 * inline — they just use <Heading>, <Label>, <Mono>, etc.
 *
 * Usage:
 *   <Heading size="lg">Dashboard</Heading>
 *   <Label>Available Points</Label>
 *   <Mono>0x1a2b…</Mono>
 *   <BodyText muted>10 PTS = ₱5.00 discount</BodyText>
 */

import React from 'react';
import { Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '../../theme';
import { createGlobalStyles } from '../../theme/globalStyles';

// ─── Heading ─────────────────────────────────────────────────────────────────

interface HeadingProps extends TextProps {
  size?: 'lg' | 'md' | 'sm';
  style?: StyleProp<TextStyle>;
}

export function Heading({ size = 'md', style, ...rest }: HeadingProps) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const sizeStyle = { lg: g.displayLg, md: g.displayMd, sm: g.displaySm }[size];
  return <Text style={[sizeStyle, style]} {...rest} />;
}

// ─── BodyText ─────────────────────────────────────────────────────────────────

interface BodyTextProps extends TextProps {
  size?: 'lg' | 'md' | 'sm';
  muted?: boolean;
  accent?: boolean;
  danger?: boolean;
  style?: StyleProp<TextStyle>;
}

export function BodyText({ size = 'md', muted, accent, danger, style, ...rest }: BodyTextProps) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const sizeStyle = { lg: g.bodyLg, md: g.bodyMd, sm: g.bodySm }[size];
  const colorStyle = muted ? g.textMuted : accent ? g.textAccent : danger ? g.textDanger : g.textForeground;
  return <Text style={[sizeStyle, colorStyle, style]} {...rest} />;
}

// ─── Label ────────────────────────────────────────────────────────────────────

interface LabelProps extends TextProps {
  size?: 'md' | 'sm';
  style?: StyleProp<TextStyle>;
}

export function Label({ size = 'sm', style, ...rest }: LabelProps) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const sizeStyle = { md: g.labelMd, sm: g.labelSm }[size];
  return <Text style={[sizeStyle, style]} {...rest} />;
}

// ─── Mono ─────────────────────────────────────────────────────────────────────

export function Mono({ style, ...rest }: TextProps) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  return <Text style={[g.mono, style]} {...rest} />;
}
