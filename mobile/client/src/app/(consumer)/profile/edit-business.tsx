/**
 * Edit Business Profile
 *
 * Form screen for editing business name, address, contact number, and business type.
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
  Pressable,
  StyleSheet,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { createGlobalStyles } from '../../../theme/globalStyles';
import { spacing } from '../../../theme/tokens';
import { Button, BodyText, OilInput, GlassCard, Heading } from '../../../components/ui';
import { useProfileStore } from '../../../store/profileStore';
import { BUSINESS_TYPES, getInitials } from '../../../mocks/profile';
import type { BusinessProfile } from '../../../mocks/profile';

// Simple PH phone pattern: starts with 09, followed by 9 digits
const PHONE_REGEX = /^09\d{9}$/;

export default function EditBusinessScreen() {
  const { theme } = useTheme();
  const g = createGlobalStyles(theme);
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const profile = useProfileStore((s) => s.profile);
  const isSaving = useProfileStore((s) => s.isSaving);
  const saveError = useProfileStore((s) => s.saveError);
  const isOffline = useProfileStore((s) => s.isOffline);
  const updateBusiness = useProfileStore((s) => s.updateBusiness);

  // ── Form state ────────────────────────────────────────────────────────────

  const business = profile?.business;
  const [businessName, setBusinessName] = useState(business?.business_name ?? '');
  const [address, setAddress] = useState(business?.address ?? '');
  const [contactNumber, setContactNumber] = useState(business?.contact_number ?? '');
  const [businessType, setBusinessType] = useState<BusinessProfile['business_type']>(
    business?.business_type ?? 'karinderya',
  );

  // ── Validation state ──────────────────────────────────────────────────────

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!businessName.trim() || businessName.trim().length < 2) {
      errors.businessName = 'Eatery name must be at least 2 characters.';
    }
    if (!address.trim()) {
      errors.address = 'Address is required.';
    }
    if (!contactNumber.trim()) {
      errors.contactNumber = 'Contact number is required.';
    } else if (!PHONE_REGEX.test(contactNumber.trim())) {
      errors.contactNumber = 'Enter a valid PH phone number (e.g., 09171234567).';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [businessName, address, contactNumber]);

  // ── Save handler ──────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    await updateBusiness({
      business_name: businessName.trim(),
      address: address.trim(),
      contact_number: contactNumber.trim(),
      business_type: businessType,
    });

    // Check if save was successful (no error set in store)
    const currentError = useProfileStore.getState().saveError;
    if (!currentError) {
      Alert.alert('Success', 'Eatery profile updated.', [{ text: 'OK' }]);
      router.back();
    }
  }, [validate, updateBusiness, businessName, address, contactNumber, businessType]);

  const isDirty =
    businessName !== (business?.business_name ?? '') ||
    address !== (business?.address ?? '') ||
    contactNumber !== (business?.contact_number ?? '') ||
    businessType !== (business?.business_type ?? 'karinderya');

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
      <Stack.Screen options={{ title: 'Edit Eatery Profile', headerBackTitle: 'Back' }} />

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
            <Heading size="md" style={{ color: c.accent }}>
              {businessName ? getInitials(businessName) : '—'}
            </Heading>
          </View>
          <View style={styles.headerText}>
            <Heading size="md">Eatery Profile</Heading>
            <BodyText size="sm" muted style={{ marginTop: spacing[1] }}>
              Manage your business information
            </BodyText>
          </View>
        </View>

        <View style={{ height: spacing[8] }} />

        {/* Form Section */}
        <View>
          <OilInput
            label="Eatery Name"
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="e.g. Aling Nena's Eatery"
            editable={!isOffline}
            error={fieldErrors.businessName}
          />

          <View style={{ height: spacing[6] }} />

          <OilInput
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder="e.g. 123 Mabini St."
            multiline
            numberOfLines={3}
            editable={!isOffline}
            error={fieldErrors.address}
          />

          <View style={{ height: spacing[6] }} />

          <OilInput
            label="Contact Number"
            value={contactNumber}
            onChangeText={setContactNumber}
            placeholder="09171234567"
            keyboardType="phone-pad"
            editable={!isOffline}
            error={fieldErrors.contactNumber}
          />

          <View style={{ height: spacing[6] }} />

          {/* Business Type Selector */}
          <BodyText size="sm" style={{ marginBottom: spacing[4], marginLeft: spacing[1] }}>
            Eatery Type
          </BodyText>
          <View style={styles.typeGrid}>
            {BUSINESS_TYPES.map((bt) => {
              const isSelected = businessType === bt.value;
              return (
                <GlassCard
                  key={bt.value}
                  interactive={!isOffline}
                  onPress={() => setBusinessType(bt.value)}
                  style={[
                    styles.typeTile,
                    isSelected && { borderColor: c.accent, backgroundColor: `${c.accent}1A` },
                  ]}
                  elevated={isSelected}
                >
                  <BodyText
                    size="md"
                    style={{
                      color: isSelected ? c.accent : c.foreground,
                      fontFamily: theme.fonts.body,
                      fontWeight: isSelected ? theme.fontWeights.semibold : theme.fontWeights.regular,
                    }}
                  >
                    {bt.label}
                  </BodyText>
                </GlassCard>
              );
            })}
          </View>
        </View>

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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  typeTile: {
    flex: 1,
    minWidth: '45%', // Forces a 2x2 grid layout
    paddingVertical: spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    marginTop: spacing[8],
  },
});
