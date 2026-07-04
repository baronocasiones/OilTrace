/**
 * RewardPulseText
 *
 * Animated points balance text that pulses (scale + color shift to gold)
 * on mount and whenever the points value changes.
 *
 * Implements the rewardPulse animation from the HTML design system:
 *   scale 1.12 + color shift to var(--accent-secondary-dark) at peak.
 */

import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';

interface RewardPulseTextProps {
  points: number;
  defaultColor: string;
  goldColor: string;
}

export function RewardPulseText({
  points,
  defaultColor,
  goldColor,
}: RewardPulseTextProps) {
  const animation = useSharedValue(0);

  useEffect(() => {
    // Trigger pulse: 0 → 1 → 0 (each cycle is scale bump + color shift)
    animation.value = withSequence(
      withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 10, stiffness: 100 }),
    );
  }, [points]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale:
            animation.value === 0
              ? 1
              : animation.value < 0.5
                ? 1 + animation.value * 0.24
                : 1.12 - (animation.value - 0.5) * 0.08,
        },
      ],
      color: interpolateColor(
        animation.value,
        [0, 0.5, 1],
        [defaultColor, goldColor, goldColor],
      ),
    };
  });

  return (
    <Animated.Text
      style={[
        styles.hero,
        { color: defaultColor, fontFamily: 'Manrope' },
        animatedStyle,
      ]}
    >
      {points.toLocaleString()} pts
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  hero: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
});
