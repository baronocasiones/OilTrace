/**
 * GlassCard
 *
 * The foundational glassmorphic container.
 * Mirrors: .glass-panel  /  .glass-panel-elevated
 *
 * Props:
 *   elevated  → uses glassBgElevated + stronger shadow
 *   interactive → adds scale-press animation on touch
 *   style     → override / extend styles
 *
 * Usage:
 *   <GlassCard style={styles.myCard}>
 *     <Text>...</Text>
 *   </GlassCard>
 *
 *   <GlassCard elevated interactive onPress={handlePress}>
 *     ...
 *   </GlassCard>
 */

import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme';
import { createGlobalStyles } from '../../theme/globalStyles';
import { radii, durations } from '../../theme/tokens';

interface GlassCardProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  elevated?: boolean;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassCard({
  children,
  elevated = false,
  interactive = false,
  style,
  onPress,
  ...rest
}: GlassCardProps) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: 0.97,
      duration: durations.fast,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 8,
    }).start();
  };

  const cardStyle = [
    elevated ? g.glassPanelElevated : g.glassPanel,
    { borderRadius: radii.xxl },
    style,
  ];

  if (!interactive && !onPress) {
    return <View style={cardStyle}>{children}</View>;
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[{ transform: [{ scale }] }, cardStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
