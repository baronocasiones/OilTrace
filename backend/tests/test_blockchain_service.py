import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta, timezone
import json


SAMPLE_ABI = json.dumps({
    "abi": [
        {
            "inputs": [],
            "name": "recordCollection",
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ]
})


class TestBlockchainWrite:
    """Smart contract write operations."""

    def test_record_collection_simulated_mode(self):
        """No PRIVATE_KEY set → returns simulated."""
        import app.services.blockchain as bc
        bc.PRIVATE_KEY = ""
        bc.ACCOUNT_ADDRESS = "0x" + "cd" * 20

        mock_contract = MagicMock()

        with patch("builtins.open", MagicMock()):
            with patch("pathlib.Path.exists", return_value=True):
                with patch("json.load", return_value={"abi": []}):
                    with patch("web3.Web3.is_connected", return_value=True):
                        with patch("web3.eth.Eth.contract", return_value=mock_contract):
                            from app.services.blockchain import BlockchainService
                            service = BlockchainService()
                            service.contract = mock_contract

        result = service.record_collection(
            consumer_ref="test-uuid", tpm_value=2450, grade=1,
            volume_ml=5000, location_hash="wdw3q2",
            driver_ref="driver-uuid", data_integrity=b'\x00' * 32
        )

        assert result["status"] == "simulated"
        assert result["tx_hash"] is None

    def test_record_collection_with_key(self, monkeypatch):
        """With PRIVATE_KEY set, calls build_transaction."""
        import app.services.blockchain as bc
        bc.PRIVATE_KEY = "0x" + "ab" * 32
        bc.ACCOUNT_ADDRESS = "0x" + "cd" * 20

        mock_contract = MagicMock()
        mock_contract.functions.recordCollection.return_value.build_transaction.return_value = {
            "from": "0x" + "cd" * 20, "nonce": 0, "gas": 500000,
        }

        with patch.object(bc.BlockchainService, "_get_contract", return_value=mock_contract):
            with patch("web3.eth.Eth.get_transaction_count", return_value=0):
                with patch("web3.eth.Eth.gas_price", 10000000000):
                    with patch("web3.eth.Eth.account.sign_transaction", return_value=MagicMock(raw_transaction=b'\xab' * 100)):
                        with patch("web3.eth.Eth.send_raw_transaction", return_value=b'\xcd' * 32):
                            from app.services.blockchain import BlockchainService
                            service = BlockchainService()
                            service.contract = mock_contract

                            result = service.record_collection(
                                consumer_ref="test-uuid", tpm_value=2450, grade=1,
                                volume_ml=5000, location_hash="wdw3q2",
                                driver_ref="driver-uuid", data_integrity=b'\x00' * 32
                            )

        assert result["status"] == "pending"
        assert len(result["tx_hash"]) == 64
        mock_contract.functions.recordCollection.assert_called_once()

    def test_connection_check(self):
        """is_connected returns True/False based on RPC."""
        with patch("web3.Web3.is_connected", return_value=False):
            from app.services.blockchain import BlockchainService
            assert BlockchainService().is_connected() is False


class TestBlockchainRead:
    """Smart contract read operations (no gas cost)."""

    def test_get_record_parses_correctly(self):
        """getRecord returns tuple → parsed into dict."""
        mock_record = (
            "consumer-uuid", 2450, 1, 5000,
            1700000000, "wdw3q2", "driver-uuid",
            b'\x00' * 32,
        )
        mock_contract = MagicMock()
        mock_contract.functions.getRecord.return_value.call.return_value = mock_record

        from app.services.blockchain import BlockchainService
        service = BlockchainService()
        service.contract = mock_contract
        service.w3 = MagicMock()

        result = service.get_record(0)
        assert result["consumer_ref"] == "consumer-uuid"
        assert result["tpm_value"] == 2450
        assert result["grade"] == 1
        assert result["data_integrity"].startswith("0x")

    def test_verify_data_matching(self):
        """verifyData returns True when hashes match."""
        mock_contract = MagicMock()
        mock_contract.functions.verifyData.return_value.call.return_value = True

        from app.services.blockchain import BlockchainService
        service = BlockchainService()
        service.contract = mock_contract
        service.w3 = MagicMock()

        assert service.verify_data(0, b'\x00' * 32) is True

    def test_verify_data_mismatch(self):
        """verifyData returns False when hashes differ."""
        mock_contract = MagicMock()
        mock_contract.functions.verifyData.return_value.call.return_value = False

        from app.services.blockchain import BlockchainService
        service = BlockchainService()
        service.contract = mock_contract
        service.w3 = MagicMock()

        assert service.verify_data(0, b'\xff' * 32) is False


class TestBackgroundPoller:
    """Tx confirmation poller state machine."""

    def test_poller_marks_tx_as_confirmed(self):
        """Tx receipt with status=1 → returns confirmed."""
        from app.services.blockchain_poller import BlockchainPoller
        poller = BlockchainPoller()
        poller.w3 = MagicMock()
        poller.w3.eth.get_transaction_receipt.return_value = {
            "status": 1, "blockNumber": 12345678, "gasUsed": 80000
        }

        record = MagicMock(id="rec-1", tx_hash="0xabc", status="pending", retry_count=0)
        result = poller._check_transaction(record)
        assert result["status"] == "confirmed"
        assert result["record_id"] == "rec-1"

    def test_poller_marks_tx_as_failed(self):
        """Tx receipt with status=0 → returns failed."""
        from app.services.blockchain_poller import BlockchainPoller
        poller = BlockchainPoller()
        poller.w3 = MagicMock()
        poller.w3.eth.get_transaction_receipt.return_value = {
            "status": 0, "blockNumber": 12345678, "gasUsed": 80000
        }

        record = MagicMock(id="rec-1", tx_hash="0xabc", status="pending", retry_count=0)
        result = poller._check_transaction(record)
        assert result["status"] == "failed"

    def test_poller_handles_none_receipt(self):
        """Receipt is None → still pending."""
        from app.services.blockchain_poller import BlockchainPoller
        poller = BlockchainPoller()
        poller.w3 = MagicMock()
        poller.w3.eth.get_transaction_receipt.return_value = None

        result = poller._check_transaction(
            MagicMock(id="rec-1", tx_hash="0xabc", status="pending", retry_count=0)
        )
        assert result["status"] == "pending"

    def test_poller_handles_rpc_error(self):
        """RPC error → returns pending gracefully."""
        from app.services.blockchain_poller import BlockchainPoller
        poller = BlockchainPoller()
        poller.w3 = MagicMock()
        poller.w3.eth.get_transaction_receipt.side_effect = Exception("RPC timeout")

        result = poller._check_transaction(
            MagicMock(id="rec-1", tx_hash="0xabc", status="pending", retry_count=0)
        )
        assert result["status"] == "pending"

    def test_poller_constants_exported(self):
        """Module-level constants are accessible."""
        from app.services.blockchain_poller import MAX_PENDING_AGE_MINUTES, MAX_RETRIES, POLL_INTERVAL_SECONDS
        assert MAX_PENDING_AGE_MINUTES == 30
        assert MAX_RETRIES == 3
        assert POLL_INTERVAL_SECONDS == 30
