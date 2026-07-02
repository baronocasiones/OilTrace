/**
 * AnimatedProgressBar
 *
 * A horizontal progress bar animated with react-native-reanimated.
 * Used in PartnerCard to visualize progress toward a reward.
 */

import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface AnimatedProgressBarProps {
  progress: number;
  color: string;
  bgColor: string;
  height?: number;
}

export function AnimatedProgressBar({
  progress,
  color,
  bgColor,
  height = 8,
}: AnimatedProgressBarProps) {
  const widthSV = useSharedValue(0);

  useEffect(() => {
    widthSV.value = withTiming(progress, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${Math.min(widthSV.value * 100, 100)}%`,
  }));

  return (
    <View style={[styles.track, { backgroundColor: bgColor, height }]}>
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: color, height },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 6,
  },
  fill: {
    borderRadius: 4,
  },
});
