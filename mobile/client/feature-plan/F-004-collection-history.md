# F-004 — Collection History

**Status**: Done  
**Phase**: 2 — Consumer Dashboard  
**Dependencies**: F-001

## Goal
Allow consumers to review their past oil collections with quality grades, volumes, and blockchain-verified tamper-proof records.

## User Stories
- As a consumer, I want to see a chronological list of my past collections, so I can track my oil disposal history.
- As a consumer, I want to tap a collection to see full details (TPM, grade, driver, blockchain tx), so I have a complete record.
- As a consumer, I want to verify a collection on Etherscan, so I know the record is immutable and trustworthy.

## Screens / UI

### `app/(consumer)/history.tsx` — Collection list, Tab 2 of 4

**FlashList** (from `@shopify/flash-list`) of collection items to ensure 60fps scrolling performance as per best practices. Each item is a `GlassCard` (non-elevated, interactive) containing:

| Element | Component | Example |
|---|---|---|
| Date | `Label` | "Jun 20, 2026" |
| Volume | `Heading` size `sm` | "5L" |
| TPM value | `BodyText` | "18.3% TPM" |
| Grade badge | `Badge` variant `premium`/`standard`/`danger` | Green / Yellow / Red |
| Blockchain badge | `Badge` variant `blockchain-verified`/`blockchain-pending`/`blockchain-failed` | Checkmark / Hourglass / X |
| View on Etherscan | `Button` variant `glass` size `sm` | Opens via `expo-web-browser` |

**States**:
- **Empty state**: "No collections yet" with `BodyText` muted and a subtle illustration/icon area.
- **Loading state**: Skeleton `GlassCard` placeholders (3–4 items).
- **Offline banner**: `g.errorBox` banner at top with "You're offline — showing cached data".

**Pagination**:
- FlashList `onEndReached` wired for future cursor-based pagination.
- In mock mode, all records load at once (10–15 items).

**Navigation**:
- Tab 2 of 4 in `(consumer)/_layout.tsx`.
- Tapping a card navigates to `history/[id]`.

---

### `app/(consumer)/history/[id].tsx` — Collection detail screen

**Header**:
- Back arrow to return to history list.

**Section 1 — Collection Info GlassCard** (`elevated` variant):

| Element | Component | Example |
|---|---|---|
| Collection date & time | `Heading` size `sm` | "June 20, 2026 — 10:30 AM" |
| Volume | `Heading` size `lg` | "5 L" |
| TPM value | `BodyText` | "18.3% TPM" |
| Grade + destination | `Badge` + `BodyText` | "Premium — Suitable for SAF" |
| Driver name | `BodyText` | "Juan dela Cruz" |
| Location | `BodyText` muted | "Brgy. San Isidro, General Trias" |

**Section 2 — Blockchain Verification GlassCard**:

| Element | Component | Example |
|---|---|---|
| Verification status | `Badge` | `blockchain-verified` |
| Transaction hash | `Mono` (tappable) | `0xabc123...` |
| Block number | `BodyText` | "#12,345,678" |
| View on Etherscan | `Button` variant `glass` | Opens via `expo-web-browser` |

**Section 3 — Points Awarded**:
- Small section showing "You earned 50 points from this collection" with `BodyText` accent.

**Offline behavior**:
- Show cached detail if available.
- Banner: "Some information may be unavailable offline."

## API Contracts

| Method | Endpoint | Request Body | Response |
|--------|----------|-------------|----------|
| GET | `/consumers/history` | — | `{collections: [...], next_cursor}` |
| GET | `/consumers/history/{id}` | — | Full collection record |
| GET | `/blockchain/verify/{collection_id}` | — | `{verified, tx_hash, block_number, hash_match}` |

### GET /consumers/history — Response

```json
{
  "collections": [
    {
      "id": "uuid",
      "collected_at": "2026-06-20T10:30:00Z",
      "volume_liters": 5.0,
      "tpm_value": 18.3,
      "oil_grade": "premium",
      "blockchain_status": "verified",
      "points_awarded": 50
    }
  ],
  "next_cursor": "cursor_string"
}
```

### GET /consumers/history/{id} — Response

```json
{
  "id": "uuid",
  "collected_at": "2026-06-20T10:30:00Z",
  "volume_liters": 5.0,
  "tpm_value": 18.3,
  "oil_grade": "premium",
  "oil_destination": "SAF",
  "driver_name": "Juan dela Cruz",
  "driver_id": "uuid",
  "location": "Brgy. San Isidro, General Trias",
  "points_awarded": 50,
  "consumer_signed": true,
  "blockchain_record": {
    "tx_hash": "0xabc123...",
    "block_number": 12345678,
    "status": "confirmed",
    "contract_address": "0x..."
  }
}
```

