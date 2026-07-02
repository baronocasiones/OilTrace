/**
 * historyStore (F-004)
 *
 * Zustand store for collection history — list, detail cache,
 * blockchain verification, and offline state.
 *
 * Pattern matches dashboardStore.ts for consistency.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  mockCollections,
  type CollectionListItem,
  type CollectionDetail,
  type BlockchainVerification,
} from '../mocks/history';
import { getMockDetail, getMockBlockchainVerification } from '../mocks/history';

const LIST_CACHE_KEY = '@oiltrace_history_cache';
const DETAIL_CACHE_PREFIX = '@oiltrace_detail_cache_';

interface HistoryState {
  // List
  collections: CollectionListItem[];
  isLoading: boolean;
  error: string | null;
  isOffline: boolean;

  // Detail cache
  detailCache: Record<string, CollectionDetail>;
  loadingDetailId: string | null;
  detailError: string | null;

  // Blockchain verification
  blockchainCache: Record<string, BlockchainVerification>;
  verifyingId: string | null;
  verifyError: string | null;

  // Pagination (cursor-based, future use)
  nextCursor: string | null;
  hasMore: boolean;

  // Actions
  fetchHistory: (forceRefresh?: boolean) => Promise<void>;
  fetchDetail: (id: string) => Promise<void>;
  fetchBlockchainVerification: (collectionId: string) => Promise<void>;
  toggleOffline: () => void;
}

// ─── Simulated API helpers ──────────────────────────────────────────────

function simulateApiDelay(ms = 600): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldFail(): boolean {
  return false; // Always succeed in mock mode
}

// ─── Store ──────────────────────────────────────────────────────────────

export const useHistoryStore = create<HistoryState>((set, get) => ({
  // State
  collections: [],
  isLoading: false,
  error: null,
  isOffline: false,

  detailCache: {},
  loadingDetailId: null,
  detailError: null,

  blockchainCache: {},
  verifyingId: null,
  verifyError: null,

  nextCursor: null,
  hasMore: false,

  // ── Fetch history list ─────────────────────────────────────────────

  fetchHistory: async (forceRefresh = false) => {
    const { isOffline } = get();
    set({ isLoading: true, error: null });

    if (isOffline) {
      try {
        const cached = await AsyncStorage.getItem(LIST_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as CollectionListItem[];
          await simulateApiDelay(200);
          set({ collections: parsed, isLoading: false });
        } else {
          await simulateApiDelay(200);
          set({ collections: [], isLoading: false, error: 'Connect to internet to get started' });
        }
      } catch {
        set({ collections: [], isLoading: false, error: 'Error loading cached data' });
      }
      return;
    }

    try {
      await simulateApiDelay(700);
      if (shouldFail()) {
        throw new Error('API error');
      }

      // Use the full mock list (15 items)
      const data = [...mockCollections];

      // Cache
      await AsyncStorage.setItem(LIST_CACHE_KEY, JSON.stringify(data));

      set({
        collections: data,
        isLoading: false,
        error: null,
        nextCursor: null,
        hasMore: false,
      });
    } catch {
      set({ isLoading: false, error: 'Something went wrong. Pull to retry.' });
    }
  },

  // ── Fetch detail ──────────────────────────────────────────────────

  fetchDetail: async (id: string) => {
    const { isOffline, detailCache } = get();

    // Return cached detail immediately if available
    if (detailCache[id]) {
      return;
    }

    set({ loadingDetailId: id, detailError: null });

    if (isOffline) {
      try {
        const cached = await AsyncStorage.getItem(`${DETAIL_CACHE_PREFIX}${id}`);
        if (cached) {
          const parsed = JSON.parse(cached) as CollectionDetail;
          await simulateApiDelay(200);
          set((s) => ({
            detailCache: { ...s.detailCache, [id]: parsed },
            loadingDetailId: null,
          }));
        } else {
          set({ loadingDetailId: null, detailError: 'Could not load collection details' });
        }
      } catch {
        set({ loadingDetailId: null, detailError: 'Error loading cached detail' });
      }
      return;
    }

    try {
      await simulateApiDelay(500);
      const detail = getMockDetail(id);

      if (detail) {
        // Cache detail
        await AsyncStorage.setItem(`${DETAIL_CACHE_PREFIX}${id}`, JSON.stringify(detail));

        set((s) => ({
          detailCache: { ...s.detailCache, [id]: detail },
          loadingDetailId: null,
        }));
      } else {
        set({ loadingDetailId: null, detailError: 'Collection not found' });
      }
    } catch {
      set({ loadingDetailId: null, detailError: 'Could not load collection details' });
    }
  },

  // ── Fetch blockchain verification ─────────────────────────────────

  fetchBlockchainVerification: async (collectionId: string) => {
    const { blockchainCache } = get();

    // Return cached if available
    if (blockchainCache[collectionId]) {
      return;
    }

    set({ verifyingId: collectionId, verifyError: null });

    try {
      await simulateApiDelay(800);
      const verification = getMockBlockchainVerification(collectionId);

      if (verification) {
        set((s) => ({
          blockchainCache: { ...s.blockchainCache, [collectionId]: verification },
          verifyingId: null,
        }));
      } else {
        set({ verifyingId: null, verifyError: 'Could not verify on blockchain' });
      }
    } catch {
      set({ verifyingId: null, verifyError: 'Could not verify on blockchain' });
    }
  },

  // ── Toggle offline ───────────────────────────────────────────────

  toggleOffline: () => {
    const nextOffline = !get().isOffline;
    set({ isOffline: nextOffline });
    get().fetchHistory();
  },
}));
