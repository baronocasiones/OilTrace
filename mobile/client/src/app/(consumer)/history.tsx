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
  ToastAndroid,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
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
          <View style={[g.row, { gap: 6, marginTop: 8 }]}>
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

  const handleViewOnEtherscan = useCallback(
    async (collectionId: string) => {
      const mockTxUrl = `https://sepolia.etherscan.io/tx/mock-${collectionId}`;
      try {
        await WebBrowser.openBrowserAsync(mockTxUrl, {
          toolbarColor: '#0c0a0f',
          controlsColor: '#33a190',
        });
      } catch {
        if (Platform.OS === 'android') {
          ToastAndroid.show('Could not open link. Check your internet connection.', ToastAndroid.SHORT);
        } else {
          Alert.alert('Connection Error', 'Could not open link. Check your internet connection.');
        }
      }
    },
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: CollectionListItem }) => (
      <CollectionCard
        collection={item}
        onPress={() => handleCollectionPress(item.id)}
        onViewOnEtherscan={() => handleViewOnEtherscan(item.id)}
      />
    ),
    [handleCollectionPress, handleViewOnEtherscan],
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
              You're offline — showing cached data
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
            <BodyText style={{ color: '#fff', fontWeight: '700' }}>
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
              Offline — cached data
            </BodyText>
          </View>
        )}
      </View>

      {/* Offline banner (data available but offline) */}
      {isOffline && collections.length > 0 && (
        <View style={[g.errorBox, styles.offlineBanner]}>
          <BodyText style={g.errorText}>
            <MaterialCommunityIcons name="wifi-off" size={16} />{' '}
            You're offline — showing cached data
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
        // Future: wire onEndReached for cursor-based pagination
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },

  // Offline / error banners
  offlineBanner: {
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  offlineInlineBanner: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  errorBanner: {
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },

  // List
  listContent: {
    paddingTop: 16,
    paddingBottom: 120,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyIconBox: {
    marginBottom: 16,
    padding: 20,
  },
  emptyTitle: {
    marginBottom: 8,
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
    padding: 30,
    gap: 16,
  },
  errorTitle: {
    textAlign: 'center',
  },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 9999,
  },

  // Skeleton
  skeletonList: {
    paddingTop: 16,
    gap: 12,
  },
  skeletonCard: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 0,
  },
  skelLeft: {
    flex: 1,
    gap: 8,
  },
  skelBar: {
    borderRadius: 4,
    opacity: 0.4,
  },
  skelBadge: {
    width: 70,
    height: 20,
    borderRadius: 9999,
    opacity: 0.4,
  },
});
