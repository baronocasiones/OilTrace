/**
 * VoucherCard
 *
 * Displays a single voucher with code, discount amount, status badge,
 * expiry, and a "Show QR" button for active vouchers.
 *
 * Used/Expired vouchers render at reduced opacity with strikethrough text.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassCard } from '../../ui/GlassCard';
import { Badge, type BadgeVariant } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { BodyText, Label, Mono } from '../../ui/Typography';
import { useTheme } from '../../../theme';
import { createGlobalStyles } from '../../../theme/globalStyles';
import { fontSizes } from '../../../theme/tokens';
import type { Voucher } from '../../../mocks/rewards';

interface VoucherCardProps {
  voucher: Voucher;
  onShowQR: (voucher: Voucher) => void;
}

export const VoucherCard = React.memo(function VoucherCard({
  voucher,
  onShowQR,
}: VoucherCardProps) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;
  const isActive = voucher.status === 'active';
  const isUsed = voucher.status === 'used';

  const badgeVariant: BadgeVariant = isActive
    ? 'standard'
    : isUsed
      ? 'blockchain-verified'
      : 'danger';

  const badgeLabel = isActive ? 'Active' : isUsed ? 'Used' : 'Expired';

  return (
    <GlassCard style={[styles.card, { opacity: isActive ? 1 : 0.55 }]}>
      <View style={g.rowBetween}>
        <View style={styles.left}>
          <Mono
            style={[
              styles.code,
              { textDecorationLine: isActive ? 'none' : 'line-through' },
            ]}
          >
            {voucher.voucher_code}
          </Mono>
          <BodyText
            size="sm"
            accent={isActive}
            muted={!isActive}
            style={{ textDecorationLine: isActive ? 'none' : 'line-through' }}
          >
            ₱{voucher.discount_amount} off · {voucher.partner_name}
          </BodyText>
          <View style={[g.row, { marginTop: 4, gap: 8 }]}>
            <Badge variant={badgeVariant}>{badgeLabel}</Badge>
            {isActive && (
              <Label size="sm">
                Exp{' '}
                {new Date(voucher.expires_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Label>
            )}
          </View>
        </View>

        {isActive && (
          <Button variant="glass" size="sm" onPress={() => onShowQR(voucher)}>
            <View style={g.row}>
              <MaterialCommunityIcons name="qrcode" size={14} color={c.foreground} />
              <BodyText size="sm" style={{ marginLeft: 4 }}>
                QR
              </BodyText>
            </View>
          </Button>
        )}
      </View>
    </GlassCard>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 10,
  },
  left: {
    flex: 1,
    marginRight: 12,
  },
  code: {
    fontSize: fontSizes.sm,
    marginBottom: 4,
  },
});
