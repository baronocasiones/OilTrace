/**
 * History Screen (F-004)
 *
 * Tab 2 of 4 — Collection history list with:
 * - FlashList of CollectionCard items for 60fps scrolling
 * - Pull-to-refresh
 * - Empty state
 * - Loading skeleton
 * - Offline banner
 * - Error state with retry
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme, type Theme } from '../../theme';
import { createGlobalStyles } from '../../theme/globalStyles';
import { GlassCard } from '../../components/ui/GlassCard';
import { Heading, BodyText } from '../../components/ui/Typography';
import { CollectionCard } from '../../components/consumer/CollectionCard';
import { useHistoryStore } from '../../store/historyStore';
import type { CollectionListItem } from '../../mocks/history';

// ─── Skeleton Placeholder ───────────────────────────────────────────────

function SkeletonCard() {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;
  const styles = getStyles(theme);

  return (
    <GlassCard style={styles.skeletonCard}>
      <View style={g.rowBetween}>
        <View style={styles.skelLeft}>
          {/* Date skeleton */}
          <View style={[styles.skelBar, { width: 100, height: 10, backgroundColor: c.border }]} />
          {/* Volume skeleton */}
          <View style={[styles.skelBar, { width: 60, height: 20, backgroundColor: c.border }]} />
          {/* TPM skeleton */}
          <View style={[styles.skelBar, { width: 80, height: 10, backgroundColor: c.border }]} />
          {/* Badges skeleton */}
          <View style={[g.row, { gap: theme.spacing[2], marginTop: theme.spacing[2] }]}>
            <View style={[styles.skelBadge, { backgroundColor: c.border }]} />
            <View style={[styles.skelBadge, { backgroundColor: c.border }]} />
          </View>
        </View>
        {/* Points skeleton */}
        <View style={[styles.skelBar, { width: 50, height: 14, backgroundColor: c.border }]} />
      </View>
    </GlassCard>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────

