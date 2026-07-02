/**
 * Rewards Screen (F-005)
 *
 * Tab 3 of 4 — Points & Rewards dashboard with:
 *  - Points Balance (animated rewardPulse with color shift)
 *  - Available Partners (FlashList with animated progress bars)
 *  - My Vouchers (FlashList with QR codes)
 *  - Animated QR overlay modal
 *  - Loading / empty / error / offline states
 *
 * Architecture: Single FlashList with sectioned items for 60fps scrolling.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { createGlobalStyles } from '../../theme/globalStyles';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Heading, BodyText, Label } from '../../components/ui/Typography';
import {
  RewardPulseText,
  PartnerCard,
  VoucherCard,
  QRCodeModal,
  SkeletonBlock,
} from '../../components/features/rewards';
import { useRewardsStore } from '../../store/rewardsStore';
import type { Partner, Voucher, PointsTransaction } from '../../mocks/rewards';

// ─── FlashList Item Types ──────────────────────────────────────────────────────

type SectionItem =
  | { kind: 'section-header'; id: string; label: string; count?: string }
  | { kind: 'partner'; id: string; data: Partner }
  | { kind: 'voucher'; id: string; data: Voucher }
  | { kind: 'activity'; id: string; data: PointsTransaction };

// ─── Empty State (covers no-points / no-vouchers) ──────────────────────────────

function EmptyState() {
  const { theme } = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="gift-outline" size={48} color={theme.colors.muted} />
      <Heading size="md" style={styles.emptyTitle}>
        0 pts
      </Heading>
      <BodyText muted style={styles.emptyText}>
        Collect used oil to earn points and redeem discounts at partner stores!
      </BodyText>
    </View>
  );
}

// ─── Section Header Renderer ────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count?: string }) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);

  return (
    <View style={[g.rowBetween, styles.sectionHeaderOuter]}>
      <Heading size="sm">{label}</Heading>
      {count ? (
        <BodyText size="sm" accent>
          {count}
        </BodyText>
      ) : null}
    </View>
  );
}

// ─── Activity Row ────────────────────────────────────────────────────────────────

function ActivityRow({ transaction }: { transaction: PointsTransaction }) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);

  return (
    <View style={[g.rowBetween, styles.txnRow]}>
      <View style={styles.txnLeft}>
        <BodyText size="sm" style={{ fontWeight: '500' }}>
          {transaction.description}
        </BodyText>
        <BodyText size="sm" muted>
          {new Date(transaction.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </BodyText>
      </View>
      <BodyText
        size="sm"
        accent={transaction.type === 'earned'}
        muted={transaction.type !== 'earned'}
        style={{ fontWeight: '700' }}
      >
        {transaction.type === 'earned' ? '+' : ''}
        {transaction.amount} pts
      </BodyText>
    </View>
  );
}

// ─── Points Balance Header ───────────────────────────────────────────────────────

function PointsBalanceHeader() {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;
  const { pointsData } = useRewardsStore();

  if (!pointsData) return null;

  return (
    <GlassCard elevated style={styles.pointsCard}>
      <Label>Available Balance</Label>
      <RewardPulseText
        points={pointsData.balance}
        defaultColor={c.foreground}
        goldColor={c.accentSecondaryDark}
      />
      <BodyText size="md" muted>
        = ₱{pointsData.peso_value.toFixed(2)} discount value
      </BodyText>

      <View style={[g.row, styles.breakdownRow]}>
        <View style={[g.row, { gap: 4 }]}>
          <MaterialCommunityIcons
            name="arrow-up-circle"
            size={14}
            color={c.accent}
          />
          <BodyText size="sm" accent>
            Earned: {pointsData.earned_total} pts
          </BodyText>
        </View>
        <View style={[g.row, { gap: 4 }]}>
          <MaterialCommunityIcons
            name="arrow-down-circle"
            size={14}
            color={c.muted}
          />
          <BodyText size="sm" muted>
            Used: {pointsData.used_total} pts
          </BodyText>
        </View>
      </View>
    </GlassCard>
  );
}

// ─── Error State (full-screen, no data) ──────────────────────────────────────────

function FullErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={styles.centerContainer}>
      <MaterialCommunityIcons name="alert-circle-outline" size={48} color={c.danger} />
      <Heading size="md" style={styles.centerTitle}>
        {message}
      </Heading>
      <Button variant="solid-teal" onPress={onRetry}>
        Retry
      </Button>
    </View>
  );
}

// ─── Full Loading State (no cached data) ────────────────────────────────────────

function FullLoadingState() {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={c.accent} />
      <BodyText muted style={{ marginTop: 16 }}>
        Loading rewards...
      </BodyText>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────

export default function RewardsScreen() {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const {
    pointsData,
    isLoadingPoints,
    pointsError,
    partners,
    isLoadingPartners,
    partnersError,
    vouchers,
    isLoadingVouchers,
    vouchersError,
    isRedeeming,
    redemptionError,
    redemptionResult,
    isOffline,
    fetchAll,
    redeem,
    clearRedemptionResult,
  } = useRewardsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [redeemingPartnerId, setRedeemingPartnerId] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchAll();
  }, []);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll(true);
    setRefreshing(false);
  }, [fetchAll]);

  // Clear redemption feedback after 4s
  useEffect(() => {
    if (redemptionResult) {
      const timer = setTimeout(clearRedemptionResult, 4000);
      return () => clearTimeout(timer);
    }
  }, [redemptionResult]);

  const handleRedeem = useCallback(
    async (partner: Partner) => {
      setRedeemingPartnerId(partner.id);
      await redeem(partner.id, partner.min_redemption);
      setRedeemingPartnerId(null);
    },
    [redeem],
  );

  const handleShowQR = useCallback((voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setQrModalVisible(true);
  }, []);

  const handleCloseQR = useCallback(() => {
    setQrModalVisible(false);
    setSelectedVoucher(null);
  }, []);

  const isLoading = isLoadingPoints || isLoadingPartners || isLoadingVouchers;
  const hasData = pointsData !== null || partners.length > 0 || vouchers.length > 0;
  const anyError = pointsError || partnersError || vouchersError;
  const activeVoucherCount = vouchers.filter((v) => v.status === 'active').length;

  // Build FlashList items
  const sectionItems = useMemo(() => {
    const items: SectionItem[] = [];

    if (partners.length > 0) {
      items.push({
        kind: 'section-header',
        id: 'header-partners',
        label: 'Available Partners',
      });
      for (const p of partners) {
        items.push({ kind: 'partner', id: `partner-${p.id}`, data: p });
      }
    }

    if (vouchers.length > 0) {
      items.push({
        kind: 'section-header',
        id: 'header-vouchers',
        label: 'My Vouchers',
        count: `${activeVoucherCount} active`,
      });
      for (const v of vouchers) {
        items.push({ kind: 'voucher', id: `voucher-${v.id}`, data: v });
      }
    }

    const transactions = pointsData?.transactions ?? [];
    if (transactions.length > 0) {
      items.push({
        kind: 'section-header',
        id: 'header-activity',
        label: 'Recent Activity',
      });
      for (const t of transactions.slice(0, 5)) {
        items.push({ kind: 'activity', id: `txn-${t.id}`, data: t });
      }
    }

    return items;
  }, [partners, vouchers, pointsData, activeVoucherCount]);

  const keyExtractor = useCallback((item: SectionItem) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: SectionItem }) => {
      switch (item.kind) {
        case 'section-header':
          return (
            <SectionHeader
              label={item.label}
              count={('count' in item ? (item as any).count : undefined) as string | undefined}
            />
          );

        case 'partner':
          return (
            <PartnerCard
              partner={item.data}
              pointsBalance={pointsData?.balance ?? 0}
              onRedeem={handleRedeem}
              isRedeeming={isRedeeming && redeemingPartnerId === item.data.id}
            />
          );

        case 'voucher':
          return (
            <VoucherCard voucher={item.data} onShowQR={handleShowQR} />
          );

        case 'activity':
          return <ActivityRow transaction={item.data} />;

        default:
          return null;
      }
    },
    [pointsData, isRedeeming, redeemingPartnerId, handleRedeem, handleShowQR],
  );

  // ── Derive loading/error states for the list ───────────────────────

  if (isLoading && !hasData) {
    return (
      <View style={[g.screenBg, { paddingTop: Platform.OS === 'ios' ? insets.top + 44 : insets.top + 16 }]}>
        <FullLoadingState />
      </View>
    );
  }

  if (anyError && !hasData) {
    return (
      <View style={[g.screenBg, { paddingTop: Platform.OS === 'ios' ? insets.top + 44 : insets.top + 16 }]}>
        <FullErrorState message={String(anyError)} onRetry={() => fetchAll(true)} />
      </View>
    );
  }

  // ── Main Render ─────────────────────────────────────────────────────

  return (
    <View
      style={[
        g.screenBg,
        { paddingTop: Platform.OS === 'ios' ? insets.top + 44 : insets.top + 16 },
      ]}
    >
      {/* Offline Banner */}
      {isOffline && (
        <View style={g.errorBox}>
          <BodyText style={g.errorText}>
            <MaterialCommunityIcons name="wifi-off" size={16} /> You're offline —
            showing cached data
          </BodyText>
        </View>
      )}

      {/* Redemption success toast */}
      {redemptionResult && (
        <View
          style={[
            styles.toast,
            styles.successToast,
            { backgroundColor: c.successBg, borderColor: c.accent },
          ]}
        >
          <MaterialCommunityIcons name="check-circle" size={18} color={c.accent} />
          <BodyText size="sm" accent style={{ marginLeft: 6 }}>
            ✓ Redeemed! ₱{redemptionResult.discount_amount} off at{' '}
            {redemptionResult.partner_name}
          </BodyText>
        </View>
      )}

      {/* Redemption error toast */}
      {redemptionError && !redemptionResult && (
        <View
          style={[
            styles.toast,
            styles.errorToast,
            { backgroundColor: c.dangerBg, borderColor: c.danger },
          ]}
        >
          <MaterialCommunityIcons name="alert-circle" size={18} color={c.danger} />
          <BodyText size="sm" danger style={{ marginLeft: 6 }}>
            {redemptionError}
          </BodyText>
        </View>
      )}

      {/* Error banner for stale data */}
      {anyError && hasData && (
        <View style={[g.errorBox, styles.errorBanner]}>
          <BodyText style={g.errorText}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} />{' '}
            Failed to refresh. Pull to retry.
          </BodyText>
        </View>
      )}

      {isLoading && hasData ? (
        <SkeletonBlock />
      ) : (
        <FlashList
          data={sectionItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={PointsBalanceHeader}
          ListEmptyComponent={EmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.accent}
              colors={[c.accent]}
            />
          }
        />
      )}

      {/* ═══ QR Code Modal ═════════════════════════════════════════ */}
      <QRCodeModal
        visible={qrModalVisible}
        voucher={selectedVoucher}
        onClose={handleCloseQR}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  listContent: {
    padding: 20,
    paddingBottom: 120,
  },

  // ── Points Card ────────────────────────────────────────────────────

  pointsCard: {
    padding: 24,
    marginBottom: 4,
  },
  breakdownRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.15)',
    justifyContent: 'space-between',
  },

  // ── Section Headers ────────────────────────────────────────────────

  sectionHeaderOuter: {
    marginTop: 24,
    marginBottom: 12,
  },

  // ── Activity Rows ──────────────────────────────────────────────────

  txnRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.08)',
  },
  txnLeft: {
    flex: 1,
    marginRight: 12,
  },

  // ── Toasts ─────────────────────────────────────────────────────────

  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  successToast: {},
  errorToast: {},
  errorBanner: {
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },

  // ── Empty & Error States ───────────────────────────────────────────

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 260,
  },
  centerContainer: {
    flex: 1,
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    gap: 16,
  },
  centerTitle: {
    textAlign: 'center',
  },
});