### GET /blockchain/verify/{collection_id} — Response

```json
{
  "collection_id": "uuid",
  "verified": true,
  "on_chain_record": {
    "consumerRef": "uuid",
    "tpmValue": 1830,
    "grade": 0,
    "volumeMl": 5000,
    "timestamp": 1719218400,
    "locationHash": "wdw3q2",
    "driverRef": "uuid",
    "dataIntegrity": "0xabc..."
  },
  "off_chain_hash": "0xabc...",
  "hash_match": true,
  "tx_hash": "0xabc...",
  "block_number": 12345678
}
```

## State / Data

- **Future Zustand store**: Part of a shared consumer store or standalone `historyStore` — holds collection list, cursor, detail cache.
- **Fetch on mount**: Collection list via `GET /consumers/history`.
- **On navigation**: Detail fetched on navigation to `history/[id]` via `GET /consumers/history/{id}`.
- **On demand**: Blockchain verification via `GET /blockchain/verify/{collection_id}`.
- **Mock data**: `src/mocks/history.ts` returns 10–15 varied records (mix of premium/standard/low grades and blockchain-verified/pending/failed statuses).

## Edge Cases & Error Handling

| Scenario | Behavior |
|---|---|
| **Empty history** | Show "No collections yet. Once your oil is collected, it will appear here." with a subtle illustration |
| **Offline — list** | Show cached history list if available |
| **Offline — detail** | Banner "Some information may be unavailable offline." |
| **Etherscan link fails** | `expo-web-browser` fails gracefully; toast "Could not open link. Check your internet connection." |
| **Blockchain verification pending** | `Badge` `blockchain-pending` with note "Verification in progress — typically confirmed within 2 minutes." |
| **Blockchain verification failed** | `Badge` `blockchain-failed` with note "This record could not be verified on-chain. Contact support." |
| **API error on list** | Error box with retry button + pull-to-refresh |
| **API error on detail** | Error box "Could not load collection details" + back button |

## TPM Grade Reference

| Grade | TPM Range | Destination | Badge Color |
|---|---|---|---|
| Premium | < 20% | SAF (Sustainable Aviation Fuel) | Green (`premium`) |
| Standard | 20–30% | Blended feedstock | Yellow (`standard`) |
| Low | > 30% | Local Biofuel/Biodiesel | Red (`danger`) |

## Acceptance Criteria

- [x] History list renders 10+ mock collection items with grades, volumes, and blockchain badges.
- [x] Empty state displays when there are no collections.
- [x] Tapping a collection item navigates to the detail screen.
- [x] Detail screen shows full record: date, volume, TPM, grade, destination, driver, blockchain info.
- [x] Transaction hash is tappable and opens Etherscan (mock URL in mock mode).
- [x] Pull-to-refresh reloads the list.
- [x] Offline banners display appropriately on both list and detail screens.
- [x] `APP_STATE.md` updated to ✅ for F-004.

## Design Reuse

Reuses these existing components (no new UI primitives needed):

| Component | Usage |
|---|---|
| `GlassCard` | List items, detail sections (elevated) |
| `Badge` | Grade badges (premium/standard/danger), blockchain status (verified/pending/failed) |
| `Heading` | Volume display, section headers |
| `BodyText` | TPM values, descriptions, driver info, metadata |
| `Label` | Date labels, field labels |
| `Mono` | Transaction hash display |
| `Button` | View on Etherscan (glass), retry actions |

**Global Styles (`g`)**: 
Must strictly use `g.row`, `g.rowBetween`, `g.col`, `g.textAccent`, `g.textMuted`, etc., from `createGlobalStyles(theme)` for all layout compositions inside the cards and screens. Avoid writing custom multi-line flexbox layout CSS in feature files to maintain consistency and maximize code reuse.

## Notes
- `expo-web-browser` is already in package.json for Etherscan deep links.
- Needs `@shopify/flash-list` installed via `npx expo install @shopify/flash-list` to support performant scrolling.
- A `CollectionCard` convenience component (composing GlassCard + Badge) may be extracted during implementation if repeated across Dashboard and History screens.
- TPM values are displayed with one decimal place (e.g., "18.3%").
- Blockchain verification is fetched on-demand when the detail screen loads, not pre-fetched for the list.
