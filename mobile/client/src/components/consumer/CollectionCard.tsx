/**
 * CollectionCard
 *
 * Reusable convenience component composing GlassCard + Badge for
 * display of a single collection item in the History list.
 *
 * Usage:
 *   <CollectionCard
 *     collection={item}
 *     onPress={() => router.push(`/(consumer)/history/${item.id}`)}
 *     onViewOnEtherscan={() => openEtherscanTx(item.id)}
 *   />
 */

import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { createGlobalStyles } from '../../theme/globalStyles';
import { GlassCard } from '../ui/GlassCard';
import { Badge, type BadgeVariant } from '../ui/Badge';
import { Heading, Label, Mono, BodyText } from '../ui/Typography';
import type { CollectionListItem } from '../../mocks/history';
import { GRADE_INFO } from '../../mocks/history';

interface CollectionCardProps {
  collection: CollectionListItem;
  onPress?: () => void;
  onViewOnEtherscan?: () => void;
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// Deterministic mock hash generator since it's not in the list API yet
function getMockHash(id: string): string {
  const num = parseInt(id.replace(/\D/g, ''), 10) || 123;
  return `0x${(num * 314159).toString(16).padEnd(6, 'a')}...`;
}

const blockChainBadgeVariant: Record<string, BadgeVariant> = {
  verified: 'blockchain-verified',
  pending: 'blockchain-pending',
  failed: 'blockchain-failed',
};

const blockChainBadgeLabel: Record<string, string> = {
  verified: 'Verified',
  pending: 'Pending',
  failed: 'Failed',
};

export function CollectionCard({ collection, onPress }: CollectionCardProps) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;

  const gradeInfo = GRADE_INFO[collection.oil_grade];
  const bcBadge = blockChainBadgeVariant[collection.blockchain_status];
  const bcLabel = blockChainBadgeLabel[collection.blockchain_status];

  return (
    <GlassCard interactive onPress={onPress} style={styles.card}>
      {/* Top Row: Date & Grade */}
      <View style={[g.rowBetween, styles.topRow]}>
        <Label size="sm" style={[styles.boldLabel, { color: c.muted }]}>
          {formatDate(collection.collected_at)}
        </Label>
        <Badge variant={gradeInfo.badgeVariant}>
          {gradeInfo.label}
        </Badge>
      </View>

      {/* Middle Row: Volume & TPM Grid */}
      <View style={styles.middleRow}>
        <View style={styles.columnLeft}>
          <Label size="sm" style={[styles.columnLabel, { color: c.muted }]}>
            COLLECTED VOLUME
          </Label>
          <Heading size="md" style={{ color: c.accent, marginTop: 2 }}>
            {collection.volume_liters}
            <BodyText size="sm" style={{ color: c.accent, fontWeight: '600' }}>
              {' Liters'}
            </BodyText>
          </Heading>
        </View>

        <View style={styles.columnRight}>
          <Label size="sm" style={[styles.columnLabel, { color: c.muted }]}>
            TPM READING
          </Label>
          <Heading size="md" style={{ marginTop: 2 }}>
            {collection.tpm_value.toFixed(1)}
            <BodyText size="sm" style={{ fontWeight: '600' }}>
              {' %'}
            </BodyText>
          </Heading>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: c.border }]} />

      {/* Bottom Row: Tx Hash & Verification */}
      <View style={[g.rowBetween, styles.bottomRow]}>
        <View style={g.row}>
          <MaterialCommunityIcons
            name="cube-outline"
            size={14}
            color={c.muted}
            style={styles.txIcon}
          />
          <Mono style={{ color: c.muted, fontSize: 12 }}>
            {collection.blockchain_status === 'failed' ? 'N/A' : getMockHash(collection.id)}
          </Mono>
        </View>
        <Badge variant={bcBadge}>
          {collection.blockchain_status === 'verified' ? `✓ ${bcLabel}` : bcLabel}
        </Badge>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  topRow: {
    marginBottom: 16,
  },
  boldLabel: {
    fontWeight: '600',
  },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  columnLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  columnRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  columnLabel: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 12,
    opacity: 0.5,
  },
  bottomRow: {
    alignItems: 'center',
  },
  txIcon: {
    marginRight: 6,
  },
});
