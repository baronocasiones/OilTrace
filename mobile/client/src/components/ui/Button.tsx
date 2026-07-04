/**
 * Button
 *
 * Polymorphic button covering every variant in the design system:
 *   solid-teal | glass-primary | glass | glass-secondary | glass-gold | glass-danger
 *
 * Usage:
 *   <Button variant="solid-teal" onPress={...}>Send OTP</Button>
 *   <Button variant="glass-primary" size="sm">Redeem Voucher</Button>
 *   <Button variant="glass-danger" loading>Cancelling…</Button>
 */

import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useTheme } from '../../theme';
import { createGlobalStyles } from '../../theme/globalStyles';
import { durations } from '../../theme/tokens';

export type ButtonVariant =
  | 'solid-teal'
  | 'glass-primary'
  | 'glass'
  | 'glass-secondary'
  | 'glass-gold'
  | 'glass-danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const sizeMap: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { paddingVertical: 6, paddingHorizontal: 10, fontSize: 11 },
  md: { paddingVertical: 10, paddingHorizontal: 16, fontSize: 13 },
  lg: { paddingVertical: 14, paddingHorizontal: 20, fontSize: 14 },
};

export function Button({
  children,
  variant = 'glass',
  size = 'md',
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  disabled,
  onPress,
  ...rest
}: ButtonProps) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: 0.96,
      duration: durations.instant,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 6,
    }).start();
  };

  const variantContainerStyle: Record<ButtonVariant, object> = {
    'solid-teal': g.btnSolidTeal,
    'glass-primary': g.btnGlassPrimary,
    'glass': g.btnGlass,
    'glass-secondary': g.btnGlassSecondary,
    'glass-gold': g.btnGlassGold,
    'glass-danger': g.btnGlassDanger,
  };

  const variantTextStyle: Record<ButtonVariant, object> = {
    'solid-teal': g.btnSolidTealText,
    'glass-primary': g.btnGlassPrimaryText,
    'glass': g.btnGlassText,
    'glass-secondary': g.btnGlassSecondaryText,
    'glass-gold': g.btnGlassGoldText,
    'glass-danger': g.btnGlassDangerText,
  };

  const { paddingVertical, paddingHorizontal, fontSize } = sizeMap[size];

  return (
    <Animated.View style={{ transform: [{ scale }], alignSelf: fullWidth ? 'stretch' : 'flex-start' }}>
      <Pressable
        onPress={disabled || loading ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          g.btnBase,
          variantContainerStyle[variant],
          { paddingVertical, paddingHorizontal },
          disabled && styles.disabled,
          style,
        ]}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'solid-teal' ? '#fff' : theme.colors.accent}
          />
        ) : null}
        <Text
          style={[
            variantTextStyle[variant],
            { fontSize },
            textStyle,
          ]}
        >
          {children}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});
