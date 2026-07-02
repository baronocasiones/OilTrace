import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { createGlobalStyles } from '../../theme/globalStyles';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Heading, BodyText, Label } from '../../components/ui/Typography';
import { useDashboardStore } from '../../store/dashboardStore';

// ─── Types ───────────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

// ─── Mock Notifications ──────────────────────────────────────────────────────────

const MOCK_NOTIFICATIONS: Notification[] = [
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

// ─── Notification Drawer ─────────────────────────────────────────────────────────

interface NotificationDrawerProps {
  visible: boolean;
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
  g: ReturnType<typeof createGlobalStyles>;
}

function NotificationDrawer({
  visible,
  notifications,
  onDismiss,
  onClearAll,
  onClose,
  theme,
  g,
}: NotificationDrawerProps) {
  const c = theme.colors;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.notifOverlay]}>
        <TouchableOpacity
          style={styles.notifBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <GlassCard elevated style={styles.notifPanel}>
          {/* Header */}
          <View style={[g.rowBetween, { marginBottom: 16 }]}>
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
                  <BodyText size="sm" accent>
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
                <BodyText muted style={{ marginTop: 8 }}>
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
                          ? 'rgba(0,0,0,0.03)'
                          : 'rgba(255,255,255,0.03)',
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
                      <Heading size="sm" style={!notif.read ? {} : { fontWeight: '400' }}>
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

// ─── Dashboard Screen ────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const { theme, setMode } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;

  const {
    data,
    isLoading,
    error,
    isOffline,
    isSubmittingRequest,
    requestError,
    requestSuccess,
    activeMockKey,
    fetchDashboardData,
    requestPickup,
    toggleOffline,
    setMockState,
  } = useDashboardStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showMockControls, setShowMockControls] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData(true);
    setRefreshing(false);
  }, [fetchDashboardData]);

  const handleRequestPickup = () => {
    requestPickup('May laman na yung container ko');
  };

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true })),
    );
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Sub-renders ──────────────────────────────────────────────────────────────

  const renderNextRequestCard = () => {
    if (!data) return null;
    const req = data.next_request;

    // No requests scheduled/pending
    if (!req || req.status === 'none' || req.status === 'completed') {
      return (
        <GlassCard style={styles.card}>
          <View style={g.rowBetween}>
            <View style={styles.cardContent}>
              <Label style={g.labelSm}>Next Collection</Label>
              <Heading size="sm" style={styles.cardHeading}>
                No upcoming pickups
              </Heading>
              <BodyText size="sm" muted>
                Need oil collection? Tap below to request one.
              </BodyText>
            </View>
            <View style={[g.iconContainerAccent, styles.iconBox]}>
              <MaterialCommunityIcons
                name="calendar-blank"
                size={24}
                color={c.accent}
              />
            </View>
          </View>
        </GlassCard>
      );
    }

    let statusText = '';
    let badgeVariant: any = 'blockchain-pending';
    let statusIcon: React.ComponentProps<
      typeof MaterialCommunityIcons
    >['name'] = 'clock-outline';
    let extraInfo = '';

    switch (req.status) {
      case 'pending':
        statusText = 'Waiting for driver assignment';
        badgeVariant = 'blockchain-pending';
        statusIcon = 'account-search-outline';
        extraInfo = "We're matching you with a collection driver.";
        break;
      case 'assigned':
        statusText = 'Driver on the way!';
        badgeVariant = 'blockchain-verified';
        statusIcon = 'truck-delivery-outline';
        extraInfo = req.driver_name
          ? `Driver: ${req.driver_name}`
          : 'Driver assigned';
        break;
      case 'in_progress':
        statusText = 'Collection in progress';
        badgeVariant = 'standard';
        statusIcon = 'loading';
        extraInfo = 'The driver is grading and measuring your oil.';
        break;
    }

    return (
      <GlassCard
        style={[
          styles.card,
          styles.cardAccentBorder,
          { borderColor: hexToRgba(c.accent, 0.3) },
        ]}
      >
        <View style={g.rowBetween}>
          <View style={styles.cardContent}>
            <View style={[g.row, styles.statusHeader]}>
              <Label style={[g.labelSm, { marginRight: 8 }]}>
                Pickup Status
              </Label>
              {req.status === 'in_progress' ? (
                <View style={g.row}>
                  <ActivityIndicator
                    size="small"
                    color={c.accentSecondaryDark}
                    style={{ marginRight: 4 }}
                  />
                  <Badge variant="standard">In Progress</Badge>
                </View>
              ) : (
                <Badge variant={badgeVariant}>{statusText}</Badge>
              )}
            </View>
            <Heading size="sm" style={styles.cardHeading}>
              {statusText}
            </Heading>
            <BodyText size="sm" muted>
              {extraInfo}
            </BodyText>
          </View>
          <View
            style={[
              req.status === 'assigned'
                ? g.iconContainerAccent
                : g.iconContainerGold,
              styles.iconBox,
            ]}
          >
            {req.status === 'in_progress' ? (
              <MaterialCommunityIcons
                name="flask-outline"
                size={24}
                color={c.accentSecondaryDark}
              />
            ) : (
              <MaterialCommunityIcons
                name={statusIcon}
                size={24}
                color={
                  req.status === 'assigned'
                    ? c.accent
                    : c.accentSecondaryDark
                }
              />
            )}
          </View>
        </View>
      </GlassCard>
    );
  };

  // ── Main Render ─────────────────────────────────────────────────────────────

  return (
    <View style={g.screenBg}>
      {/* Offline banner */}
      {isOffline && (
        <View style={[g.errorBox, styles.offlineBanner]}>
          <BodyText style={g.errorText}>
            <MaterialCommunityIcons name="wifi-off" size={16} />{' '}
            You're offline — showing cached data
          </BodyText>
        </View>
      )}

      {/* ── Brand Header ──────────────────────────────────────────────────── */}
      <View
        style={[
          styles.brandHeader,
          {
            backgroundColor: c.bg,
            borderBottomColor: c.border,
          },
        ]}
      >
        <View style={styles.brandHeaderRow}>
          {/* Left: Logo + OILTRACE display text */}
          <View style={styles.brandLeft}>
            <Image
              source={require('../../../assets/OilTraceLogo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.brandText,
                {
                  color: c.foreground,
                  fontFamily: theme.fonts.display,
                },
              ]}
            >
              OILTRACE
            </Text>
          </View>

          {/* Right: Theme Switcher + Notification Bell */}
          <View style={styles.brandRight}>
            {/* Theme Switcher Pills */}
            <View
              style={[
                styles.themeSwitcher,
                {
                  backgroundColor:
                    theme.mode === 'light'
                      ? 'rgba(0,0,0,0.05)'
                      : 'rgba(255,255,255,0.08)',
                },
              ]}
            >
              {(['light', 'dark', 'dim'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.themePill,
                    theme.mode === m && {
                      backgroundColor: c.accent,
                    },
                  ]}
                  onPress={() => setMode(m)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.themePillText,
                      {
                        color:
                          theme.mode === m ? '#FFFFFF' : c.muted,
                      },
                    ]}
                  >
                    {m === 'light'
                      ? 'Light'
                      : m === 'dark'
                        ? 'Dark'
                        : 'Dim'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notification Bell */}
            <TouchableOpacity
              style={styles.bellButton}
              onPress={() => setShowNotifications(true)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="bell-outline"
                size={22}
                color={c.foreground}
              />
              {unreadCount > 0 && (
                <View
                  style={[
                    styles.bellBadge,
                    { backgroundColor: c.danger },
                  ]}
                >
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Scrollable Content ────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.accent}
            colors={[c.accent]}
          />
        }
      >
        {/* API Error state when no data */}
        {error && !data ? (
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={48}
              color={c.danger}
            />
            <Heading size="md" style={styles.errorTitle}>
              {error}
            </Heading>
            <Button
              variant="solid-teal"
              onPress={() => fetchDashboardData(true)}
            >
              Retry Connection
            </Button>
          </View>
        ) : isLoading && !data ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={c.accent} />
            <BodyText style={{ marginTop: 16 }} muted>
              Loading OilTrace...
            </BodyText>
          </View>
        ) : (
          <View style={styles.mainContent}>
            {/* Welcome area below brand header */}
            <View style={styles.welcomeArea}>
              <Label
                style={[g.labelSm, { marginBottom: 2 }]}
              >
                ESTABLISHMENT ACCOUNT
              </Label>
              <Heading size="lg" style={[g.textAccent]}>
                {data?.business_name || 'Karinderya'}
              </Heading>
            </View>

            {/* Points balance GlassCard */}
            <GlassCard
              elevated
              interactive
              onPress={() => router.navigate('/(consumer)/rewards')}
              style={styles.pointsCard}
            >
              <View style={g.rowBetween}>
                <View>
                  <Label style={g.labelSm}>
                    Available Balance
                  </Label>
                  <Heading
                    size="lg"
                    style={[g.textAccent, styles.pointsText]}
                  >
                    {data?.points_balance || 0} pts
                  </Heading>
                  <BodyText size="sm" muted>
                    = ₱
                    {(
                      data?.points_peso_value || 0
                    ).toFixed(2)}{' '}
                    discount value
                  </BodyText>
                </View>
                <View style={styles.pointsIconContainer}>
                  <MaterialCommunityIcons
                    name="gift"
                    size={32}
                    color={c.accent}
                  />
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={c.muted}
                    style={styles.pointsArrow}
                  />
                </View>
              </View>
            </GlassCard>

            {/* Next collection status */}
            {renderNextRequestCard()}

            {/* Request Pickup Button */}
            <View style={styles.actionContainer}>
              <Button
                variant="solid-teal"
                fullWidth
                loading={isSubmittingRequest}
                onPress={handleRequestPickup}
                disabled={
                  isOffline ||
                  (data?.next_request &&
                    data.next_request.status !== 'none' &&
                    data.next_request.status !== 'completed')
                }
              >
                {data?.next_request &&
                data.next_request.status !== 'none' &&
                data.next_request.status !== 'completed'
                  ? 'Pickup Already Scheduled'
                  : 'Request Pickup'}
              </Button>

              {requestError && (
                <BodyText
                  size="sm"
                  danger
                  style={styles.inputError}
                >
                  {requestError}
                </BodyText>
              )}
              {requestSuccess && (
                <BodyText
                  size="sm"
                  style={[g.textAccent, styles.inputSuccess]}
                >
                  ✓ Pickup request submitted successfully!
                </BodyText>
              )}
            </View>

            {/* Recent collection card */}
            {data?.recent_collection ? (
              <View style={styles.recentSection}>
                <Label
                  style={[g.labelSm, styles.sectionTitle]}
                >
                  Recent Collection
                </Label>
                <GlassCard
                  interactive
                  onPress={() =>
                    router.push(
                      `/(consumer)/history/${data.recent_collection?.id}`,
                    )
                  }
                  style={styles.card}
                >
                  <View style={g.rowBetween}>
                    <View style={styles.cardContent}>
                      <Label style={g.labelSm}>
                        {new Date(
                          data.recent_collection.collected_at,
                        ).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Label>
                      <Heading
                        size="sm"
                        style={styles.recentVolume}
                      >
                        {data.recent_collection.volume_liters}L
                        Collected
                      </Heading>
                      <BodyText
                        size="sm"
                        muted
                        style={{ marginBottom: 8 }}
                      >
                        TPM reading:{' '}
                        {data.recent_collection.tpm_value}% TPM
                      </BodyText>

                      <View style={g.row}>
                        <View style={{ marginRight: 6 }}>
                          <Badge
                            variant={
                              data.recent_collection.oil_grade
                            }
                          >
                            {data.recent_collection
                              .oil_grade === 'premium'
                              ? 'Premium (SAF)'
                              : 'Standard'}
                          </Badge>
                        </View>
                        <Badge variant="blockchain-verified">
                          Verified
                        </Badge>
                      </View>
                    </View>

                    <View style={styles.recentAwardContainer}>
                      <BodyText
                        style={[
                          g.textAccent,
                          { fontWeight: 'bold' },
                        ]}
                      >
                        +{data.recent_collection.points_awarded}{' '}
                        pts
                      </BodyText>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={20}
                        color={c.muted}
                      />
                    </View>
                  </View>
                </GlassCard>
              </View>
            ) : data && !data.recent_collection ? (
              <View style={styles.recentSection}>
                <Label
                  style={[g.labelSm, styles.sectionTitle]}
                >
                  Recent Collection
                </Label>
                <GlassCard style={styles.card}>
                  <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons
                      name="leaf"
                      size={32}
                      color={c.muted}
                    />
                    <BodyText
                      style={styles.emptyText}
                      muted
                    >
                      Welcome! Request your first oil pickup to
                      start earning points.
                    </BodyText>
                  </View>
                </GlassCard>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* ── Mock Controls Drawer ──────────────────────────────────────────── */}
      {showMockControls && (
        <View
          style={[
            styles.mockControlsContainer,
            {
              backgroundColor: c.surface,
              borderTopColor: c.border,
            },
          ]}
        >
          <View style={g.rowBetween}>
            <Label style={g.labelMd}>🧪 Simulation Controls</Label>
            <TouchableOpacity
              onPress={() => setShowMockControls(false)}
            >
              <MaterialCommunityIcons
                name="close"
                size={18}
                color={c.muted}
              />
            </TouchableOpacity>
          </View>

          <View style={[g.row, styles.mockBtnRow]}>
            <Button
              variant={isOffline ? 'glass-danger' : 'glass'}
              size="sm"
              onPress={toggleOffline}
              style={styles.mockBtn}
            >
              {isOffline ? '🔌 Go Online' : '📴 Go Offline'}
            </Button>

            <BodyText size="sm" muted style={styles.activeKeyIndicator}>
              State:{' '}
              <BodyText
                size="sm"
                accent
                style={{ fontWeight: 'bold' }}
              >
                {activeMockKey}
              </BodyText>
            </BodyText>
          </View>

          <View style={styles.mockPresetsContainer}>
            <Label style={[g.labelSm, { marginBottom: 6 }]}>
              Presets:
            </Label>
            <View style={styles.mockPresetsGrid}>
              {[
                { key: 'default', label: 'Assigned Driver' },
                { key: 'pendingRequest', label: 'Pending Request' },
                { key: 'inProgressRequest', label: 'In Progress' },
                { key: 'noRequest', label: 'No Pickups' },
                { key: 'firstTime', label: 'Empty State' },
              ].map((preset) => (
                <TouchableOpacity
                  key={preset.key}
                  style={[
                    styles.presetBadge,
                    {
                      borderColor: hexToRgba(c.border, 0.5),
                      backgroundColor:
                        theme.mode === 'light'
                          ? 'rgba(0,0,0,0.03)'
                          : 'rgba(255,255,255,0.04)',
                    },
                    activeMockKey === preset.key && {
                      backgroundColor: hexToRgba(c.accent, 0.15),
                      borderColor: c.accent,
                    },
                  ]}
                  onPress={() => setMockState(preset.key)}
                >
                  <BodyText
                    size="sm"
                    style={
                      activeMockKey === preset.key
                        ? [g.textAccent, { fontWeight: 'bold' }]
                        : g.textMuted
                    }
                  >
                    {preset.label}
                  </BodyText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tune toggle inside controls */}
          <TouchableOpacity
            style={[
              styles.tuneToggle,
              {
                backgroundColor:
                  theme.mode === 'light'
                    ? 'rgba(0,0,0,0.04)'
                    : 'rgba(255,255,255,0.06)',
              },
            ]}
            onPress={() => setShowMockControls(false)}
          >
            <MaterialCommunityIcons
              name="tune-vertical"
              size={16}
              color={c.muted}
            />
            <BodyText size="sm" muted style={{ marginLeft: 4 }}>
              Hide controls
            </BodyText>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Notification Drawer Modal ─────────────────────────────────────── */}
      <NotificationDrawer
        visible={showNotifications}
        notifications={notifications}
        onDismiss={dismissNotification}
        onClearAll={clearAllNotifications}
        onClose={() => setShowNotifications(false)}
        theme={theme}
        g={g}
      />
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, opacity: number): string {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Brand Header
  brandHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  brandHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    height: 34,
    width: 34,
    marginRight: 10,
  },
  brandText: {
    fontSize: 22,
    letterSpacing: 1.2,
    fontWeight: '800',
  },
  brandRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeSwitcher: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  themePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  themePillText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  bellButton: {
    padding: 8,
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },

  // Welcome area
  welcomeArea: {
    marginBottom: 20,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 220,
  },
  mainContent: {
    padding: 20,
  },

  // Points card
  pointsCard: {
    padding: 20,
    marginBottom: 20,
  },
  pointsText: {
    fontSize: 32,
    marginVertical: 4,
  },
  pointsIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointsArrow: {
    marginLeft: 4,
  },

  // Cards
  card: {
    padding: 16,
    marginBottom: 20,
  },
  cardAccentBorder: {
    borderColor: 'rgba(34, 122, 108, 0.3)',
  },
  cardContent: {
    flex: 1,
    paddingRight: 12,
  },
  cardHeading: {
    marginTop: 4,
    marginBottom: 4,
  },
  statusHeader: {
    marginBottom: 4,
  },
  iconBox: {
    alignSelf: 'center',
  },

  // Actions
  actionContainer: {
    marginBottom: 24,
  },

  // Recent
  recentSection: {
    marginTop: 8,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  recentVolume: {
    marginTop: 4,
    marginBottom: 2,
  },
  recentAwardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: '80%',
  },

  // States
  centerContainer: {
    flex: 1,
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    gap: 16,
  },
  errorTitle: {
    textAlign: 'center',
  },
  offlineBanner: {
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    paddingVertical: 10,
    marginTop: Platform.OS === 'ios' ? 44 : 0,
  },
  inputError: {
    textAlign: 'center',
    marginTop: 8,
  },
  inputSuccess: {
    textAlign: 'center',
    marginTop: 8,
  },

  // Mock Controls
  mockControlsContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    padding: 12,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  mockBtnRow: {
    marginVertical: 10,
    justifyContent: 'space-between',
  },
  mockBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  activeKeyIndicator: {
    marginRight: 6,
  },
  mockPresetsContainer: {
    marginTop: 4,
  },
  mockPresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  tuneToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginTop: 8,
    borderRadius: 8,
  },

  // Notification Drawer
  notifOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  notifBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  notifPanel: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 20,
    maxHeight: '70%',
  },
  notifClearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  notifCloseBtn: {
    padding: 4,
  },
  notifList: {
    maxHeight: 320,
  },
  notifEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  notifItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  notifItemContent: {
    flex: 1,
  },
  notifItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  notifMessage: {
    marginBottom: 4,
    paddingLeft: 16,
  },
  notifTime: {
    paddingLeft: 16,
    fontSize: 11,
  },
  notifFooter: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
    alignItems: 'center',
  },
});
