/**
 * Skeleton
 *
 * Reusable shimmer skeleton primitives for loading states.
 * Uses Animated.loop with opacity pulse for a shimmer effect.
 *
 * Usage:
 *   <SkeletonBlock width={120} height={14} color={c.muted} />
 *   <SkeletonBlock width="60%" height={40} color={c.muted} style={{ borderRadius: radii.xl }} />
 */

import { useEffect, useRef } from 'react';
import { Animated, type ViewStyle } from 'react-native';
import { radii } from '../../theme/tokens';

interface SkeletonBlockProps {
  width: number | string;
  height: number;
  color: string;
  style?: ViewStyle;
}

export function SkeletonBlock({ width, height, color, style }: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radii.md,
          backgroundColor: `${color}26`,
          opacity,
        },
        style,
      ]}
    />
  );
}
