# 03 — Smart Contract (Solidity on Ethereum Sepolia)

## Overview

The OilTrace smart contract stores immutable proof of each oil collection on the Ethereum Sepolia testnet. Only the FastAPI service wallet (the contract owner) can write new records. Anyone can read and verify them — providing transparency for consumers, buyers, and regulators.

## Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title OilTrace
 * @notice Immutable record of used cooking oil collections with TPM grading
 * @dev Deployed on Ethereum Sepolia testnet (chain ID: 11155111)
 */
contract OilTrace {
    // ───────────────────────────── Types ─────────────────────────────

    /**
     * @notice Core data stored on-chain for each collection
     * @param consumerRef Off-chain UUID reference to the consumer
     * @param tpmValue TPM * 100 (e.g., 24.5% → 2450)
     * @param grade 0=Premium(SAF), 1=Standard(Blended), 2=Low(Biofuel)
     * @param volumeMl Volume in milliliters
     * @param timestamp Unix timestamp of collection
     * @param locationHash Geohash of collection location (privacy-preserving)
     * @param driverRef Off-chain UUID reference to the driver
     * @param dataIntegrity keccak256 hash of the full off-chain JSON record
     */
    struct CollectionRecord {
        string  consumerRef;
        uint256 tpmValue;
        uint8   grade;           // 0 = Premium (SAF), 1 = Standard (Blended), 2 = Low (Biofuel)
        uint256 volumeMl;
        uint256 timestamp;
        string  locationHash;
        string  driverRef;
        bytes32 dataIntegrity;
    }

    // ──────────────────────────── Storage ────────────────────────────

    /// @notice All collection records, append-only
    CollectionRecord[] public records;

    /// @notice Contract owner (the FastAPI service wallet)
    address public immutable owner;

    /// @notice Total records ever created (mirrors records.length)
    uint256 public recordCount;

    // ──────────────────────────── Events ────────────────────────────

    /// @notice Emitted when a new collection is recorded
    event CollectionRecorded(
        uint256 indexed id,
        uint256 tpmValue,
        uint8   grade,
        uint256 timestamp
    );

    /// @notice Emitted if a record needs correction (future use)
    event RecordAmended(uint256 indexed id, string reason);

    // ──────────────────────────── Modifiers ──────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "OilTrace: caller is not the owner");
        _;
    }

    modifier validRecord(uint256 _id) {
        require(_id < records.length, "OilTrace: record does not exist");
        _;
    }

    // ──────────────────────────── Constructor ────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ──────────────────────────── Write ──────────────────────────────

    /**
     * @notice Record a new oil collection on-chain
     * @param _consumerRef Off-chain consumer UUID
     * @param _tpmValue TPM value * 100 (e.g., 2450 for 24.5%)
     * @param _grade Oil grade (0=Premium/SAF, 1=Standard/Blended, 2=Low/Biofuel)
     * @param _volumeMl Volume in milliliters
     * @param _locationHash Geohash string (e.g., "wdw3q2")
     * @param _driverRef Off-chain driver UUID
     * @param _dataIntegrity keccak256 hash of off-chain record JSON
     * @return id The index of the newly created record
     */
    function recordCollection(
        string calldata _consumerRef,
        uint256 _tpmValue,
        uint8   _grade,
        uint256 _volumeMl,
        string calldata _locationHash,
        string calldata _driverRef,
        bytes32 _dataIntegrity
    ) external onlyOwner returns (uint256) {
        require(_grade <= 2, "OilTrace: invalid grade");

        records.push(CollectionRecord({
            consumerRef:   _consumerRef,
            tpmValue:      _tpmValue,
            grade:         _grade,
            volumeMl:      _volumeMl,
            timestamp:     block.timestamp,
            locationHash:  _locationHash,
            driverRef:     _driverRef,
            dataIntegrity: _dataIntegrity
        }));

        uint256 id = records.length - 1;
        recordCount = records.length;

        emit CollectionRecorded(id, _tpmValue, _grade, block.timestamp);
        return id;
    }

    // ──────────────────────────── Read ───────────────────────────────

    /**
     * @notice Get a single collection record by ID
     * @param _id Record index
     * @return CollectionRecord struct
     */
    function getRecord(uint256 _id) external view validRecord(_id)
        returns (CollectionRecord memory)
    {
        return records[_id];
    }

    /**
     * @notice Get the total number of records stored
     * @return Record count
     */
    function getRecordCount() external view returns (uint256) {
        return records.length;
    }

    /**
     * @notice Verify that a record's data integrity hash matches
     * @param _id Record index
     * @param _hash keccak256 hash to verify against
     * @return true if the hash matches
     */
    function verifyData(uint256 _id, bytes32 _hash) external view validRecord(_id)
        returns (bool)
    {
        return records[_id].dataIntegrity == _hash;
    }

    /**
     * @notice Batch read: get multiple records in one call
     * @param _ids Array of record indices
     * @return Array of CollectionRecord structs
     */
    function getRecords(uint256[] calldata _ids) external view
        returns (CollectionRecord[] memory)
    {
        CollectionRecord[] memory result = new CollectionRecord[](_ids.length);
        for (uint256 i = 0; i < _ids.length; i++) {
            require(_ids[i] < records.length, "OilTrace: record does not exist");
            result[i] = records[_ids[i]];
        }
        return result;
    }
}
```

## Deployment

| Parameter | Value |
|-----------|-------|
| Network | Ethereum Sepolia Testnet |
| Chain ID | 11155111 |
| Tool | Hardhat or Foundry |
| Gas estimate | ~80,000 gas per collection (~0.0016 ETH, free on testnet) |
| ETH source | Sepolia faucet (https://sepoliafaucet.com) |

## Key Design Decisions

### Why store grade on-chain?
The grade (SAF vs biofuel) determines the oil's destination and value. Storing it immutably on Ethereum provides:
- **For buyers:** Proof that the oil was properly graded
- **For regulators:** Tamper-proof audit trail
- **For consumers:** Transparency into where their oil went

### Why use geohash instead of raw coordinates?
Raw lat/lng would reveal the exact karinderya location on a public blockchain. A geohash (e.g., "wdw3q2" = ~1km² area) preserves privacy while still providing location proof.

### Why only store a data integrity hash?
Storing the full record on-chain is expensive (gas costs). Instead, we store a keccak256 hash of the complete JSON record. Anyone can verify: `hash(full_record) == stored_hash`. Full data lives in PostgreSQL with access controls.

## Verification Flow

```
Consumer sees collection in app
        │
        ▼
