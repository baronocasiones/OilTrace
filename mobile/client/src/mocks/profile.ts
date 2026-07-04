/**
 * Mock Data: Profile (F-010)
 *
 * Consumer profile data including business info, account details, and preferences.
 * Mock password for change-password validation: "password123"
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BusinessProfile {
  business_name: string;
  address: string;
  contact_number: string;
  business_type: 'karinderya' | 'restaurant' | 'canteen' | 'other';
}

export interface AccountInfo {
  email: string;
  phone: string;
}

export interface ProfileData {
  business: BusinessProfile;
  account: AccountInfo;
  preferences: {
    theme: 'light' | 'dark' | 'dim';
  };
}

export const MOCK_PASSWORD = 'password123';

// ─── Mock Profile Data ───────────────────────────────────────────────────────

export const mockProfileData: ProfileData = {
  business: {
    business_name: "Aling Maria's Karinderya",
    address: '123 Rizal St, Brgy. San Isidro, General Trias, Cavite',
    contact_number: '09171234567',
    business_type: 'karinderya',
  },
  account: {
    email: 'alingmaria@email.com',
    phone: '09171234567',
  },
  preferences: {
    theme: 'light',
  },
};

// ─── Business Type Options ────────────────────────────────────────────────────

export const BUSINESS_TYPES: { value: BusinessProfile['business_type']; label: string }[] = [
  { value: 'karinderya', label: 'Karinderya' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'canteen', label: 'Canteen' },
  { value: 'other', label: 'Other' },
];

// ─── Avatar helpers ──────────────────────────────────────────────────────────

/**
 * Derive initials from a business name.
 * "Aling Maria's Karinderya" → "AM"
 * "Minola" → "M"
 */
export function getInitials(businessName: string): string {
  return businessName
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
