/**
 * SkeletonBlock
 *
 * Loading placeholder that mirrors the rewards screen layout shape.
 * Rendered when cached data is available but a background refresh is in progress.
 */

// no direct React import needed — JSX is compiled by babel
import { View, StyleSheet } from 'react-native';
import { GlassCard } from '../../ui/GlassCard';
import { useTheme } from '../../../theme';

export function SkeletonBlock() {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={styles.container}>
      <GlassCard elevated style={styles.pointsCard}>
        <View style={[styles.bar, { width: 120, height: 12, backgroundColor: c.border }]} />
        <View
          style={[
            styles.bar,
            { width: 180, height: 36, backgroundColor: c.border, marginVertical: 8 },
          ]}
        />
        <View style={[styles.bar, { width: 100, height: 12, backgroundColor: c.border }]} />
      </GlassCard>
      <View
        style={[
          styles.bar,
          { width: 160, height: 14, backgroundColor: c.border, marginBottom: 12 },
        ]}
      />
      <GlassCard style={styles.card}>
        <View style={[styles.bar, { width: '60%', height: 14, backgroundColor: c.border }]} />
        <View
          style={[
            styles.bar,
            { width: '100%', height: 8, backgroundColor: c.border, marginTop: 12 },
          ]}
        />
        <View
          style={[
            styles.bar,
            { width: '50%', height: 14, backgroundColor: c.border, marginTop: 12 },
          ]}
        />
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  pointsCard: {
    padding: 24,
    marginBottom: 24,
  },
  card: {
    padding: 16,
    marginBottom: 12,
  },
  bar: {
    borderRadius: 6,
    opacity: 0.4,
  },
});
