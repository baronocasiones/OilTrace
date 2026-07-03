/**
 * profileStore (F-010)
 *
 * Zustand store for consumer profile data.
 * Uses built-in persist middleware with AsyncStorage for automatic offline-first caching.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  mockProfileData,
  MOCK_PASSWORD,
  type ProfileData,
  type BusinessProfile,
} from '../mocks/profile';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'dim';

interface ProfileState {
  // Profile data
  profile: ProfileData | null;
  isLoading: boolean;
  error: string | null;

  // Saving state
  isSaving: boolean;
  saveError: string | null;

  // Offline
  isOffline: boolean;

  // Hydration
  _hasHydrated: boolean;

  // Actions
  fetchProfile: (forceRefresh?: boolean) => Promise<void>;
  updateBusiness: (updates: Partial<BusinessProfile>) => Promise<void>;
  updateAccount: (updates: { phone: string }) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  setTheme: (mode: ThemeMode) => void;
  toggleOffline: () => void;
  setHasHydrated: (v: boolean) => void;
  resetStore: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function simulateApiDelay(ms = 800): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Partial state to persist (omit ephemeral flags) ─────────────────────────

interface PersistedState {
  profile: ProfileData | null;
  isOffline: boolean;
}

// ─── Initial state for reset ────────────────────────────────────────────────

const initialState: Pick<ProfileState, 'profile' | 'isLoading' | 'error' | 'isSaving' | 'saveError' | 'isOffline' | '_hasHydrated'> = {
  profile: null,
  isLoading: false,
  error: null,
  isSaving: false,
  saveError: null,
  isOffline: false,
  _hasHydrated: false,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      // ══ Initial state ═════════════════════════════════════════════════

      ...initialState,

      // ══ Actions ════════════════════════════════════════════════════════

      setHasHydrated: (v: boolean) => set({ _hasHydrated: v }),

      fetchProfile: async (_forceRefresh = false) => {
        const { isOffline } = get();

        set({ isLoading: true, error: null });

        if (isOffline) {
          await simulateApiDelay(200);
          const { profile } = get();
          set({
            isLoading: false,
            error: profile ? null : 'Connect to internet to view your profile',
          });
          return;
        }

        try {
          await simulateApiDelay(800);
          set({
            profile: JSON.parse(JSON.stringify(mockProfileData)) as ProfileData,
            isLoading: false,
            error: null,
          });
        } catch {
          set({
            isLoading: false,
            error: 'Something went wrong. Pull to retry.',
          });
        }
      },

      updateBusiness: async (updates: Partial<BusinessProfile>) => {
        const { isOffline, profile } = get();

        if (isOffline) {
          set({ saveError: 'Connect to internet to edit profile' });
          return;
        }

        set({ isSaving: true, saveError: null });

        try {
          await simulateApiDelay(800);

          if (profile) {
            const updated: ProfileData = {
              ...profile,
              business: { ...profile.business, ...updates },
            };
            set({ profile: updated, isSaving: false, saveError: null });
          } else {
            set({ isSaving: false, saveError: 'Profile data not found.' });
          }
        } catch {
          set({ isSaving: false, saveError: 'Could not save changes. Please try again.' });
        }
      },

      updateAccount: async (updates: { phone: string }) => {
        const { isOffline, profile } = get();

        if (isOffline) {
          set({ saveError: 'Connect to internet to edit profile' });
          return;
        }

        set({ isSaving: true, saveError: null });

        try {
          await simulateApiDelay(800);

          if (profile) {
            const updated: ProfileData = {
              ...profile,
              account: { ...profile.account, ...updates },
            };
            set({ profile: updated, isSaving: false, saveError: null });
          } else {
            set({ isSaving: false, saveError: 'Profile data not found.' });
          }
        } catch {
          set({ isSaving: false, saveError: 'Could not save changes. Please try again.' });
        }
      },

      updatePassword: async (currentPassword: string, _newPassword: string) => {
        const { isOffline } = get();

        if (isOffline) {
          set({ saveError: 'Connect to internet to edit profile' });
          return;
        }

        set({ isSaving: true, saveError: null });

        try {
          await simulateApiDelay(1000);

          // Validate current password against mock
          if (currentPassword !== MOCK_PASSWORD) {
            set({ isSaving: false, saveError: 'Current password is incorrect.' });
            return;
          }

          set({ isSaving: false, saveError: null });
        } catch {
          set({ isSaving: false, saveError: 'Could not save changes. Please try again.' });
        }
      },

      setTheme: (mode: ThemeMode) => {
        const { profile } = get();
        if (profile) {
          set({
            profile: {
              ...profile,
              preferences: { ...profile.preferences, theme: mode },
            },
          });
        }
      },

      toggleOffline: () => {
        const nextOffline = !get().isOffline;
        set({ isOffline: nextOffline });
        get().fetchProfile();
      },

      resetStore: () => {
        set({ ...initialState, _hasHydrated: get()._hasHydrated });
        // Clear persisted data from AsyncStorage
        AsyncStorage.removeItem('@oiltrace_profile_store').catch(() => {});
      },
    }),
    {
      name: '@oiltrace_profile_store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedState => ({
        profile: state.profile,
        isOffline: state.isOffline,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    },
  ),
);
