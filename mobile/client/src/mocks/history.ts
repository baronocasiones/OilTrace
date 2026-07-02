/**
 * Mock data for Collection History (F-004)
 *
 * Provides 15 varied collection records plus detail and blockchain
 * verification mocks matching the API contracts in the spec.
 */

export type OilGrade = 'premium' | 'standard' | 'danger';
export type BlockchainStatus = 'verified' | 'pending' | 'failed';

export interface CollectionListItem {
  id: string;
  collected_at: string;
  volume_liters: number;
  tpm_value: number;
  oil_grade: OilGrade;
  blockchain_status: BlockchainStatus;
  points_awarded: number;
}

export interface BlockchainRecord {
  tx_hash: string;
  block_number: number;
  status: 'confirmed' | 'pending' | 'failed';
  contract_address: string;
}

export interface CollectionDetail {
  id: string;
  collected_at: string;
  volume_liters: number;
  tpm_value: number;
  oil_grade: OilGrade;
  blockchain_status: BlockchainStatus;
  oil_destination: string;
  driver_name: string;
  driver_id: string;
  location: string;
  points_awarded: number;
  consumer_signed: boolean;
  blockchain_record: BlockchainRecord | null;
}

export interface BlockchainVerification {
  collection_id: string;
  verified: boolean;
  on_chain_record: {
    consumerRef: string;
    tpmValue: number;
    grade: number;
    volumeMl: number;
    timestamp: number;
    locationHash: string;
    driverRef: string;
    dataIntegrity: string;
  };
  off_chain_hash: string;
  hash_match: boolean;
  tx_hash: string;
  block_number: number;
}

// ─── Grade → destination mapping ─────────────────────────────────────────

export const GRADE_INFO: Record<OilGrade, { label: string; destination: string; badgeVariant: 'premium' | 'standard' | 'danger' }> = {
  premium: { label: 'Premium (SAF)', destination: 'SAF (Sustainable Aviation Fuel)', badgeVariant: 'premium' },
  standard: { label: 'Standard', destination: 'Blended Feedstock', badgeVariant: 'standard' },
  danger: { label: 'Low Grade', destination: 'Local Biofuel / Biodiesel', badgeVariant: 'danger' },
};

// ─── Mock Collections List ───────────────────────────────────────────────

export const mockCollections: CollectionListItem[] = [
  {
    id: 'col-001',
    collected_at: '2026-07-01T09:15:00Z',
    volume_liters: 4.5,
    tpm_value: 12.1,
    oil_grade: 'premium',
    blockchain_status: 'verified',
    points_awarded: 45,
  },
  {
    id: 'col-002',
    collected_at: '2026-06-28T14:30:00Z',
    volume_liters: 6.0,
    tpm_value: 18.3,
    oil_grade: 'premium',
    blockchain_status: 'verified',
    points_awarded: 60,
  },
  {
    id: 'col-003',
    collected_at: '2026-06-25T10:00:00Z',
    volume_liters: 3.2,
    tpm_value: 24.7,
    oil_grade: 'standard',
    blockchain_status: 'verified',
    points_awarded: 32,
  },
  {
    id: 'col-004',
    collected_at: '2026-06-22T16:45:00Z',
    volume_liters: 5.5,
    tpm_value: 15.0,
    oil_grade: 'premium',
    blockchain_status: 'pending',
    points_awarded: 55,
  },
  {
    id: 'col-005',
    collected_at: '2026-06-20T11:20:00Z',
    volume_liters: 2.8,
    tpm_value: 22.1,
    oil_grade: 'standard',
    blockchain_status: 'pending',
    points_awarded: 28,
  },
  {
    id: 'col-006',
    collected_at: '2026-06-18T08:00:00Z',
    volume_liters: 7.0,
    tpm_value: 10.5,
    oil_grade: 'premium',
    blockchain_status: 'verified',
    points_awarded: 70,
  },
  {
    id: 'col-007',
    collected_at: '2026-06-15T13:10:00Z',
    volume_liters: 4.0,
    tpm_value: 35.8,
    oil_grade: 'danger',
    blockchain_status: 'verified',
    points_awarded: 40,
  },
  {
    id: 'col-008',
    collected_at: '2026-06-12T09:30:00Z',
    volume_liters: 5.2,
    tpm_value: 28.4,
    oil_grade: 'standard',
    blockchain_status: 'failed',
    points_awarded: 0,
  },
  {
    id: 'col-009',
    collected_at: '2026-06-10T15:00:00Z',
    volume_liters: 3.8,
    tpm_value: 16.9,
    oil_grade: 'premium',
    blockchain_status: 'verified',
    points_awarded: 38,
  },
  {
    id: 'col-010',
    collected_at: '2026-06-08T07:45:00Z',
    volume_liters: 6.5,
    tpm_value: 33.2,
    oil_grade: 'danger',
    blockchain_status: 'pending',
    points_awarded: 65,
  },
  {
    id: 'col-011',
    collected_at: '2026-06-05T12:20:00Z',
    volume_liters: 5.0,
    tpm_value: 14.7,
    oil_grade: 'premium',
    blockchain_status: 'verified',
    points_awarded: 50,
  },
  {
    id: 'col-012',
    collected_at: '2026-06-03T10:10:00Z',
    volume_liters: 4.2,
    tpm_value: 26.3,
    oil_grade: 'standard',
    blockchain_status: 'verified',
    points_awarded: 42,
  },
  {
    id: 'col-013',
    collected_at: '2026-05-30T14:50:00Z',
    volume_liters: 3.5,
    tpm_value: 11.8,
    oil_grade: 'premium',
    blockchain_status: 'verified',
    points_awarded: 35,
  },
  {
    id: 'col-014',
    collected_at: '2026-05-28T09:00:00Z',
    volume_liters: 8.0,
    tpm_value: 38.5,
    oil_grade: 'danger',
    blockchain_status: 'verified',
    points_awarded: 80,
  },
  {
    id: 'col-015',
    collected_at: '2026-05-25T16:30:00Z',
    volume_liters: 4.8,
    tpm_value: 20.5,
    oil_grade: 'standard',
    blockchain_status: 'verified',
    points_awarded: 48,
  },
];

