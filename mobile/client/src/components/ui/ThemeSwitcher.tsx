/**
 * ThemeSwitcher
 *
 * A 3-way segmented control for toggling between light, dark, and dim themes.
 * Uses react-native-reanimated for the sliding pill indicator with spring animation.
 *
 * Import:
 *   import { ThemeSwitcher } from '@/components/ui';
 *
 * Notes:
 *   - Three options: light (sun), dark (moon), dim (horizon / half-moon)
 *   - Active icon uses colors.accent, inactive uses colors.muted
 *   - Caller provides the current mode + setter; no internal state
 */

import React, { useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { radii, spacing } from '../../theme/tokens';
import type { ThemeMode } from '../../theme/theme';

// ─── Inline SVG Icon Components ─────────────────────────────────────────────

interface IconProps {
  color: string;
  size?: number;
}

function SunIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="12"
        r="4"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MoonIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DimIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Horizon line */}
      <Path
        d="M3 18h18"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Half sun above horizon */}
      <Path
        d="M17 18a5 5 0 00-10 0"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
      {/* Sun rays */}
      <Path
        d="M12 5v4M6.34 9.34l2.83 2.83M17.66 9.34l-2.83 2.83"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Options ─────────────────────────────────────────────────────────────────

interface ThemeOption {
  mode: ThemeMode;
  Icon: React.ComponentType<IconProps>;
  label: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { mode: 'light', Icon: SunIcon, label: 'Light' },
  { mode: 'dark', Icon: MoonIcon, label: 'Dark' },
  { mode: 'dim', Icon: DimIcon, label: 'Dim' },
];

// ─── ThemeSwitcher Component ─────────────────────────────────────────────────

interface ThemeSwitcherProps {
  currentMode: ThemeMode;
  onModeChange: (mode: ThemeMode) => void;
}

export function ThemeSwitcher({ currentMode, onModeChange }: ThemeSwitcherProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const pillTranslateX = useSharedValue(0);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const activeIndex = THEME_OPTIONS.findIndex((o) => o.mode === currentMode);

  useEffect(() => {
    if (containerWidth > 0 && activeIndex >= 0) {
      const segmentWidth = containerWidth / THEME_OPTIONS.length;
      pillTranslateX.value = activeIndex * segmentWidth;
    }
  }, [activeIndex, containerWidth]);

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withSpring(pillTranslateX.value, {
          damping: 16,
          stiffness: 150,
        }),
      },
    ],
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const segmentWidth = containerWidth > 0 ? containerWidth / THEME_OPTIONS.length : 0;
  const pillWidth = segmentWidth > 0 ? segmentWidth - spacing[4] : 0;

  return (
    <View
      style={[styles.container, { borderColor: c.border }]}
      onLayout={handleLayout}
    >
      {/* Sliding pill indicator */}
      {pillWidth > 0 && (
        <Animated.View
          style={[
            styles.pill,
            {
              width: pillWidth,
              backgroundColor: `${c.accent}1A`,
              borderColor: `${c.accent}30`,
              left: spacing[2],
            },
            pillAnimatedStyle,
          ]}
        />
      )}

      {/* Segments */}
      {THEME_OPTIONS.map((option, idx) => {
        const isActive = idx === activeIndex;
        return (
          <Pressable
            key={option.mode}
            onPress={() => onModeChange(option.mode)}
            style={styles.segment}
          >
            <option.Icon
              color={isActive ? c.accent : c.muted}
              size={20}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.full,
    borderWidth: 1,
    height: 44,
    position: 'relative',
    overflow: 'hidden',
  },
  pill: {
    position: 'absolute',
    top: spacing[2],
    bottom: spacing[2],
    borderRadius: radii.full,
    borderWidth: 1,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    zIndex: 2,
  },
});
