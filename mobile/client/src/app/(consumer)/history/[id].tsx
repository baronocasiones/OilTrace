/**
 * History Detail Screen (F-004)
 *
 * Full collection detail view with:
 * - Back navigation header
 * - Collection info GlassCard (elevated): date, volume, TPM, grade, driver, location
 * - Blockchain verification GlassCard: status, tx hash, block number, Etherscan link
 * - Points awarded section
 * - Offline / error states
 * - Expo Web Browser integration for Etherscan
 */

import { useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  ToastAndroid,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { createGlobalStyles } from '../../../theme/globalStyles';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Badge, type BadgeVariant } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Heading, BodyText, Label, Mono } from '../../../components/ui/Typography';
import { useHistoryStore } from '../../../store/historyStore';
import { GRADE_INFO } from '../../../mocks/history';
import type { CollectionDetail, BlockchainVerification } from '../../../mocks/history';

// ─── Helpers ────────────────────────────────────────────────────────────

function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  const date = d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${date} — ${time}`;
}

function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

const ETHERSCAN_BASE = 'https://sepolia.etherscan.io';

const blockChainBadgeVariant: Record<string, BadgeVariant> = {
  verified: 'blockchain-verified',
  pending: 'blockchain-pending',
  failed: 'blockchain-failed',
};

const blockchainStatusLabels: Record<string, string> = {
  verified: 'Verified on-chain',
  pending: 'Verification in progress',
  failed: 'Verification failed',
};

const blockchainStatusNotes: Record<string, string> = {
  pending: 'Typically confirmed within 2 minutes.',
  failed: 'This record could not be verified on-chain. Contact support.',
};

// ─── Etherscan Helpers ──────────────────────────────────────────────────

async function openEtherscanTx(txHash: string) {
  const url = `${ETHERSCAN_BASE}/tx/${txHash}`;
  try {
    const result = await WebBrowser.openBrowserAsync(url, {
      toolbarColor: '#0c0a0f',
      controlsColor: '#33a190',
    });
    if (result.type === 'cancel' || result.type === 'dismiss') {
      // User closed the browser — no action needed
    }
  } catch {
    if (Platform.OS === 'android') {
      ToastAndroid.show('Could not open link. Check your internet connection.', ToastAndroid.SHORT);
    } else {
      Alert.alert('Connection Error', 'Could not open link. Check your internet connection.');
    }
  }
}

// ─── Detail Section — Collection Info ───────────────────────────────────

function CollectionInfoSection({
  detail,
  isOffline,
}: {
  detail: CollectionDetail;
  isOffline: boolean;
}) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const gradeInfo = GRADE_INFO[detail.oil_grade];

  return (
    <View style={s.section}>
      <Label size="md" style={s.sectionTitle}>
        Collection Information
      </Label>
      <GlassCard elevated style={s.detailCard}>
        {/* Date & time */}
        <Label size="sm" style={s.fieldLabel}>
          Date & Time
        </Label>
        <Heading size="sm" style={s.fieldValue}>
          {formatDateTime(detail.collected_at)}
        </Heading>

        <View style={[g.divider, s.divider]} />

        {/* Volume */}
        <Label size="sm" style={s.fieldLabel}>
          Volume
        </Label>
        <Heading size="lg" style={[g.textAccent, s.volumeValue]}>
          {detail.volume_liters} L
        </Heading>

        <View style={[g.divider, s.divider]} />

        {/* TPM + Grade */}
        <View style={g.rowBetween}>
          <View style={{ flex: 1 }}>
            <Label size="sm" style={s.fieldLabel}>
              TPM Reading
            </Label>
            <BodyText size="md">{detail.tpm_value.toFixed(1)}% TPM</BodyText>
          </View>
          <Badge variant={gradeInfo.badgeVariant}>{gradeInfo.label}</Badge>
        </View>

        <BodyText size="sm" muted style={{ marginTop: 4 }}>
          {gradeInfo.destination}
        </BodyText>

        <View style={[g.divider, s.divider]} />

        {/* Driver */}
        <Label size="sm" style={s.fieldLabel}>
          Collected By
        </Label>
        <BodyText size="md">{detail.driver_name}</BodyText>

        <View style={[g.divider, s.divider]} />

        {/* Location */}
        <Label size="sm" style={s.fieldLabel}>
          Location
        </Label>
        <BodyText size="md" muted>
          {detail.location}
        </BodyText>

        {isOffline && (
          <BodyText size="sm" muted style={{ marginTop: 12 }}>
            Some information may be unavailable offline.
          </BodyText>
        )}
      </GlassCard>
    </View>
  );
}

// ─── Detail Section — Blockchain Verification ──────────────────────────

function BlockchainSection({
  detail,
  blockchain,
  isLoading,
  error,
  onVerify,
}: {
  detail: CollectionDetail;
  blockchain: BlockchainVerification | null;
  isLoading: boolean;
  error: string | null;
  onVerify: () => void;
}) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;

  const status = detail.blockchain_record?.status ?? 'failed';
  const statusKey = status === 'confirmed' ? 'verified' : status === 'pending' ? 'pending' : 'failed';
  const badgeVar = blockChainBadgeVariant[statusKey];
  const statusLabel = blockchainStatusLabels[statusKey];
  const statusNote = blockchainStatusNotes[statusKey];
  const txHash = blockchain?.tx_hash ?? detail.blockchain_record?.tx_hash ?? '';
  const blockNumber = blockchain?.block_number ?? detail.blockchain_record?.block_number;

  const handleOpenEtherscan = useCallback(() => {
    if (txHash) {
      openEtherscanTx(txHash);
    }
  }, [txHash]);

  return (
    <View style={s.section}>
      <Label size="md" style={s.sectionTitle}>
        Blockchain Verification
      </Label>
      <GlassCard elevated style={s.detailCard}>
        {/* Status */}
        <View style={g.rowBetween}>
          <View>
            <Label size="sm" style={s.fieldLabel}>
              Verification Status
            </Label>
            <BodyText size="md">{statusLabel}</BodyText>
          </View>
          <Badge variant={badgeVar} />
        </View>

        {statusNote && detail.blockchain_status !== 'verified' && (
          <BodyText size="sm" muted style={s.statusNote}>
            {statusNote}
          </BodyText>
        )}

        {txHash ? (
          <>
            <View style={[g.divider, s.divider]} />

            {/* Tx hash — tappable */}
            <Label size="sm" style={s.fieldLabel}>
              Transaction Hash
            </Label>
            <TouchableOpacity onPress={handleOpenEtherscan} activeOpacity={0.7}>
              <Mono style={[s.txHash, { color: c.accent }]}>
                {truncateHash(txHash)}
              </Mono>
            </TouchableOpacity>

            {/* Block number */}
            {blockNumber ? (
              <>
                <Label size="sm" style={[s.fieldLabel, { marginTop: 12 }]}>
                  Block Number
                </Label>
                <BodyText size="md">#{blockNumber.toLocaleString()}</BodyText>
              </>
            ) : null}

            {/* View on Etherscan */}
            <Button
              variant="glass"
              size="sm"
              style={s.etherscanBtn}
              onPress={handleOpenEtherscan}
            >
              <MaterialCommunityIcons
                name="open-in-new"
                size={14}
                color={c.foreground}
              />
              {' View on Etherscan'}
            </Button>
          </>
        ) : null}

        {/* Verify button for pending items */}
        {detail.blockchain_status === 'pending' && !isLoading && (
          <Button
            variant="glass-primary"
            size="sm"
            style={s.verifyBtn}
            onPress={onVerify}
          >
            Refresh Verification
          </Button>
        )}

        {isLoading && (
          <View style={[g.row, s.verifyingRow]}>
            <ActivityIndicator size="small" color={c.accent} />
            <BodyText size="sm" muted style={{ marginLeft: 8 }}>
              Verifying on blockchain...
            </BodyText>
          </View>
        )}

        {error && (
          <BodyText size="sm" danger style={{ marginTop: 8 }}>
            {error}
          </BodyText>
        )}
      </GlassCard>
    </View>
  );
}

// ─── Detail Section — Points Awarded ────────────────────────────────────

function PointsSection({ points }: { points: number }) {
  if (points <= 0) return null;

  return (
    <View style={s.section}>
      <GlassCard elevated style={s.detailCard}>
        <BodyText size="md" accent style={{ fontWeight: '700', textAlign: 'center' }}>
          You earned {points} points from this collection
        </BodyText>
      </GlassCard>
    </View>
  );
}

// ─── Shared Header ──────────────────────────────────────────────────────

function DetailHeader({ onGoBack }: { onGoBack: () => void }) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;

  return (
    <View style={[s.header, { borderBottomColor: c.border }]}>
      <TouchableOpacity onPress={onGoBack} style={s.backBtn} activeOpacity={0.7}>
        <MaterialCommunityIcons name="chevron-left" size={24} color={c.foreground} />
      </TouchableOpacity>
      <Heading size="lg" style={g.textAccent}>
        Collection Details
      </Heading>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;

  const {
    detailCache,
    blockchainCache,
    loadingDetailId,
    detailError,
    verifyingId,
    verifyError,
    isOffline,
    fetchDetail,
    fetchBlockchainVerification,
  } = useHistoryStore();

  const detail = id ? detailCache[id] : undefined;
  const blockchain = id ? blockchainCache[id] : undefined;
  const isLoadingDetail = loadingDetailId === id;
  const isVerifying = verifyingId === id;

  // Fetch detail on mount
  useEffect(() => {
    if (id) {
      fetchDetail(id);
    }
  }, [id]);

  // Fetch blockchain verification on mount (separate call)
  useEffect(() => {
    if (id && detail?.blockchain_record) {
      fetchBlockchainVerification(id);
    }
  }, [id, detail?.blockchain_record]);

  const handleVerify = useCallback(() => {
    if (id) {
      fetchBlockchainVerification(id);
    }
  }, [id, fetchBlockchainVerification]);

  const handleGoBack = useCallback(() => {
    // Navigate back to the history list rather than using router.back()
    // which can misfire inside tab navigator stacks
    router.replace('/(consumer)/history');
  }, [router]);

  // ── Render content based on state ──────────────────────────────────

  const renderContent = () => {
    // Loading state (no data yet)
    if (isLoadingDetail && !detail) {
      return (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={c.accent} />
          <BodyText muted style={{ marginTop: 16 }}>
            Loading details...
          </BodyText>
        </View>
      );
    }

    // Error state (no data)
    if (detailError && !detail) {
      return (
        <View style={s.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={c.danger} />
          <Heading size="md" style={s.errorTitle}>
            {detailError}
          </Heading>
          <Button variant="glass" onPress={handleGoBack}>
            Go Back
          </Button>
        </View>
      );
    }

    // Not found
    if (!detail) {
      return (
        <View style={s.errorContainer}>
          <MaterialCommunityIcons name="file-document-outline" size={48} color={c.muted} />
          <Heading size="md">Collection not found</Heading>
          <Button variant="glass" onPress={handleGoBack}>
            Go Back
          </Button>
        </View>
      );
    }

    // Main content
    return (
      <>
        {/* Offline banner */}
        {isOffline && (
          <View style={[g.errorBox, s.offlineBanner]}>
            <BodyText style={g.errorText}>
              <MaterialCommunityIcons name="wifi-off" size={14} />{' '}
              Some information may be unavailable offline.
            </BodyText>
          </View>
        )}

        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1 — Collection Info */}
          <CollectionInfoSection detail={detail} isOffline={isOffline} />

          {/* Section 2 — Blockchain Verification */}
          <BlockchainSection
            detail={detail}
            blockchain={blockchain ?? null}
            isLoading={isVerifying}
            error={verifyError}
            onVerify={handleVerify}
          />

          {/* Section 3 — Points Awarded */}
          <PointsSection points={detail.points_awarded} />

          {/* Bottom spacing for tab bar */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </>
    );
  };

  return (
    <View style={[g.screenBg]}>
      <DetailHeader onGoBack={handleGoBack} />
      {renderContent()}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },

  // Offline banner
  offlineBanner: {
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },

  // Scroll
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 120,
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 8,
  },

  // Detail card
  detailCard: {
    padding: 20,
  },
  fieldLabel: {
    marginBottom: 4,
  },
  fieldValue: {
    marginBottom: 4,
  },
  volumeValue: {
    marginBottom: 4,
  },
  divider: {
    marginVertical: 12,
  },
  statusNote: {
    marginTop: 8,
    lineHeight: 18,
  },
  txHash: {
    fontSize: 13,
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  etherscanBtn: {
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  verifyBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  verifyingRow: {
    marginTop: 12,
  },

  // States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
});