// ─── Mock Collection Details ─────────────────────────────────────────────

const DRIVERS = [
  { name: 'Juan dela Cruz', id: 'drv-001' },
  { name: 'Maria Santos', id: 'drv-002' },
  { name: 'Pedro Reyes', id: 'drv-003' },
  { name: 'Ana Gonzales', id: 'drv-004' },
  { name: 'Jose Mercado', id: 'drv-005' },
];

const LOCATIONS = [
  'Brgy. San Isidro, General Trias',
  'Brgy. Pinagpala, Dasmariñas',
  'Brgy. Salitran, Imus',
  'Brgy. Panapaan, Bacoor',
  'Brgy. San Francisco, General Trias',
  'Brgy. Buenavista, Silang',
  'Brgy. Bagong Bayan, Carmona',
];

const TX_HASHES = [
  '0x7a1b9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
  '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c',
  '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
  '0x8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b',
  '0x0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
  '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
  '0x6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b',
];

export function getMockDetail(id: string): CollectionDetail | null {
  const listItem = mockCollections.find((c) => c.id === id);
  if (!listItem) return null;

  const driverIdx = parseInt(id.slice(-1), 10) % DRIVERS.length;
  const locIdx = parseInt(id.slice(-1), 10) % LOCATIONS.length;
  const txIdx = parseInt(id.slice(-1), 10) % TX_HASHES.length;

  const blockNum = 12340000 + parseInt(id.slice(-3), 10);

  return {
    id: listItem.id,
    collected_at: listItem.collected_at,
    volume_liters: listItem.volume_liters,
    tpm_value: listItem.tpm_value,
    oil_grade: listItem.oil_grade,
    blockchain_status: listItem.blockchain_status,
    oil_destination: GRADE_INFO[listItem.oil_grade].destination,
    driver_name: DRIVERS[driverIdx].name,
    driver_id: DRIVERS[driverIdx].id,
    location: LOCATIONS[locIdx],
    points_awarded: listItem.points_awarded,
    consumer_signed: true,
    blockchain_record:
      listItem.blockchain_status === 'failed'
        ? null
        : {
            tx_hash: TX_HASHES[txIdx],
            block_number: blockNum,
            status: listItem.blockchain_status === 'verified' ? 'confirmed' : 'pending',
            contract_address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
          },
  };
}

export function getMockBlockchainVerification(collectionId: string): BlockchainVerification | null {
  const detail = getMockDetail(collectionId);
  if (!detail) return null;

  const listItem = mockCollections.find((c) => c.id === collectionId);
  const gradeMap: Record<string, number> = { premium: 0, standard: 1, danger: 2 };
  const tx_hash = detail.blockchain_record?.tx_hash ?? TX_HASHES[0];
  const block_number = detail.blockchain_record?.block_number ?? 12345678;
  const verified = listItem?.blockchain_status === 'verified';
  const pending = listItem?.blockchain_status === 'pending';
  const hash_match = listItem?.blockchain_status !== 'failed';

  return {
    collection_id: collectionId,
    verified,
    on_chain_record: {
      consumerRef: '0xabc123def456',
      tpmValue: Math.round(detail.tpm_value * 100),
      grade: gradeMap[detail.oil_grade] ?? 0,
      volumeMl: Math.round(detail.volume_liters * 1000),
      timestamp: Math.floor(new Date(detail.collected_at).getTime() / 1000),
      locationHash: 'wdw3q2',
      driverRef: detail.driver_id,
      dataIntegrity: '0xabc123def456789...',
    },
    off_chain_hash: verified ? '0xabc123def456789...' : pending ? '' : '0xabc123def456789...',
    hash_match,
    tx_hash,
    block_number,
  };
}

// ─── Empty mock exports ──────────────────────────────────────────────────

export const mockCollectionsEmpty: CollectionListItem[] = [];