GET /api/blockchain/verify/{collection_id}
        │
        ▼
FastAPI:
  1. Fetch collection + blockchain_records from DB
  2. Call getRecord(blockchain_id) on smart contract
  3. Compare DB hash with on-chain hash
  4. Compare all fields match
  5. Return { verified: true/false, tx_hash, block_number, ... }
```

## Background Tx Confirmation Poller

The IoT API returns immediately after the transaction is submitted (not mined). A background process confirms it.

```
POST /api/v1/iot/reading →
  Web3.py sends tx → returns tx_hash immediately →
  blockchain_records.status = 'pending'
       │
       ▼
Background Poller (runs every 30s in FastAPI):
  1. Query: SELECT * FROM blockchain_records
              WHERE status = 'pending'
              AND created_at > NOW() - INTERVAL '30 minutes'
  2. For each pending record:
     tx_receipt = web3.eth.get_transaction_receipt(tx_hash)
     if tx_receipt and tx_receipt['status'] == 1:
         UPDATE blockchain_records
         SET status = 'confirmed',
             block_number = tx_receipt['blockNumber'],
             gas_used = tx_receipt['gasUsed']
     elif tx_receipt and tx_receipt['status'] == 0:
         UPDATE blockchain_records SET status = 'failed'
         → Optionally: retry by calling recordCollection() again
  3. Sleep 30 seconds, repeat
```

**Poller Config:**
| Parameter | Value |
|-----------|-------|
| Poll interval | 30 seconds |
| Max age for pending tx | 30 minutes (drop stale) |
| Max retries on failure | 3 attempts |
| Supabase Realtime broadcast | On status change → notify owner dashboard |

## Cost (Testnet vs Mainnet)

| Network | Per Collection | Notes |
|---------|---------------|-------|
| Sepolia Testnet | **₱0** | Free ETH from faucets |
| Ethereum Mainnet | ~$3-10 USD (~₱180-600) | Current gas prices |
| Polygon Mainnet | ~$0.01-0.05 USD (~₱0.60-3) | Cheaper L2 alternative for production |

For the hackathon MVP, Sepolia testnet is perfect. If you ever go to production, Polygon is the recommended L2 for cost-effective traceability.
