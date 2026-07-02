/**
 * rewardsStore (F-005)
 *
 * Zustand store for points, partners, and vouchers.
 * Uses built-in persist middleware with AsyncStorage for automatic offline-first caching.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  mockPointsData,
  emptyPointsData,
  mockPartners,
  mockVouchers,
  getMockRedemption,
  type PointsData,
  type Partner,
  type Voucher,
  type RedemptionResult,
} from '../mocks/rewards';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RewardsState {
  // Points
  pointsData: PointsData | null;
  isLoadingPoints: boolean;
  pointsError: string | null;

  // Partners
  partners: Partner[];
  isLoadingPartners: boolean;
  partnersError: string | null;

  // Vouchers
  vouchers: Voucher[];
  isLoadingVouchers: boolean;
  vouchersError: string | null;

  // Redemption
  isRedeeming: boolean;
  redemptionError: string | null;
  redemptionResult: RedemptionResult | null;

  // Offline
  isOffline: boolean;

  // Hydration
  _hasHydrated: boolean;

  // Actions
  fetchAll: (forceRefresh?: boolean) => Promise<void>;
  redeem: (partnerId: string, pointsToUse: number) => Promise<void>;
  toggleOffline: () => void;
  clearRedemptionResult: () => void;
  setHasHydrated: (v: boolean) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function simulateApiDelay(ms = 600): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Partial state to persist (omit ephemeral flags) ─────────────────────────

interface PersistedState {
  pointsData: PointsData | null;
  partners: Partner[];
  vouchers: Voucher[];
  isOffline: boolean;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useRewardsStore = create<RewardsState>()(
  persist(
    (set, get) => ({
      // ══ Initial state ═════════════════════════════════════════════════

      pointsData: null,
      isLoadingPoints: false,
      pointsError: null,

      partners: [],
      isLoadingPartners: false,
      partnersError: null,

      vouchers: [],
      isLoadingVouchers: false,
      vouchersError: null,

      isRedeeming: false,
      redemptionError: null,
      redemptionResult: null,

      isOffline: false,
      _hasHydrated: false,

      // ══ Actions ════════════════════════════════════════════════════════

      setHasHydrated: (v: boolean) => set({ _hasHydrated: v }),

      fetchAll: async (_forceRefresh = false) => {
        const { isOffline } = get();

        set({
          isLoadingPoints: true,
          isLoadingPartners: true,
          isLoadingVouchers: true,
          pointsError: null,
          partnersError: null,
          vouchersError: null,
        });

        // Offline: rely on already-hydrated data, just clear loading
        if (isOffline) {
          await simulateApiDelay(200);
          const { pointsData } = get();
          set({
            isLoadingPoints: false,
            isLoadingPartners: false,
            isLoadingVouchers: false,
            pointsError: pointsData ? null : 'Connect to internet to get started',
          });
          return;
        }

        // Online: simulate API fetch
        try {
          await simulateApiDelay(700);

          const points = JSON.parse(JSON.stringify(mockPointsData)) as PointsData;
          const partners = JSON.parse(JSON.stringify(mockPartners)) as Partner[];
          const vouchers = JSON.parse(JSON.stringify(mockVouchers)) as Voucher[];

          set({
            pointsData: points,
            partners,
            vouchers,
            isLoadingPoints: false,
            isLoadingPartners: false,
            isLoadingVouchers: false,
          });
          // persist middleware auto-caches to AsyncStorage
        } catch {
          set({
            isLoadingPoints: false,
            isLoadingPartners: false,
            isLoadingVouchers: false,
            pointsError: 'Something went wrong. Pull to retry.',
            partnersError: 'Something went wrong. Pull to retry.',
            vouchersError: 'Something went wrong. Pull to retry.',
          });
        }
      },

      redeem: async (partnerId: string, pointsToUse: number) => {
        const { isOffline, pointsData, vouchers } = get();

        if (isOffline) {
          set({
            redemptionError: 'Cannot redeem while offline. Please connect to the internet.',
            isRedeeming: false,
          });
          return;
        }

        set({ isRedeeming: true, redemptionError: null, redemptionResult: null });

        try {
          await simulateApiDelay(1200);

          const result = getMockRedemption(partnerId);
          if (!result) {
            set({ isRedeeming: false, redemptionError: 'Redemption failed. Partner not found.' });
            return;
          }

          const newVoucher: Voucher = {
            id: `voucher-${Date.now()}`,
            voucher_code: result.voucher_code,
            discount_amount: result.discount_amount,
            partner_name: result.partner_name,
            status: 'active',
            expires_at: result.expires_at,
            qr_data: result.qr_data,
          };

          const updatedPoints: PointsData = pointsData
            ? {
                ...pointsData,
                balance: pointsData.balance - pointsToUse,
                used_total: pointsData.used_total + pointsToUse,
                transactions: [
                  {
                    id: `txn-${Date.now()}`,
                    type: 'redeemed',
                    amount: -pointsToUse,
                    description: `Redeemed at ${result.partner_name} — ₱${result.discount_amount} off`,
                    created_at: new Date().toISOString(),
                  },
                  ...pointsData.transactions,
                ],
              }
            : emptyPointsData;

          const updatedVouchers = [newVoucher, ...vouchers];

          set({
            pointsData: updatedPoints,
            vouchers: updatedVouchers,
            isRedeeming: false,
            redemptionResult: result,
            redemptionError: null,
          });
          // persist middleware auto-caches to AsyncStorage
        } catch {
          set({
            isRedeeming: false,
            redemptionError: 'Redemption failed. Please try again.',
            redemptionResult: null,
          });
        }
      },

      toggleOffline: () => {
        const nextOffline = !get().isOffline;
        set({ isOffline: nextOffline });
        get().fetchAll();
      },

      clearRedemptionResult: () => {
        set({ redemptionResult: null, redemptionError: null });
      },
    }),
    {
      name: '@oiltrace_rewards_store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the data fields, not ephemeral UI flags
      partialize: (state): PersistedState => ({
        pointsData: state.pointsData,
        partners: state.partners,
        vouchers: state.vouchers,
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
