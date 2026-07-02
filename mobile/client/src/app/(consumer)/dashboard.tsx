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
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, type Theme } from '../../theme';
import { createGlobalStyles } from '../../theme/globalStyles';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Heading, BodyText, Label } from '../../components/ui/Typography';
import { useDashboardStore } from '../../store/dashboardStore';
import { palette } from '../../theme/tokens';
import {
  NotificationDrawer,
  type Notification,
  MOCK_NOTIFICATIONS,
} from '../../components/consumer/NotificationDrawer';
import { RequestCollectionModal } from '../../components/consumer/RequestCollectionModal';
import { SimulationControls } from '../../components/consumer/SimulationControls';

export default function DashboardScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;
  const styles = getStyles(theme);

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
  const [showRequestModal, setShowRequestModal] = useState(false);
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
    setShowRequestModal(true);
  };

  const handleSubmitRequest = async (requestType: 'on_demand' | 'scheduled', date: string, notes: string) => {
    await requestPickup(notes, requestType, date || undefined);
    setShowRequestModal(false);
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
        ]}
      >
        <View style={g.rowBetween}>
          <View style={styles.cardContent}>
            <View style={[g.row, styles.statusHeader]}>
              <Label style={[g.labelSm, styles.statusLabel]}>
                Pickup Status
              </Label>
              {req.status === 'in_progress' ? (
                <View style={g.row}>
                  <ActivityIndicator
                    size="small"
                    color={c.accentSecondaryDark}
                    style={styles.loadingSpinner}
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

          {/* Right: Notification Bell */}
          <View style={styles.brandRight}>
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
            <BodyText style={styles.loadingText} muted>
              Loading OilTrace...
            </BodyText>
          </View>
        ) : (
          <View style={styles.mainContent}>
            {/* Welcome area below brand header */}
            <View style={styles.welcomeArea}>
              <Label
                style={[g.labelSm, styles.welcomeLabel]}
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
                        style={styles.recentTpm}
                      >
                        TPM reading:{' '}
                        {data.recent_collection.tpm_value}% TPM
                      </BodyText>

                      <View style={g.row}>
                        <View style={styles.recentBadgeWrapper}>
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
                          styles.recentAwardPoints,
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
      <SimulationControls
        visible={showMockControls}
        isOffline={isOffline}
        activeMockKey={activeMockKey}
        toggleOffline={toggleOffline}
        setMockState={setMockState}
        onClose={() => setShowMockControls(false)}
      />

      {/* ── Request Collection Modal ──────────────────────────────────────── */}
      <RequestCollectionModal
        visible={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSubmit={handleSubmitRequest}
        isOffline={isOffline}
      />

      {/* ── Notification Drawer Modal ─────────────────────────────────────── */}
      <NotificationDrawer
        visible={showNotifications}
        notifications={notifications}
        onDismiss={dismissNotification}
        onClearAll={clearAllNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </View>
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
  const { colors: c, spacing: s, radii: r, fonts: f, fontSizes: fs } = theme;

  return StyleSheet.create({
    // Brand Header
    brandHeader: {
      paddingTop: Platform.OS === 'ios' ? s[10] * 2.5 : s[6],
      paddingBottom: s[6],
      paddingHorizontal: s[8],
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
      marginRight: s[5],
    },
    brandText: {
      fontSize: fs.xl + s[1],
      letterSpacing: theme.letterSpacings.wide,
      fontWeight: theme.fontWeights.extrabold,
    },
    brandRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s[5],
    },
    bellButton: {
      padding: s[4],
      position: 'relative',
    },
    bellBadge: {
      position: 'absolute',
      top: s[1],
      right: s[1],
      minWidth: s[8],
      height: s[8],
      borderRadius: r.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: s[1] + 1,
    },
    bellBadgeText: {
      color: palette.white,
      fontSize: fs.xxs - 1,
      fontWeight: theme.fontWeights.bold,
      fontFamily: f.body,
    },

    // Welcome area
    welcomeArea: {
      marginBottom: s[10],
    },
    welcomeLabel: {
      marginBottom: s[1],
    },

    // Scroll
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: 220,
    },
    mainContent: {
      padding: s[10],
    },

    // Points card
    pointsCard: {
      padding: s[10],
      marginBottom: s[10],
    },
    pointsText: {
      fontSize: fs.display,
      marginVertical: s[2],
    },
    pointsIconContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s[4],
    },
    pointsArrow: {
      marginLeft: s[2],
    },

    // Cards
    card: {
      padding: s[8],
      marginBottom: s[10],
    },
    cardAccentBorder: {
      borderColor: hexToRgba(c.accent, 0.3),
      borderWidth: 1,
    },
    cardContent: {
      flex: 1,
      paddingRight: s[6],
    },
    cardHeading: {
      marginTop: s[2],
      marginBottom: s[2],
    },
    statusHeader: {
      marginBottom: s[2],
    },
    statusLabel: {
      marginRight: s[4],
    },
    loadingSpinner: {
      marginRight: s[2],
    },
    iconBox: {
      alignSelf: 'center',
    },

    // Actions
    actionContainer: {
      marginBottom: s[12],
    },

    // Recent
    recentSection: {
      marginTop: s[4],
    },
    sectionTitle: {
      marginBottom: s[5],
    },
    recentVolume: {
      marginTop: s[2],
      marginBottom: s[1],
    },
    recentTpm: {
      marginBottom: s[4],
    },
    recentBadgeWrapper: {
      marginRight: s[3],
    },
    recentAwardContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s[2],
    },
    recentAwardPoints: {
      fontWeight: theme.fontWeights.bold,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: s[10],
      gap: s[4],
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
      padding: s[14] + 2,
      gap: s[8],
    },
    loadingText: {
      marginTop: s[8],
    },
    errorTitle: {
      textAlign: 'center',
    },
    offlineBanner: {
      borderRadius: r.none,
      borderWidth: r.none,
      borderBottomWidth: 1,
      paddingVertical: s[5],
      marginTop: Platform.OS === 'ios' ? 44 : 0,
    },
    inputError: {
      textAlign: 'center',
      marginTop: s[4],
    },
    inputSuccess: {
      textAlign: 'center',
      marginTop: s[4],
    },
  });
};
