import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
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

// ─── Request Collection Modal ─────────────────────────────────────────────────────

interface RequestCollectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (requestType: 'on_demand' | 'scheduled', date: string, notes: string) => void;
  theme: ReturnType<typeof useTheme>['theme'];
  g: ReturnType<typeof createGlobalStyles>;
}

function RequestCollectionModal({
  visible,
  onClose,
  onSubmit,
  theme,
  g,
}: RequestCollectionModalProps) {
  const [requestType, setRequestType] = useState<'on_demand' | 'scheduled'>('on_demand');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [notes, setNotes] = useState('');
  const c = theme.colors;

  const formatDateDisplay = (d: Date): string => {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
  };

  const formatDateISO = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handleSubmit = () => {
    const dateStr = selectedDate ? formatDateISO(selectedDate) : '';
    onSubmit(requestType, dateStr, notes);
    setRequestType('on_demand');
    setSelectedDate(null);
    setNotes('');
    setCalendarMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  };

  const handleCancel = () => {
    setRequestType('on_demand');
    setSelectedDate(null);
    setNotes('');
    setCalendarMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    onClose();
  };

  // ── Calendar helpers ─────────────────────────────────────────────────────

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const isDateSelectable = (day: number) => {
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return d >= today;
  };

  const handleDayPress = (day: number) => {
    if (!isDateSelectable(day)) return;
    setSelectedDate(new Date(year, month, day));
  };

  const prevMonth = () => {
    const prev = new Date(year, month - 1, 1);
    setCalendarMonth(prev);
  };

  const nextMonth = () => {
    const next = new Date(year, month + 1, 1);
    setCalendarMonth(next);
  };

  const monthLabel = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.requestOverlay}>
        <TouchableOpacity
          style={styles.requestBackdrop}
          activeOpacity={1}
          onPress={handleCancel}
        />
        <View style={[styles.requestPanel, { backgroundColor: c.surface }]}>
          {/* Header */}
          <View style={[g.rowBetween, { marginBottom: 20 }]}>
            <Heading size="md">Request Collection</Heading>
            <TouchableOpacity onPress={handleCancel}>
              <MaterialCommunityIcons name="close" size={22} color={c.muted} />
            </TouchableOpacity>
          </View>

          {/* Pickup Type Toggle */}
          <View style={styles.modalSection}>
            <Label style={{ marginBottom: 8 }}>Pickup Type</Label>
            <View style={styles.modalTypeRow}>
              <TouchableOpacity
                style={[
                  styles.modalTypeBtn,
                  {
                    borderColor: c.border,
                  },
                  requestType === 'on_demand' && {
                    backgroundColor: c.accent,
                    borderColor: c.accent,
                  },
                ]}
                onPress={() => setRequestType('on_demand')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="flash"
                  size={18}
                  color={requestType === 'on_demand' ? '#FFF' : c.accent}
                />
                <Text
                  style={[
                    styles.modalTypeText,
                    {
                      color: requestType === 'on_demand' ? '#FFF' : c.foreground,
                      fontFamily: theme.fonts.body,
                    },
                  ]}
                >
                  On-Demand
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalTypeBtn,
                  {
                    borderColor: c.border,
                  },
                  requestType === 'scheduled' && {
                    backgroundColor: c.accent,
                    borderColor: c.accent,
                  },
                ]}
                onPress={() => setRequestType('scheduled')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="calendar"
                  size={18}
                  color={requestType === 'scheduled' ? '#FFF' : c.accent}
                />
                <Text
                  style={[
                    styles.modalTypeText,
                    {
                      color: requestType === 'scheduled' ? '#FFF' : c.foreground,
                      fontFamily: theme.fonts.body,
                    },
                  ]}
                >
                  Scheduled
                </Text>
              </TouchableOpacity>
            </View>
            <BodyText size="sm" muted style={{ marginTop: 6 }}>
              {requestType === 'on_demand'
                ? 'A driver will be dispatched to your location right away.'
                : 'Choose a future date for your collection.'}
            </BodyText>
          </View>

          {/* Date picker calendar (Scheduled only) */}
          {requestType === 'scheduled' && (
            <View style={styles.modalSection}>
              <Label style={{ marginBottom: 8 }}>Pick a Date</Label>

              {/* Selected date display */}
              {selectedDate && (
                <View style={[styles.calendarSelectedRow, { backgroundColor: hexToRgba(c.accent, 0.08) }]}>
                  <MaterialCommunityIcons name="calendar-check" size={18} color={c.accent} />
                  <Text style={[styles.calendarSelectedText, { color: c.accent, fontFamily: theme.fonts.body }]}>
                    {formatDateDisplay(selectedDate)}
                  </Text>
                </View>
              )}

              {/* Month navigation */}
              <View style={styles.calendarNav}>
                <TouchableOpacity onPress={prevMonth} style={styles.calendarNavBtn} activeOpacity={0.6}>
                  <MaterialCommunityIcons name="chevron-left" size={22} color={c.foreground} />
                </TouchableOpacity>
                <Text style={[styles.calendarMonthLabel, { color: c.foreground, fontFamily: theme.fonts.body }]}>
                  {monthLabel}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={styles.calendarNavBtn} activeOpacity={0.6}>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={c.foreground} />
                </TouchableOpacity>
              </View>

              {/* Weekday headers */}
              <View style={styles.calendarGrid}>
                {WEEKDAY_HEADERS.map((wd) => (
                  <View key={wd} style={styles.calendarCell}>
                    <Text style={[styles.calendarWeekday, { color: c.muted }]}>{wd}</Text>
                  </View>
                ))}

                {/* Day cells */}
                {calendarDays.map((day, i) => {
                  if (day === null) {
                    return <View key={`empty-${i}`} style={styles.calendarCell} />;
                  }

                  const dayDate = new Date(year, month, day);
                  dayDate.setHours(0, 0, 0, 0);
                  const isToday = isSameDay(dayDate, today);
                  const isSelected = selectedDate && isSameDay(dayDate, selectedDate);
                  const selectable = isDateSelectable(day);

                  return (
                    <TouchableOpacity
                      key={`day-${day}`}
                      style={[
                        styles.calendarCell,
                        isSelected && [styles.calendarDaySelected, { backgroundColor: c.accent }],
                      ]}
                      onPress={() => handleDayPress(day)}
                      disabled={!selectable}
                      activeOpacity={0.6}
                    >
                      <Text
                        style={[
                          styles.calendarDay,
                          {
                            color: !selectable
                              ? c.muted + '40'  // 25% opacity
                              : isSelected
                                ? '#FFFFFF'
                                : c.foreground,
                            fontFamily: theme.fonts.body,
                          },
                          isToday && !isSelected && { color: c.accent, fontWeight: '700' },
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Notes field */}
          <View style={styles.modalSection}>
            <Label style={{ marginBottom: 8 }}>Notes (optional)</Label>
            <TextInput
              style={[
                styles.modalInput,
                styles.modalTextArea,
                {
                  backgroundColor: c.bg,
                  color: c.foreground,
                  borderColor: c.border,
                  fontFamily: theme.fonts.body,
                },
              ]}
              placeholder="e.g., May laman na yung container ko"
              placeholderTextColor={c.muted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Actions */}
          <View style={[g.row, { justifyContent: 'flex-end', marginTop: 8, gap: 12 }]}>
            <Button variant="glass" size="md" onPress={handleCancel}>
              Cancel
            </Button>
            <Button
              variant="solid-teal"
              size="md"
              onPress={handleSubmit}
              style={{ flex: 1, maxWidth: 160 }}
            >
              Submit Request
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Dashboard Screen ────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const { theme } = useTheme();
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

          {/* Right: Notification Bell */}
          <View style={styles.brandRight}>

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

      {/* ── Request Collection Modal ──────────────────────────────────────── */}
      <RequestCollectionModal
        visible={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSubmit={handleSubmitRequest}
        theme={theme}
        g={g}
      />

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

  // Request Collection Modal
  requestOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  requestBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  requestPanel: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalTypeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  modalTextArea: {
    minHeight: 80,
    paddingTop: 12,
  },

  // Calendar
  calendarSelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  calendarSelectedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarNavBtn: {
    padding: 8,
  },
  calendarMonthLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarWeekday: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  calendarDay: {
    fontSize: 14,
    fontWeight: '500',
  },
  calendarDaySelected: {
    borderRadius: 20,
  },
});
