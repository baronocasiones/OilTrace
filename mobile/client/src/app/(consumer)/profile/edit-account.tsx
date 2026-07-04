/**
 * Edit Account
 *
 * Form screen with account info section and change password section.
 * Pushed onto the tab stack via Expo Router with back navigation.
 *
 * States: pre-filled form, saving (spinner + disabled), error (inline text),
 *         offline (banner + read-only fields + hidden save button),
 *         validation errors on field level.
 */

import { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  StyleSheet,
  Pressable,
} from 'react-native';
import { router, Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { createGlobalStyles } from '../../../theme/globalStyles';
import { spacing } from '../../../theme/tokens';
import { GlassCard, Button, BodyText, Label, OilInput, Heading } from '../../../components/ui';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useProfileStore } from '../../../store/profileStore';

// Simple PH phone pattern: starts with 09, followed by 9 digits
const PHONE_REGEX = /^09\d{9}$/;

export default function EditAccountScreen() {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const profile = useProfileStore((s) => s.profile);
  const isSaving = useProfileStore((s) => s.isSaving);
  const saveError = useProfileStore((s) => s.saveError);
  const isOffline = useProfileStore((s) => s.isOffline);
  const updateAccount = useProfileStore((s) => s.updateAccount);
  const updatePassword = useProfileStore((s) => s.updatePassword);

  // ── Form state ────────────────────────────────────────────────────────────

  const account = profile?.account;
  const [phone, setPhone] = useState(account?.phone ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ── Validation state ──────────────────────────────────────────────────────

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    // Phone validation
    if (!phone.trim()) {
      errors.phone = 'Phone number is required.';
    } else if (!PHONE_REGEX.test(phone.trim())) {
      errors.phone = 'Enter a valid PH phone number (e.g., 09171234567).';
    }

    // Password validation — if any password field is filled, all three required
    const anyPasswordFilled = currentPassword || newPassword || confirmPassword;

    if (anyPasswordFilled) {
      if (!currentPassword) {
        errors.currentPassword = 'Current password is required.';
      }
      if (!newPassword) {
        errors.newPassword = 'New password is required.';
      } else if (newPassword.length < 6) {
        errors.newPassword = 'Password must be at least 6 characters.';
      }
      if (!confirmPassword) {
        errors.confirmPassword = 'Please confirm your new password.';
      } else if (newPassword !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [phone, currentPassword, newPassword, confirmPassword]);

  // ── Save handler ──────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    // Save account info
    await updateAccount({ phone: phone.trim() });

    // If password fields are filled, also update password
    if (currentPassword && newPassword && confirmPassword) {
      await updatePassword(currentPassword, newPassword);
    }

    // Check for errors
    const currentError = useProfileStore.getState().saveError;
    if (currentError) {
      // Error is already set in the store, it will render in the UI
      return;
    }

    Alert.alert('Success', 'Changes saved.', [{ text: 'OK' }]);
    router.back();
  }, [validate, updateAccount, updatePassword, phone, currentPassword, newPassword, confirmPassword]);

  const isDirty =
    phone !== (account?.phone ?? '') ||
    currentPassword !== '' ||
    newPassword !== '' ||
    confirmPassword !== '';

  const handleCancel = useCallback(() => {
    if (isDirty) {
      Alert.alert(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  }, [isDirty]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={g.screenBg}>
      <Stack.Screen options={{ title: 'Account Settings', headerBackTitle: 'Back' }} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
      >
        {/* Offline Banner */}
        {isOffline && (
          <View style={[g.errorBox, styles.offlineBanner]}>
            <BodyText size="sm" danger>
              Connect to internet to edit profile
            </BodyText>
          </View>
        )}

        {/* Header Section */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: `${c.accent}1A`, borderColor: `${c.accent}40` }]}>
            <MaterialCommunityIcons name="shield-account-outline" size={32} color={c.accent} />
          </View>
          <View style={styles.headerText}>
            <Heading size="md">Account Settings</Heading>
            <BodyText size="sm" muted style={{ marginTop: spacing[1] }}>
              Manage your email, phone, and password
            </BodyText>
          </View>
        </View>

        <View style={{ height: spacing[8] }} />

        {/* Section 1 — Account Info */}
        <GlassCard elevated style={styles.formCard}>
          <OilInput
            label="Email"
            value={account?.email ?? ''}
            editable={false}
            placeholder="Email address"
          />
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync('https://oiltrace.app/help')}
            style={({ pressed }) => [
              { marginTop: spacing[2], marginBottom: spacing[6], alignSelf: 'flex-start' },
              { opacity: pressed ? 0.6 : 1 }
            ]}
          >
            <BodyText size="sm" accent style={{ textDecorationLine: 'underline' }}>
              Contact support to change your email.
            </BodyText>
          </Pressable>

          <OilInput
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="09171234567"
            keyboardType="phone-pad"
            editable={!isOffline}
            error={fieldErrors.phone}
          />
        </GlassCard>

        <View style={{ height: spacing[6] }} />

        {/* Section 2 — Change Password */}
        <GlassCard elevated style={styles.formCard}>
          <Label size="md">Change Password</Label>
          <BodyText muted size="sm" style={{ marginTop: spacing[2], marginBottom: spacing[6] }}>
            Leave blank to keep your current password.
          </BodyText>

          <OilInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            secureTextEntry
            editable={!isOffline}
            error={fieldErrors.currentPassword}
          />

          <View style={{ height: spacing[6] }} />

          <OilInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Min. 6 characters"
            secureTextEntry
            editable={!isOffline}
            error={fieldErrors.newPassword}
          />

          <View style={{ height: spacing[6] }} />

          <OilInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter new password"
            secureTextEntry
            editable={!isOffline}
            error={fieldErrors.confirmPassword}
          />
        </GlassCard>

        {/* Error State */}
        {saveError && (
          <View style={[g.errorBox, { marginTop: spacing[6] }]}>
            <BodyText size="sm" danger>
              {saveError}
            </BodyText>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {!isOffline && (
            <Button
              variant="solid-teal"
              fullWidth
              loading={isSaving}
              disabled={isSaving}
              onPress={handleSave}
            >
              Save Changes
            </Button>
          )}

          <View style={{ height: spacing[4] }} />

          <Button
            variant="glass"
            fullWidth
            onPress={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing[8],
  },
  offlineBanner: {
    marginBottom: spacing[6],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    marginLeft: spacing[5],
    flex: 1,
  },
  formCard: {
    padding: spacing[6],
  },
  actions: {
    marginTop: spacing[8],
  },
});
