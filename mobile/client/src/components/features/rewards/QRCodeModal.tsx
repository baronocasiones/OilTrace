/**
 * QRCodeModal
 *
 * Animated fullscreen overlay (spring-translated from bottom) showing:
 * - QR code rendering via react-native-qrcode-svg
 * - Voucher code in mono font
 * - Partner name & expiry
 * - Dismiss button
 *
 * Uses react-native-reanimated for smooth spring presentation.
 */

import { useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassCard } from '../../ui/GlassCard';
import { Button } from '../../ui/Button';
import { BodyText, Mono } from '../../ui/Typography';
import { useTheme } from '../../../theme';
import { createGlobalStyles } from '../../../theme/globalStyles';
import { radii, fontSizes } from '../../../theme/tokens';
import type { Voucher } from '../../../mocks/rewards';

interface QRCodeModalProps {
  visible: boolean;
  voucher: Voucher | null;
  onClose: () => void;
}

export function QRCodeModal({ visible, voucher, onClose }: QRCodeModalProps) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;

  const translateY = useSharedValue(600);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 120 });
      backdropOpacity.value = withTiming(0.4, { duration: 200 });
    } else {
      translateY.value = withTiming(600, { duration: 200 });
      backdropOpacity.value = 0;
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible || !voucher) return null;

  return (
    <View style={styles.overlay}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            backgroundColor: c.surface,
            borderTopLeftRadius: radii['2xl'],
            borderTopRightRadius: radii['2xl'],
          },
          panelStyle,
        ]}
      >
        <View style={[styles.handle, { backgroundColor: c.border }]} />

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <GlassCard elevated style={styles.qrWrapper}>
            <QRCode
              value={voucher.qr_data}
              size={200}
              backgroundColor="white"
              color="#09090b"
            />
          </GlassCard>
        </View>

        <Mono style={[styles.code, { color: c.foreground }]}>
          {voucher.voucher_code}
        </Mono>

        <BodyText size="md" style={styles.description}>
          Show this QR code to the cashier at{' '}
          <BodyText size="md" accent style={{ fontWeight: '700' }}>
            {voucher.partner_name}
          </BodyText>{' '}
          to claim your discount.
        </BodyText>

        <View style={[g.row, { justifyContent: 'center' }]}>
          <MaterialCommunityIcons name="clock-outline" size={14} color={c.muted} />
          <BodyText size="sm" muted style={{ marginLeft: 4 }}>
            Expires{' '}
            {new Date(voucher.expires_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </BodyText>
        </View>

        <Button variant="solid-teal" fullWidth onPress={onClose} style={styles.closeBtn}>
          Done
        </Button>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 48,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 24,
  },
  qrContainer: {
    marginBottom: 20,
  },
  qrWrapper: {
    padding: 16,
    borderRadius: 20,
  },
  code: {
    fontSize: fontSizes.md,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  closeBtn: {
    marginTop: 16,
  },
});
