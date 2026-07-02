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
import { Button } from '../ui/Button';
import { Heading, BodyText, Label } from '../ui/Typography';
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
    year: 'numeric',
  });
}

const blockChainBadgeVariant: Record<string, BadgeVariant> = {
  verified: 'blockchain-verified',
  pending: 'blockchain-pending',
  failed: 'blockchain-failed',
};

export function CollectionCard({ collection, onPress, onViewOnEtherscan }: CollectionCardProps) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;

  const gradeInfo = GRADE_INFO[collection.oil_grade];
  const bcBadge = blockChainBadgeVariant[collection.blockchain_status];

  return (
    <GlassCard interactive onPress={onPress} style={styles.card}>
      <View style={g.rowBetween}>
        <View style={styles.leftContent}>
          {/* Date */}
          <Label size="sm" style={styles.dateLabel}>
            {formatDate(collection.collected_at)}
          </Label>

          {/* Volume + TPM */}
          <Heading size="sm" style={styles.volume}>
            {collection.volume_liters}L
          </Heading>
          <BodyText size="sm" muted>
            {collection.tpm_value.toFixed(1)}% TPM
          </BodyText>

          {/* Badges row */}
          <View style={[g.row, styles.badgesRow]}>
            <Badge variant={gradeInfo.badgeVariant}>
              {gradeInfo.label}
            </Badge>
            <Badge variant={bcBadge} />
          </View>
        </View>

        {/* Points + Etherscan */}
        <View style={styles.rightContent}>
          <BodyText size="sm" accent style={styles.pointsText}>
            +{collection.points_awarded} pts
          </BodyText>

          {collection.blockchain_status === 'verified' && onViewOnEtherscan && (
            <Button
              variant="glass"
              size="sm"
              onPress={onViewOnEtherscan}
              style={styles.etherscanBtn}
            >
              <MaterialCommunityIcons
                name="open-in-new"
                size={12}
                color={c.foreground}
              />
              {' View'}
            </Button>
          )}
        </View>
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
  leftContent: {
    flex: 1,
    marginRight: 12,
  },
  dateLabel: {
    marginBottom: 4,
  },
  volume: {
    marginBottom: 2,
  },
  badgesRow: {
    marginTop: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  rightContent: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  pointsText: {
    fontWeight: '700',
  },
  etherscanBtn: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
});
