import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  mockDashboardData, 
  type DashboardData, 
  type NextRequest 
} from '../mocks/dashboard';

const CACHE_KEY = '@oiltrace_dashboard_cache';

interface DashboardState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  isOffline: boolean;
  isSubmittingRequest: boolean;
  requestError: string | null;
  requestSuccess: boolean;
  activeMockKey: string;

  // Actions
  fetchDashboardData: (forceRefresh?: boolean) => Promise<void>;
  requestPickup: (notes?: string, requestType?: 'on_demand' | 'scheduled', date?: string) => Promise<void>;
  toggleOffline: () => void;
  setMockState: (mockKey: string) => Promise<void>;
  clearCache: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  data: null,
  isLoading: false,
  error: null,
  isOffline: false,
  isSubmittingRequest: false,
  requestError: null,
  requestSuccess: false,
  activeMockKey: 'default',

  fetchDashboardData: async (forceRefresh = false) => {
    set({ isLoading: true, error: null });

    const { isOffline, activeMockKey } = get();

    if (isOffline) {
      // Simulate reading from local AsyncStorage cache
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsedData = JSON.parse(cached) as DashboardData;
          // Small delay to simulate local read
          await new Promise((resolve) => setTimeout(resolve, 300));
          set({ 
            data: parsedData, 
            isLoading: false,
            // If offline, we want to flag that it's cached/offline, 
            // but we don't treat it as a blocking error since we have cache.
            error: null 
          });
        } else {
          // No cache available and offline
          set({ 
            data: null, 
            isLoading: false, 
            error: 'Connect to internet to get started' 
          });
        }
      } catch (err) {
        set({ 
          data: null, 
          isLoading: false, 
          error: 'Error loading cached data' 
        });
      }
      return;
    }

    // Online path - fetch from mock API
    try {
      // Simulate network request delay (1 second)
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockData = mockDashboardData[activeMockKey] || mockDashboardData.default;
      
      // Cache the fetched data
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(mockData));

      set({ 
        data: JSON.parse(JSON.stringify(mockData)), // Deep copy to avoid mutating the static mock
        isLoading: false, 
        error: null 
      });
    } catch (err) {
      set({ 
        isLoading: false, 
        error: 'Something went wrong. Pull to retry.' 
      });
    }
  },

  requestPickup: async (notes = '', requestType: 'on_demand' | 'scheduled' = 'on_demand', date?: string) => {
    const { isOffline, data } = get();

    if (isOffline) {
      set({ requestError: 'Could not send request. Please try again.', requestSuccess: false });
      return;
    }

    set({ isSubmittingRequest: true, requestError: null, requestSuccess: false });

    try {
      // Simulate API request delay (1.2 seconds)
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Successfully submitted pickup request
      const newRequest: NextRequest = {
        id: `req-${Math.floor(Math.random() * 100000)}`,
        status: 'pending',
        request_type: requestType,
        driver_name: null,
        scheduled_date: date || null,
      };

      if (data) {
        const updatedData: DashboardData = {
          ...data,
          next_request: newRequest,
        };

        // Cache the updated dashboard representation
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updatedData));

        set({ 
          data: updatedData, 
          isSubmittingRequest: false, 
          requestSuccess: true,
          requestError: null
        });
      } else {
        set({ 
          isSubmittingRequest: false, 
          requestError: 'Could not update request. Dashboard data is missing.' 
        });
      }
    } catch (err) {
      set({ 
        isSubmittingRequest: false, 
        requestError: 'Could not send request. Please try again.' 
      });
    }
  },

  toggleOffline: () => {
    const nextOffline = !get().isOffline;
    set({ isOffline: nextOffline });
    // Trigger a refetch using the new offline state
    get().fetchDashboardData();
  },

  setMockState: async (mockKey: string) => {
    set({ activeMockKey: mockKey });
    // Refetch the data for the new state
    await get().fetchDashboardData();
  },

  clearCache: async () => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      set({ data: null });
    } catch (e) {
      console.error('Failed to clear cache', e);
    }
  }
}));
