import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ToastAndroid,
  Alert,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, type Theme } from '../../theme';
import { createGlobalStyles } from '../../theme/globalStyles';
import { Button } from '../ui/Button';
import { Heading, BodyText, Label } from '../ui/Typography';
import { palette } from '../../theme/tokens';

interface RequestCollectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (requestType: 'on_demand' | 'scheduled', date: string, notes: string) => void;
  isOffline: boolean;
}

export function RequestCollectionModal({
  visible,
  onClose,
  onSubmit,
  isOffline,
}: RequestCollectionModalProps) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;
  const styles = getStyles(theme);

  const [requestType, setRequestType] = useState<'on_demand' | 'scheduled'>('on_demand');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [notes, setNotes] = useState('');

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
    if (isOffline) {
      const msg = 'Connect to internet to request pickup';
      if (Platform.OS === 'android') {
        ToastAndroid.show(msg, ToastAndroid.SHORT);
      } else {
        Alert.alert('Offline Mode', msg);
      }
      return;
    }

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
          <View style={[g.rowBetween, styles.headerContainer]}>
            <Heading size="md">Request Collection</Heading>
            <TouchableOpacity onPress={handleCancel}>
              <MaterialCommunityIcons name="close" size={22} color={c.muted} />
            </TouchableOpacity>
          </View>

          {/* Pickup Type Toggle */}
          <View style={styles.modalSection}>
            <Label style={styles.sectionLabel}>Pickup Type</Label>
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
                  color={requestType === 'on_demand' ? palette.white : c.accent}
                />
                <Text
                  style={[
                    styles.modalTypeText,
                    {
                      color: requestType === 'on_demand' ? palette.white : c.foreground,
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
                  color={requestType === 'scheduled' ? palette.white : c.accent}
                />
                <Text
                  style={[
                    styles.modalTypeText,
                    {
                      color: requestType === 'scheduled' ? palette.white : c.foreground,
                      fontFamily: theme.fonts.body,
                    },
                  ]}
                >
                  Scheduled
                </Text>
              </TouchableOpacity>
            </View>
            <BodyText size="sm" muted style={styles.typeHelpText}>
              {requestType === 'on_demand'
                ? 'A driver will be dispatched to your location right away.'
                : 'Choose a future date for your collection.'}
            </BodyText>
          </View>

          {/* Date picker calendar (Scheduled only) */}
          {requestType === 'scheduled' && (
            <View style={styles.modalSection}>
              <Label style={styles.sectionLabel}>Pick a Date</Label>

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
                              ? c.muted + '40' // 25% opacity
                              : isSelected
                                ? palette.white
                                : c.foreground,
                            fontFamily: theme.fonts.body,
                          },
                          isToday && !isSelected && { color: c.accent, fontWeight: theme.fontWeights.bold },
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
            <Label style={styles.sectionLabel}>Notes (optional)</Label>
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
          <View style={[g.row, styles.actionRow]}>
            <Button variant="glass" size="md" onPress={handleCancel}>
              Cancel
            </Button>
            <Button
              variant={isOffline ? 'glass-danger' : 'solid-teal'}
              size="md"
              onPress={handleSubmit}
              style={styles.submitBtn}
            >
              {isOffline ? 'Offline' : 'Submit Request'}
            </Button>
          </View>
        </View>
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
  const { spacing: s, radii: r } = theme;
  return StyleSheet.create({
    requestOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    requestBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: hexToRgba(palette.black, 0.35),
    },
    requestPanel: {
      borderTopLeftRadius: r['2xl'],
      borderTopRightRadius: r['2xl'],
      borderBottomLeftRadius: r.none,
      borderBottomRightRadius: r.none,
      paddingHorizontal: s[10],
      paddingTop: s[10],
      paddingBottom: s[10],
    },
    headerContainer: {
      marginBottom: s[5],
    },
    modalSection: {
      marginBottom: s[6],
    },
    sectionLabel: {
      marginBottom: s[4],
    },
    modalTypeRow: {
      flexDirection: 'row',
      gap: s[4],
    },
    modalTypeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: s[4],
      borderRadius: r.lg,
      borderWidth: 1,
      gap: s[2],
    },
    modalTypeText: {
      fontSize: theme.fontSizes.base,
      fontWeight: theme.fontWeights.semibold,
    },
    typeHelpText: {
      marginTop: s[3],
    },
    calendarSelectedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: s[3],
      paddingHorizontal: s[4],
      borderRadius: r.md,
      marginBottom: s[4],
      gap: s[2],
    },
    calendarSelectedText: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.semibold,
    },
    calendarNav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: s[4],
    },
    calendarNavBtn: {
      padding: s[2],
    },
    calendarMonthLabel: {
      fontSize: theme.fontSizes.base,
      fontWeight: theme.fontWeights.semibold,
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    calendarCell: {
      width: '14.28%',
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    calendarWeekday: {
      fontSize: theme.fontSizes.xs,
      fontWeight: theme.fontWeights.semibold,
    },
    calendarDay: {
      fontSize: theme.fontSizes.sm,
    },
    calendarDaySelected: {
      borderRadius: r.xxl,
    },
    modalInput: {
      borderWidth: 1,
      borderRadius: r.lg,
      paddingHorizontal: s[4],
      paddingVertical: s[4],
      fontSize: theme.fontSizes.base,
    },
    modalTextArea: {
      minHeight: 80,
    },
    actionRow: {
      justifyContent: 'flex-end',
      marginTop: s[4],
      gap: s[6],
    },
    submitBtn: {
      flex: 1,
      maxWidth: 160,
    },
  });
};
