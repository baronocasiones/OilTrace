import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, type Theme } from '../../theme';
import { createGlobalStyles } from '../../theme/globalStyles';
import { Button } from '../ui/Button';
import { Heading, BodyText, Label } from '../ui/Typography';
import { palette } from '../../theme/tokens';

interface SimulationControlsProps {
  visible: boolean;
  isOffline: boolean;
  activeMockKey: string;
  toggleOffline: () => void;
  setMockState: (mockKey: string) => void;
  onClose: () => void;
}

export function SimulationControls({
  visible,
  isOffline,
  activeMockKey,
  toggleOffline,
  setMockState,
  onClose,
}: SimulationControlsProps) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;
  const styles = getStyles(theme);

  if (!visible) return null;

  return (
    <View style={[styles.mockControlsContainer, { backgroundColor: c.surface, borderTopColor: c.border }]}>
      <View style={g.rowBetween}>
        <Label style={g.labelMd}>🧪 Simulation Controls</Label>
        <TouchableOpacity onPress={onClose}>
          <MaterialCommunityIcons name="close" size={18} color={c.muted} />
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
          <BodyText size="sm" style={[g.textAccent, styles.boldText]}>
            {activeMockKey}
          </BodyText>
        </BodyText>
      </View>

      <View style={styles.mockPresetsContainer}>
        <Label style={[g.labelSm, styles.presetsLabel]}>Presets:</Label>
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
                      ? hexToRgba(palette.black, 0.03)
                      : hexToRgba(palette.white, 0.04),
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
                    ? [g.textAccent, styles.boldText]
                    : g.textMuted
                }
              >
                {preset.label}
              </BodyText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Hide controls toggle */}
      <TouchableOpacity
        style={[
          styles.tuneToggle,
          {
            backgroundColor:
              theme.mode === 'light'
                ? hexToRgba(palette.black, 0.04)
                : hexToRgba(palette.white, 0.06),
          },
        ]}
        onPress={onClose}
      >
        <MaterialCommunityIcons name="tune-vertical" size={16} color={c.muted} />
        <BodyText size="sm" muted style={styles.hideBtnText}>
          Hide controls
        </BodyText>
      </TouchableOpacity>
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
  const { spacing: s, radii: r, shadows: sh } = theme;
  return StyleSheet.create({
    mockControlsContainer: {
      position: 'absolute',
      bottom: 60,
      left: 0,
      right: 0,
      padding: s[6],
      borderTopWidth: 1,
      ...sh.lg, // Use system token shadow instead of hardcoded shadow fields
    },
    mockBtnRow: {
      marginVertical: s[5],
      justifyContent: 'space-between',
    },
    mockBtn: {
      paddingVertical: s[3],
      paddingHorizontal: s[6],
    },
    boldText: {
      fontWeight: theme.fontWeights.bold,
    },
    activeKeyIndicator: {
      marginRight: s[3],
    },
    mockPresetsContainer: {
      marginTop: s[2],
    },
    presetsLabel: {
      marginBottom: s[3],
    },
    mockPresetsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: s[3],
    },
    presetBadge: {
      paddingVertical: s[2],
      paddingHorizontal: s[4],
      borderRadius: r.lg,
      borderWidth: 1,
    },
    tuneToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: s[3],
      marginTop: s[4],
      borderRadius: r.md,
    },
    hideBtnText: {
      marginLeft: s[2],
    },
  });
};
