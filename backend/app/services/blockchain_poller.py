import os
from datetime import datetime, timedelta, timezone
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

RPC_URL = os.environ.get("SEPOLIA_RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com")
MAX_PENDING_AGE_MINUTES = int(os.environ.get("POLLER_MAX_AGE", "30"))
MAX_RETRIES = int(os.environ.get("POLLER_MAX_RETRIES", "3"))
POLL_INTERVAL_SECONDS = int(os.environ.get("POLLER_INTERVAL", "30"))


class BlockchainPoller:
    def __init__(self, db_session=None):
        self.w3 = Web3(Web3.HTTPProvider(RPC_URL))
        self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        self.db = db_session

    def poll_pending(self) -> list[dict]:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=MAX_PENDING_AGE_MINUTES)
        results = []

        if self.db is not None:
            pending = self.db.query(...).filter(...).all()
        else:
            pending = []

        for record in pending:
            result = self._check_transaction(record)
            results.append(result)

        return results

    def _check_transaction(self, record) -> dict:
        try:
            receipt = self.w3.eth.get_transaction_receipt(record.tx_hash)

            if receipt is None:
                return {"status": "pending", "record_id": record.id}

            if receipt["status"] == 1:
                record.status = "confirmed"
                record.block_number = receipt["blockNumber"]
                record.gas_used = receipt["gasUsed"]
                record.confirmed_at = datetime.now(timezone.utc)
                return {"status": "confirmed", "record_id": record.id}
            else:
                record.retry_count += 1
                if record.retry_count >= MAX_RETRIES:
                    record.status = "failed"
                return {"status": "failed", "record_id": record.id}

        except Exception:
            return {"status": "pending", "record_id": record.id}
