/**
 * Profile Hub — Tab 4 of 4
 *
 * Five-section ScrollView profile screen with:
 *   A — Profile Header (avatar, name, badge, address)
 *   B — Menu Rows (Business Profile, Account Settings)
 *   C — App Preferences (ThemeSwitcher light/dark/dim)
 *   D — App Info (version, Terms, Privacy)
 *   E — Logout
 *
 * States: loading (skeletons), error (full-screen retry), offline (banner),
 *         empty (never in mock mode), pull-to-refresh, logout confirmation.
 */

import { useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { createGlobalStyles } from '../../theme/globalStyles';
import { spacing, radii, fontSizes, fonts, fontWeights } from '../../theme/tokens';
import { GlassCard, Button, Badge, Heading, BodyText, Label, ThemeSwitcher, SkeletonBlock } from '../../components/ui';
import { useProfileStore } from '../../store/profileStore';
import { getInitials } from '../../mocks/profile';
import type { ThemeMode } from '../../theme/theme';

// ─── Route helper — sub-routes registered in (consumer)/_layout.tsx ─────────

const PROFILE_ROUTES = {
  editBusiness: '/(consumer)/profile/edit-business',
  editAccount: '/(consumer)/profile/edit-account',
} as const;

// ─── Inline Icons ───────────────────────────────────────────────────────────

function ChevronIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ExternalLinkIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BusinessIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 22V12h6v10" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function AccountIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function HelpIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── MenuRow ────────────────────────────────────────────────────────────────

interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

function MenuRow({ icon, label, onPress }: MenuRowProps) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={g.row}>
        <View style={g.iconContainerAccent}>
          {icon}
        </View>
        <BodyText style={{ marginLeft: spacing[5] }}>{label}</BodyText>
      </View>
      <ChevronIcon color={c.muted} />
    </Pressable>
  );
}

// ─── Skeleton Card (local — structure specific to this screen) ─────────────────

function SkeletonCard({ color }: { color: string }) {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);

  return (
    <GlassCard style={styles.skeletonCard}>
      <View style={g.col}>
        <SkeletonBlock width="60%" height={14} color={color} style={{ marginBottom: spacing[4] }} />
        <SkeletonBlock width="80%" height={12} color={color} style={{ marginBottom: spacing[3] }} />
        <SkeletonBlock width="40%" height={12} color={color} />
      </View>
    </GlassCard>
  );
}

