/**
 * PartnerCard
 *
 * Displays a partner store with:
 * - Store name & exchange rate
 * - Animated progress bar toward minimum redemption
 * - Redeem button (disabled if insufficient points)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassCard } from '../../ui/GlassCard';
import { Button } from '../../ui/Button';
import { Heading, BodyText } from '../../ui/Typography';
import { useTheme } from '../../../theme';
import { createGlobalStyles } from '../../../theme/globalStyles';
import { AnimatedProgressBar } from './AnimatedProgressBar';
import type { Partner } from '../../../mocks/rewards';

interface PartnerCardProps {
  partner: Partner;
  pointsBalance: number;
  onRedeem: (partner: Partner) => void;
  isRedeeming: boolean;
}

export const PartnerCard = React.memo(function PartnerCard({
  partner,
  pointsBalance,
  onRedeem,
  isRedeeming,
}: PartnerCardProps) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;

  const progress = Math.min(pointsBalance / partner.min_redemption, 1);
  const hasEnoughPoints = pointsBalance >= partner.min_redemption;
  const pointsNeeded = partner.min_redemption - pointsBalance;
  const barColor = hasEnoughPoints ? c.accent : c.muted;
  const barBgColor =
    theme.mode === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)';

  return (
    <GlassCard style={styles.card}>
      {/* Header */}
      <View style={g.rowBetween}>
        <View style={g.row}>
          <View style={[g.iconContainerAccent, styles.icon]}>
            <MaterialCommunityIcons name="store" size={20} color={c.accent} />
          </View>
          <View style={styles.info}>
            <Heading size="sm">{partner.name}</Heading>
            <BodyText size="sm" muted>
              {partner.points_per_liter} pts/L · {partner.discount_per_point}{' '}
              pts = ₱1
            </BodyText>
          </View>
        </View>
      </View>

      {/* Exchange rate detail */}
      <BodyText size="sm" style={[g.textMuted, styles.rate]}>
        {partner.min_redemption} pts minimum · ₱
        {partner.min_redemption * partner.discount_per_point} off
      </BodyText>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={g.rowBetween}>
          <BodyText size="sm" muted>
            Progress to reward
          </BodyText>
          <BodyText size="sm" accent={hasEnoughPoints} muted={!hasEnoughPoints}>
            {Math.round(progress * 100)}%
          </BodyText>
        </View>
        <AnimatedProgressBar
          progress={progress}
          color={barColor}
          bgColor={barBgColor}
        />
      </View>

      {/* Redeem */}
      <Button
        variant="glass-gold"
        size="sm"
        fullWidth
        disabled={!hasEnoughPoints || isRedeeming}
        loading={isRedeeming}
        onPress={() => onRedeem(partner)}
      >
        {hasEnoughPoints
          ? `Redeem (₱${Math.floor(pointsBalance * partner.discount_per_point)} off)`
          : `Need ${pointsNeeded} more pts`}
      </Button>
    </GlassCard>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
  },
  icon: {
    padding: 10,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  rate: {
    marginTop: 4,
    marginBottom: 12,
  },
  progressSection: {
    marginBottom: 12,
  },
});
