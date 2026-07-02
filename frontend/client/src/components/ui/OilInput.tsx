/**
 * TextInput (OilTrace)
 *
 * Themed text input with label, error state, and focus outline.
 * Mirrors the input styles defined in globalStyles.ts / design system.
 *
 * Usage:
 *   <OilInput
 *     label="Mobile Number"
 *     placeholder="917 123 4567"
 *     prefix="+63"
 *     value={phone}
 *     onChangeText={setPhone}
 *     keyboardType="phone-pad"
 *     error={error}
 *   />
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  Animated,
  StyleSheet,
  type TextInputProps as RNTextInputProps,
} from 'react-native';
import { useTheme } from '../theme';
import { createGlobalStyles } from '../theme/globalStyles';
import { fonts, fontSizes, fontWeights, spacing, radii, durations } from '../theme/tokens';

interface OilInputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  prefix?: string;
  error?: string;
}

export function OilInput({ label, prefix, error, ...rest }: OilInputProps) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: durations.normal, useNativeDriver: false }).start();
    rest.onFocus?.({} as any);
  };

  const onBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: durations.normal, useNativeDriver: false }).start();
    rest.onBlur?.({} as any);
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.border, theme.colors.accent],
  });

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[g.labelSm, styles.label]}>{label}</Text>
      )}

      <Animated.View style={[g.input, { borderColor, flexDirection: 'row', alignItems: 'center' }]}>
        {prefix && (
          <Text style={[g.bodySm, g.textMuted, styles.prefix]}>{prefix}</Text>
        )}
        <RNTextInput
          {...rest}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholderTextColor={theme.colors.muted}
          style={[styles.input, { color: theme.colors.foreground, flex: 1 }]}
        />
      </Animated.View>

      {error ? (
        <View style={[g.errorBox, styles.errorBox]}>
          <Text style={g.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing[3],
  },
  label: {
    marginBottom: spacing[1],
  },
  prefix: {
    paddingRight: spacing[4],
  },
  input: {
    fontFamily: fonts.body,
    fontWeight: fontWeights.bold,
    fontSize: fontSizes.sm,
  },
  errorBox: {
    marginTop: spacing[2],
  },
});