function EmptyState() {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;
  const styles = getStyles(theme);

  return (
    <View style={styles.emptyContainer}>
      <View style={[g.iconContainerAccent, styles.emptyIconBox]}>
        <MaterialCommunityIcons name="inbox-outline" size={40} color={c.accent} />
      </View>
      <Heading size="md" style={styles.emptyTitle}>
        No collections yet
      </Heading>
      <BodyText muted style={styles.emptyText}>
        Once your oil is collected, it will appear here.
      </BodyText>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;
  const styles = getStyles(theme);

  const {
    collections,
    isLoading,
    error,
    isOffline,
    fetchHistory,
  } = useHistoryStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory(true);
    setRefreshing(false);
  }, [fetchHistory]);

  const handleCollectionPress = useCallback(
    (id: string) => {
      router.push(`/(consumer)/history/${id}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: CollectionListItem; index: number }) => (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 4) * 50).duration(200).springify().damping(15)}>
        <CollectionCard
          collection={item}
          onPress={() => handleCollectionPress(item.id)}
        />
      </Animated.View>
    ),
    [handleCollectionPress],
  );

  const keyExtractor = useCallback((item: CollectionListItem) => item.id, []);

  // ── Loading skeleton (first load only) ─────────────────────────────
  if (isLoading && collections.length === 0) {
    return (
      <View style={[g.screenBg]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Heading size="lg" style={g.textAccent}>
            Collection History
          </Heading>
        </View>

        {/* Offline banner (visible during load if offline) */}
        {isOffline && (
          <View style={[g.errorBox, styles.offlineBanner]}>
            <BodyText style={g.errorText}>
              <MaterialCommunityIcons name="wifi-off" size={16} />{' '}
              You're offline (showing cached data)
            </BodyText>
          </View>
        )}

        <View style={styles.skeletonList}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  // ── Error with no data ────────────────────────────────────────────
  if (error && collections.length === 0) {
    return (
      <View style={[g.screenBg]}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Heading size="lg" style={g.textAccent}>
            Collection History
          </Heading>
        </View>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={c.danger} />
          <Heading size="md" style={styles.errorTitle}>
            {error}
          </Heading>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: c.accent }]}
            onPress={() => fetchHistory(true)}
            activeOpacity={0.8}
          >
            <BodyText style={{ color: c.bg, fontWeight: theme.fontWeights.bold, fontFamily: theme.fonts.body }}>
              Retry Connection
            </BodyText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main list ─────────────────────────────────────────────────────
  return (
    <View style={[g.screenBg]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Heading size="lg" style={g.textAccent}>
          Collection History
        </Heading>
        {isOffline && (
          <View style={[g.errorBox, styles.offlineInlineBanner]}>
            <BodyText style={g.errorText}>
              <MaterialCommunityIcons name="wifi-off" size={14} />{' '}
              Offline (cached)
            </BodyText>
          </View>
        )}
      </View>

      {/* Offline banner (data available but offline) */}
      {isOffline && collections.length > 0 && (
        <View style={[g.errorBox, styles.offlineBanner]}>
          <BodyText style={g.errorText}>
            <MaterialCommunityIcons name="wifi-off" size={16} />{' '}
            You're offline (showing cached data)
          </BodyText>
        </View>
      )}

      {/* API error banner (data available but stale) */}
      {error && collections.length > 0 && (
        <View style={[g.errorBox, styles.errorBanner]}>
          <BodyText style={g.errorText}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} />{' '}
            Failed to refresh. Pull to retry.
          </BodyText>
        </View>
      )}

      <FlashList
        data={collections}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          collections.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={EmptyState}
        onRefresh={onRefresh}
        refreshing={refreshing}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const getStyles = (theme: Theme) => {
  const { spacing: s, radii: r, fonts: f, fontSizes: fs } = theme;
  return StyleSheet.create({
    header: {
      paddingTop: Platform.OS === 'ios' ? 50 : s[3],
      paddingBottom: s[3],
      paddingHorizontal: s[4],
      borderBottomWidth: 1,
    },

    // Offline / error banners
    offlineBanner: {
      borderRadius: r.none,
      borderWidth: r.none,
      borderBottomWidth: 1,
      paddingVertical: s[2] + 2,
    },
    offlineInlineBanner: {
      marginTop: s[2],
      borderRadius: r.md,
      paddingVertical: s[1] + 2,
      paddingHorizontal: s[2] + 2,
    },
    errorBanner: {
      borderRadius: r.none,
      borderWidth: r.none,
      borderBottomWidth: 1,
      paddingVertical: s[2] + 2,
    },

    // List
    listContent: {
      paddingTop: s[4],
      paddingBottom: s[20] * 1.5,
    },
    listContentEmpty: {
      flex: 1,
      justifyContent: 'center',
    },

    // Empty state
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: s[8],
      paddingVertical: s[10],
    },
    emptyIconBox: {
      marginBottom: s[4],
      padding: s[5],
    },
    emptyTitle: {
      marginBottom: s[2],
      textAlign: 'center',
    },
    emptyText: {
      textAlign: 'center',
      lineHeight: 20,
    },

    // Error state
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: s[7] + 2,
      gap: s[4],
    },
    errorTitle: {
      textAlign: 'center',
    },
    retryBtn: {
      paddingVertical: s[3],
      paddingHorizontal: s[6],
      borderRadius: r.full,
    },

    // Skeleton
    skeletonList: {
      paddingTop: s[4],
      gap: s[3],
    },
    skeletonCard: {
      padding: s[4],
      marginHorizontal: s[4],
      marginBottom: 0,
    },
    skelLeft: {
      flex: 1,
      gap: s[2],
    },
    skelBar: {
      borderRadius: r.sm,
      opacity: 0.4,
    },
    skelBadge: {
      width: 70,
      height: 20,
      borderRadius: r.full,
      opacity: 0.4,
    },
  });
};
