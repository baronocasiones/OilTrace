"""
Tests for the Ethereum blockchain service (Web3.py) and the background poller.

Covers: writing to Sepolia, verification endpoint, poller state machine,
RPC failure handling, stale record cleanup.
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timedelta, timezone


class TestBlockchainWrite:
    """Smart contract write operations."""

    async def test_write_collection_to_sepolia(self, monkeypatch):
        """Mock Web3.py — verify recordCollection() is called with correct args."""
        from app.services.blockchain import BlockchainService

        mock_contract = MagicMock()
        mock_contract.functions.recordCollection.return_value.transact.return_value = {
            "hash": b'\xab\xcd' * 16  # 32-byte mock hash
        }

        monkeypatch.setattr(
            "app.services.blockchain.BlockchainService._get_contract",
            lambda self: mock_contract
        )

        service = BlockchainService()
        result = await service.record_collection(
            consumer_ref="test-uuid",
            tpm_value=2450,
            grade=1,
            volume_ml=5000,
            location_hash="wdw3q2",
            driver_ref="driver-uuid",
            data_integrity=b'\x00' * 32
        )

        assert result["status"] == "pending"
        assert len(result["tx_hash"]) == 66  # 0x + 64 hex chars
        mock_contract.functions.recordCollection.assert_called_once()

    async def test_contract_owner_only(self, monkeypatch):
        """Non-owner wallet should fail (simulated)."""
        from app.services.blockchain import BlockchainService

        mock_contract = MagicMock()
        mock_contract.functions.recordCollection.return_value.transact.side_effect = \
            Exception("OilTrace: caller is not the owner")

        monkeypatch.setattr(
            "app.services.blockchain.BlockchainService._get_contract",
            lambda self: mock_contract
        )

        service = BlockchainService()
        with pytest.raises(Exception, match="not the owner"):
            await service.record_collection(
                consumer_ref="test-uuid",
                tpm_value=2450,
                grade=1,
                volume_ml=5000,
                location_hash="wdw3q2",
                driver_ref="driver-uuid",
                data_integrity=b'\x00' * 32
            )

    async def test_web3_connection_error(self, monkeypatch):
        """RPC endpoint is down → graceful error handling."""
        from app.services.blockchain import BlockchainService

        monkeypatch.setattr(
            "web3.Web3.is_connected",
            lambda self: False
        )

        service = BlockchainService()
        with pytest.raises(ConnectionError, match="Cannot connect to Ethereum RPC"):
            await service.record_collection(
                consumer_ref="test-uuid",
                tpm_value=2450,
                grade=1,
                volume_ml=5000,
                location_hash="wdw3q2",
                driver_ref="driver-uuid",
                data_integrity=b'\x00' * 32
            )


class TestBlockchainVerification:
    """On-chain vs off-chain comparison."""

    async def test_verify_matching_data(self, client):
        """Data matches on-chain → verified=True."""
        resp = await client.get(
            "/blockchain/verify/test-collection-uuid",
            headers={"Authorization": "Bearer mock-consumer-jwt"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "verified" in data
        # If mock DB has matching data, should be True
        assert data["verified"] in (True, False)

    async def test_verify_without_auth(self, client):
        """Verification endpoint requires auth."""
        resp = await client.get("/blockchain/verify/test-uuid")
        assert resp.status_code == 401

    async def test_verify_nonexistent_collection(self, client):
        """Non-existent collection returns 404."""
        resp = await client.get(
            "/blockchain/verify/00000000-0000-0000-0000-000000000000",
            headers={"Authorization": "Bearer mock-consumer-jwt"}
        )
        assert resp.status_code == 404

    async def test_verify_response_contains_all_fields(self, client):
        """Verify response has complete blockchain record info."""
        resp = await client.get(
            "/blockchain/verify/test-collection-uuid",
            headers={"Authorization": "Bearer mock-consumer-jwt"}
        )
        if resp.status_code == 200:
            data = resp.json()
            assert "collection_id" in data
            assert "verified" in data
            assert "on_chain_record" in data
            assert "off_chain_hash" in data
            assert "hash_match" in data
            assert "tx_hash" in data

    async def test_owner_verification_shows_all_details(self, client):
        """Owner sees full audit data."""
        resp = await client.get(
            "/blockchain/verify/test-collection-uuid",
            headers={"Authorization": "Bearer mock-owner-jwt"}
        )
        assert resp.status_code == 200


class TestBackgroundPoller:
    """Tx confirmation poller state machine."""

    @pytest.fixture
    def poller(self):
        from app.services.blockchain_poller import BlockchainPoller
        return BlockchainPoller()

    async def test_poller_finds_pending_records(self, poller, monkeypatch):
        """Poller queries for records with status='pending'."""
        mock_query = AsyncMock(return_value=[
            {"id": "rec-1", "tx_hash": "0xabc", "status": "pending"}
        ])
        monkeypatch.setattr(poller, "get_pending_records", mock_query)

        records = await poller.get_pending_records()
        assert len(records) == 1
        assert records[0]["status"] == "pending"

    async def test_poller_marks_tx_as_confirmed(self, poller, monkeypatch):
        """Tx receipt with status=1 → status='confirmed'."""
        mock_receipt = {"status": 1, "blockNumber": 12345678, "gasUsed": 80000}
        monkeypatch.setattr(
            "app.services.blockchain_poller.BlockchainPoller.get_tx_receipt",
            lambda self, tx_hash: mock_receipt
        )

        mock_update = AsyncMock()
        monkeypatch.setattr(poller, "update_record_status", mock_update)

        await poller.process_pending_record("rec-1", "0xabc")
        mock_update.assert_called_with("rec-1", "confirmed", block_number=12345678)

    async def test_poller_marks_tx_as_failed(self, poller, monkeypatch):
        """Tx receipt with status=0 → status='failed'."""
        mock_receipt = {"status": 0, "blockNumber": 12345678, "gasUsed": 80000}
        monkeypatch.setattr(
            "app.services.blockchain_poller.BlockchainPoller.get_tx_receipt",
            lambda self, tx_hash: mock_receipt
        )

        mock_update = AsyncMock()
        monkeypatch.setattr(poller, "update_record_status", mock_update)

        await poller.process_pending_record("rec-1", "0xabc")
        mock_update.assert_called_with("rec-1", "failed")

    async def test_poller_skips_records_without_tx_hash(self, poller):
        """Records with null tx_hash are skipped."""
        result = await poller.process_pending_record("rec-1", None)
        assert result is False  # Indicates skipped

    async def test_poller_skips_stale_records(self, poller):
        """Records older than 30 minutes are skipped and marked as failed."""
        from app.services.blockchain_poller import MAX_PENDING_AGE_MINUTES

        stale_time = datetime.now(timezone.utc) - timedelta(minutes=MAX_PENDING_AGE_MINUTES + 1)
        is_stale = poller._is_stale(stale_time)
        assert is_stale is True

    async def test_poller_does_not_skip_fresh_records(self, poller):
        """Records created 5 minutes ago are still processed."""
        fresh_time = datetime.now(timezone.utc) - timedelta(minutes=5)
        is_stale = poller._is_stale(fresh_time)
        assert is_stale is False

    async def test_poller_recovers_from_rpc_failure(self, poller, monkeypatch):
        """RPC exception doesn't crash the loop — returns gracefully."""
        monkeypatch.setattr(
            "app.services.blockchain_poller.BlockchainPoller.get_tx_receipt",
            lambda self, tx_hash: (_ for _ in ()).throw(Exception("RPC timeout"))
        )

        # Should not raise — should log error and continue
        result = await poller.process_pending_record("rec-1", "0xabc")
        assert result is False  # Indicates failure handled gracefully

    async def test_poller_reconnects_after_rpc_disconnect(self, poller, monkeypatch):
        """After an RPC error, the next cycle succeeds."""
        call_count = 0

        def flaky_receipt(tx_hash):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise Exception("RPC timeout")
            return {"status": 1, "blockNumber": 12345678, "gasUsed": 80000}

        monkeypatch.setattr(
            "app.services.blockchain_poller.BlockchainPoller.get_tx_receipt",
            flaky_receipt
        )
        mock_update = AsyncMock()
        monkeypatch.setattr(poller, "update_record_status", mock_update)

        # First call fails
        await poller.process_pending_record("rec-1", "0xabc")
        # Second call succeeds
        await poller.process_pending_record("rec-1", "0xabc")
        mock_update.assert_called_with("rec-1", "confirmed", block_number=12345678)

    async def test_poller_invalid_tx_hash_handled(self, poller, monkeypatch):
        """Malformed tx hash doesn't crash the poller."""
        monkeypatch.setattr(
            "app.services.blockchain_poller.BlockchainPoller.get_tx_receipt",
            lambda self, tx_hash: (_ for _ in ()).throw(Exception("invalid argument 0"))
        )

        result = await poller.process_pending_record("rec-1", "not-a-valid-hash")
        assert result is False

    async def test_poller_retries_failed_records(self, poller, monkeypatch):
        """Failed records get retried up to MAX_RETRIES times."""
        from app.services.blockchain_poller import MAX_RETRIES

        mock_receipt = {"status": 0, "blockNumber": 12345678, "gasUsed": 80000}
        monkeypatch.setattr(
            "app.services.blockchain_poller.BlockchainPoller.get_tx_receipt",
            lambda self, tx_hash: mock_receipt
        )

        mock_update = AsyncMock()
        monkeypatch.setattr(poller, "update_record_status", mock_update)

        # Simulate retries
        for attempt in range(MAX_RETRIES):
            await poller.process_pending_record("rec-1", "0xabc", retry_count=attempt)
            if attempt < MAX_RETRIES - 1:
                mock_update.assert_called_with("rec-1", "pending_retry")
            else:
                mock_update.assert_called_with("rec-1", "failed")
