import React from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, type Theme } from '../../theme';
import { createGlobalStyles } from '../../theme/globalStyles';
import { GlassCard } from '../ui/GlassCard';
import { Heading, BodyText } from '../ui/Typography';
import { palette } from '../../theme/tokens';

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    title: 'Pickup Scheduled',
    message: 'Your oil collection is scheduled for tomorrow at 2 PM.',
    time: '2h ago',
    read: false,
  },
  {
    id: 'n2',
    title: 'Points Earned',
    message: 'You earned 240 pts from your recent collection!',
    time: '1d ago',
    read: false,
  },
  {
    id: 'n3',
    title: 'Driver Assigned',
    message: 'Juan dela Cruz is on the way to your location.',
    time: '3d ago',
    read: true,
  },
  {
    id: 'n4',
    title: 'Collection Complete',
    message: '5.0L premium oil collected and verified on-chain.',
    time: '5d ago',
    read: true,
  },
];

interface NotificationDrawerProps {
  visible: boolean;
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}

export function NotificationDrawer({
  visible,
  notifications,
  onDismiss,
  onClearAll,
  onClose,
}: NotificationDrawerProps) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;
  const styles = getStyles(theme);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.notifOverlay}>
        <TouchableOpacity
          style={styles.notifBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <GlassCard elevated style={styles.notifPanel}>
          {/* Header */}
          <View style={[g.rowBetween, styles.headerContainer]}>
            <View>
              <Heading size="md">Notifications</Heading>
              {unreadCount > 0 && (
                <BodyText size="sm" muted>
                  {unreadCount} unread
                </BodyText>
              )}
            </View>
            <View style={g.row}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={onClearAll}
                  style={[styles.notifClearBtn, { borderColor: c.border }]}
                >
                  <BodyText size="sm" style={g.textAccent}>
                    Clear all
                  </BodyText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                style={styles.notifCloseBtn}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={22}
                  color={c.muted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* List */}
          <ScrollView
            style={styles.notifList}
            showsVerticalScrollIndicator={false}
          >
            {notifications.length === 0 ? (
              <View style={styles.notifEmpty}>
                <MaterialCommunityIcons
                  name="bell-off-outline"
                  size={32}
                  color={c.muted}
                />
                <BodyText muted style={styles.emptyText}>
                  No notifications
                </BodyText>
              </View>
            ) : (
              notifications.map((notif) => (
                <TouchableOpacity
                  key={notif.id}
                  style={[
                    styles.notifItem,
                    !notif.read && {
                      backgroundColor:
                        theme.mode === 'light'
                          ? hexToRgba(palette.black, 0.03)
                          : hexToRgba(palette.white, 0.03),
                    },
                  ]}
                  onPress={() => onDismiss(notif.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.notifItemContent}>
                    <View style={styles.notifItemRow}>
                      {/* Unread dot */}
                      {!notif.read && (
                        <View
                          style={[
                            styles.notifDot,
                            { backgroundColor: c.accent },
                          ]}
                        />
                      )}
                      <Heading
                        size="sm"
                        style={!notif.read ? {} : { fontWeight: theme.fontWeights.regular }}
                      >
                        {notif.title}
                      </Heading>
                    </View>
                    <BodyText size="sm" muted style={styles.notifMessage}>
                      {notif.message}
                    </BodyText>
                    <BodyText size="sm" style={[styles.notifTime, { color: c.muted }]}>
                      {notif.time}
                    </BodyText>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Footer */}
          {notifications.length > 0 && (
            <TouchableOpacity
              style={[styles.notifFooter, { borderTopColor: c.border }]}
              onPress={onClose}
            >
              <BodyText size="sm" muted>
                Tap a notification to dismiss
              </BodyText>
            </TouchableOpacity>
          )}
        </GlassCard>
      </View>
    </Modal>
  );
}

function hexToRgba(hex: string, opacity: number): string {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

const getStyles = (theme: Theme) => {
  const { spacing: s, radii: r, fontSizes: fs } = theme;
  return StyleSheet.create({
    notifOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    notifBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: hexToRgba(palette.black, 0.35),
    },
    notifPanel: {
      borderTopLeftRadius: r['2xl'],
      borderTopRightRadius: r['2xl'],
      borderBottomLeftRadius: r.none,
      borderBottomRightRadius: r.none,
      padding: s[10],
      maxHeight: '70%',
    },
    headerContainer: {
      marginBottom: s[4],
    },
    notifClearBtn: {
      paddingHorizontal: s[5],
      paddingVertical: s[2],
      borderRadius: r.lg,
      borderWidth: 1,
      marginRight: s[4],
    },
    notifCloseBtn: {
      padding: s[2],
    },
    notifList: {
      maxHeight: 320,
    },
    notifEmpty: {
      alignItems: 'center',
      paddingVertical: s[16],
    },
    emptyText: {
      marginTop: s[4],
    },
    notifItem: {
      paddingVertical: s[6],
      paddingHorizontal: s[4],
      borderRadius: r.lg,
      marginBottom: s[2],
    },
    notifItemContent: {
      flex: 1,
    },
    notifItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: s[2],
    },
    notifDot: {
      width: s[4],
      height: s[4],
      borderRadius: r.md,
      marginRight: s[4],
    },
    notifMessage: {
      marginBottom: s[2],
      paddingLeft: s[8],
    },
    notifTime: {
      paddingLeft: s[8],
      fontSize: fs.xs,
    },
    notifFooter: {
      borderTopWidth: 1,
      paddingTop: s[6],
      marginTop: s[4],
      alignItems: 'center',
    },
  });
};
