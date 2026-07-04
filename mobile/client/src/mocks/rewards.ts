/**
 * Mock Data: Rewards (F-005)
 *
 * Rich mock objects reflecting the backend DB schema for points, partners,
 * and vouchers. Includes realistic oiltrace:// deep links for qr_data.
 *
 * Points Economics Reference:
 *   Base rate 10 pts/L · Discount value PHP 0.50–1.00/pt · Min redemption 10 pts · Expiry 90 days
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PointsData {
  balance: number;
  peso_value: number;
  earned_total: number;
  used_total: number;
  transactions: PointsTransaction[];
}

export interface PointsTransaction {
  id: string;
  type: 'earned' | 'redeemed';
  amount: number;
  description: string;
  created_at: string;
}

export interface Partner {
  id: string;
  name: string;
  brand: string;
  logo_url: string | null;
  discount_per_point: number;    // PHP discount per point
  points_per_liter: number;      // Points earned per liter
  min_redemption: number;        // Minimum points needed to redeem
}

export interface Voucher {
  id: string;
  voucher_code: string;
  discount_amount: number;
  partner_name: string;
  status: 'active' | 'used' | 'expired';
  expires_at: string;
  qr_data: string;               // Deep link e.g. oiltrace://voucher/...
}

export interface RedemptionResult {
  voucher_code: string;
  discount_amount: number;
  partner_name: string;
  qr_data: string;
  expires_at: string;
}

// ─── Points Data ─────────────────────────────────────────────────────────────

export const mockPointsData: PointsData = {
  balance: 240,
  peso_value: 120,
  earned_total: 300,
  used_total: 60,
  transactions: [
    {
      id: 'txn-001',
      type: 'earned',
      amount: 240,
      description: '5.0L Premium Oil Collection',
      created_at: '2026-06-28T14:30:00Z',
    },
    {
      id: 'txn-002',
      type: 'earned',
      amount: 60,
      description: '2.0L Standard Oil Collection',
      created_at: '2026-06-20T10:15:00Z',
    },
    {
      id: 'txn-003',
      type: 'redeemed',
      amount: -60,
      description: 'Redeemed at Minola — ₱30 off',
      created_at: '2026-06-15T09:00:00Z',
    },
  ],
};

export const emptyPointsData: PointsData = {
  balance: 0,
  peso_value: 0,
  earned_total: 0,
  used_total: 0,
  transactions: [],
};

// ─── Partners ────────────────────────────────────────────────────────────────

export const mockPartners: Partner[] = [
  {
    id: 'partner-001',
    name: 'Minola',
    brand: 'Minola Cooking Oil',
    logo_url: null,
    discount_per_point: 0.5,
    points_per_liter: 10,
    min_redemption: 10,
  },
  {
    id: 'partner-002',
    name: 'Magnolia',
    brand: 'Magnolia Cheezee',
    logo_url: null,
    discount_per_point: 1.0,
    points_per_liter: 10,
    min_redemption: 20,
  },
  {
    id: 'partner-003',
    name: 'Golden Fiesta',
    brand: 'Golden Fiesta Oil',
    logo_url: null,
    discount_per_point: 0.75,
    points_per_liter: 10,
    min_redemption: 15,
  },
  {
    id: 'partner-004',
    name: 'Silver Swan',
    brand: 'Silver Swan Soy Sauce',
    logo_url: null,
    discount_per_point: 0.5,
    points_per_liter: 10,
    min_redemption: 10,
  },
  {
    id: 'partner-005',
    name: 'Datu Puti',
    brand: 'Datu Puti Vinegar',
    logo_url: null,
    discount_per_point: 0.6,
    points_per_liter: 10,
    min_redemption: 25,
  },
];

// ─── Vouchers ────────────────────────────────────────────────────────────────

export const mockVouchers: Voucher[] = [
  {
    id: 'voucher-001',
    voucher_code: 'OIL-MINOLA-7F3A2B',
    discount_amount: 25,
    partner_name: 'Minola',
    status: 'active',
    expires_at: '2026-09-28T00:00:00Z',
    qr_data: 'oiltrace://voucher/OIL-MINOLA-7F3A2B',
  },
  {
    id: 'voucher-002',
    voucher_code: 'OIL-MAGNOLIA-9D1E4C',
    discount_amount: 30,
    partner_name: 'Magnolia',
    status: 'active',
    expires_at: '2026-09-20T00:00:00Z',
    qr_data: 'oiltrace://voucher/OIL-MAGNOLIA-9D1E4C',
  },
  {
    id: 'voucher-003',
    voucher_code: 'OIL-MINOLA-5B8C2F',
    discount_amount: 20,
    partner_name: 'Minola',
    status: 'used',
    expires_at: '2026-07-15T00:00:00Z',
    qr_data: 'oiltrace://voucher/OIL-MINOLA-5B8C2F',
  },
  {
    id: 'voucher-004',
    voucher_code: 'OIL-SILVER-2E6F1D',
    discount_amount: 15,
    partner_name: 'Silver Swan',
    status: 'expired',
    expires_at: '2026-05-01T00:00:00Z',
    qr_data: 'oiltrace://voucher/OIL-SILVER-2E6F1D',
  },
];

// ─── Mock API Helpers ────────────────────────────────────────────────────────

export function getMockRedemption(partnerId: string): RedemptionResult | null {
  const partner = mockPartners.find((p) => p.id === partnerId);
  if (!partner) return null;

  const voucherCode = `OIL-${partner.name.toUpperCase().replace(/\s+/g, '')}-${generateCode(6)}`;
  const discountAmount = Math.round(mockPointsData.balance * partner.discount_per_point);
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 90);

  return {
    voucher_code: voucherCode,
    discount_amount: discountAmount,
    partner_name: partner.name,
    qr_data: `oiltrace://voucher/${voucherCode}`,
    expires_at: expiryDate.toISOString(),
  };
}

function generateCode(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