// ─── Main Profile Screen ─────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { theme, mode, setMode } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const profile = useProfileStore((s) => s.profile);
  const isLoading = useProfileStore((s) => s.isLoading);
  const error = useProfileStore((s) => s.error);
  const isOffline = useProfileStore((s) => s.isOffline);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const setThemeStore = useProfileStore((s) => s.setTheme);
  const resetStore = useProfileStore((s) => s.resetStore);

  // Fetch profile on mount
  useEffect(() => { fetchProfile(); }, []);

  const handleRefresh = useCallback(() => { fetchProfile(); }, [fetchProfile]);

  // ── Theme handler: sync store + context ──────────────────────────────────

  const handleThemeChange = useCallback(
    (newMode: ThemeMode) => { setMode(newMode); setThemeStore(newMode); },
    [setMode, setThemeStore],
  );

  // ── Logout handler ───────────────────────────────────────────────────────

  const handleLogout = useCallback(() => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => { resetStore(); router.replace('/'); },
      },
    ]);
  }, [resetStore]);

  // ── Open URL helper ──────────────────────────────────────────────────────

  const openUrl = useCallback(async (url: string) => {
    try { await WebBrowser.openBrowserAsync(url); } catch { /* silent */ }
  }, []);

  // ── Error State (no data, fetch failed) ──────────────────────────────────

  if (error && !profile) {
    return (
      <View style={[g.screenBg, styles.centered]}>
        <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="10" stroke={c.danger} strokeWidth={1.75} />
          <Path d="M12 8v4M12 16h.01" stroke={c.danger} strokeWidth={2} strokeLinecap="round" />
        </Svg>
        <Heading size="sm" style={{ marginTop: spacing[6] }}>Something went wrong</Heading>
        <BodyText muted style={{ marginTop: spacing[4], textAlign: 'center' }}>
          Pull to refresh or tap retry
        </BodyText>
        <Button variant="glass" onPress={handleRefresh} style={{ marginTop: spacing[8] }}>Retry</Button>
      </View>
    );
  }

  // ── Loading State ────────────────────────────────────────────────────────

  if (isLoading && !profile) {
    return (
      <View style={[g.screenBg, { paddingTop: insets.top + spacing[8], paddingHorizontal: spacing[8] }]}>
        <SkeletonCard color={c.muted} />
        <View style={{ height: spacing[6] }} />
        <SkeletonCard color={c.muted} />
        <View style={{ height: spacing[6] }} />
        <SkeletonCard color={c.muted} />
      </View>
    );
  }

  // ── Main Render ──────────────────────────────────────────────────────────

  const initials = profile ? getInitials(profile.business.business_name) : '--';

  return (
    <View style={g.screenBg}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={c.accent} />}
      >
        {/* Offline Banner */}
        {isOffline && (
          <View style={[g.errorBox, styles.offlineBanner]}>
            <BodyText size="sm" danger>You're offline — showing cached data</BodyText>
          </View>
        )}

        {/* Section A — Profile Header */}
        <GlassCard elevated style={styles.profileHeaderCard}>
          <View style={g.row}>
            <View style={[styles.avatar, { backgroundColor: `${c.accent}1A`, borderColor: `${c.accent}40` }]}>
              <BodyText accent style={styles.avatarText}>{initials}</BodyText>
            </View>
            <View style={styles.headerInfo}>
              <Heading size="lg">{profile?.business.business_name ?? '—'}</Heading>
              <View style={{ marginTop: spacing[2] }}>
                <Badge variant="premium">Karinderya Partner</Badge>
              </View>
              <BodyText muted size="sm" style={{ marginTop: spacing[3] }}>
                {profile?.business.address ?? '—'}
              </BodyText>
            </View>
          </View>
          {error && (
            <View style={[g.errorBox, { marginTop: spacing[6] }]}>
              <View style={g.rowBetween}>
                <BodyText size="sm" danger>{error}</BodyText>
                <Button variant="glass" size="sm" onPress={handleRefresh}>Retry</Button>
              </View>
            </View>
          )}
        </GlassCard>

        <View style={{ height: spacing[4] }} />

        {/* Section B — Menu Rows */}
        <GlassCard>
          <MenuRow icon={<BusinessIcon color={c.accent} />} label="Eatery Profile" onPress={() => router.push(PROFILE_ROUTES.editBusiness as any)} />
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <MenuRow icon={<AccountIcon color={c.accent} />} label="Account Settings" onPress={() => router.push(PROFILE_ROUTES.editAccount as any)} />
        </GlassCard>

        <View style={{ height: spacing[4] }} />

        {/* Section C & D — Preferences & App Info */}
        <GlassCard>
          <View style={{ paddingHorizontal: spacing[5], paddingTop: spacing[5] }}>
            <Label size="md">Theme</Label>
            <View style={{ marginTop: spacing[4], marginBottom: spacing[2] }}>
              <ThemeSwitcher currentMode={mode} onModeChange={handleThemeChange} />
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <Pressable
            onPress={() => openUrl('https://oiltrace.app/help')}
            style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.7 : 1 }]}
          >
            <BodyText size="md">Help & Support</BodyText>
            <ExternalLinkIcon color={c.accent} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <Pressable
            onPress={() => openUrl('https://oiltrace.app/terms')}
            style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.7 : 1 }]}
          >
            <BodyText size="md">Terms of Service</BodyText>
            <ExternalLinkIcon color={c.accent} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <Pressable
            onPress={() => openUrl('https://oiltrace.app/privacy')}
            style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.7 : 1 }]}
          >
            <BodyText size="md">Privacy Policy</BodyText>
            <ExternalLinkIcon color={c.accent} />
          </Pressable>
        </GlassCard>

        <View style={{ height: spacing[6] }} />

        {/* Section E — Logout */}
        <Button variant="glass-danger" fullWidth onPress={handleLogout}>Log Out</Button>

        {/* Footer Version Info */}
        <View style={styles.footer}>
          <BodyText muted size="sm">Version 1.0.0</BodyText>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: { padding: spacing[8], paddingTop: spacing[12] },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[8] },
  offlineBanner: { marginBottom: spacing[6] },
  profileHeaderCard: { padding: spacing[6] },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.display, fontWeight: fontWeights.bold, fontSize: fontSizes.md },
  headerInfo: { flex: 1, marginLeft: spacing[6] },
  skeletonCard: { padding: spacing[8] },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing[6], paddingHorizontal: spacing[5] },
  footer: { alignItems: 'center', justifyContent: 'center', marginTop: spacing[8] },
  divider: { height: 1, opacity: 0.4, marginHorizontal: spacing[5] },
});
