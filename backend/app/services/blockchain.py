import json
import os
from pathlib import Path
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

ABI_PATH = Path(__file__).parent.parent / "abi" / "OilTrace.json"

RPC_URL = os.environ.get("SEPOLIA_RPC_URL", "https://ethereum-sepolia-rpc.publicnode.com")
CONTRACT_ADDRESS = os.environ.get("CONTRACT_ADDRESS", "0x6D70073a659139A5E8385306e2E3CCe0b1D45CEd")
PRIVATE_KEY = os.environ.get("PRIVATE_KEY", "")
ACCOUNT_ADDRESS = os.environ.get("ACCOUNT_ADDRESS", "0x339e1d4887A5841543E57746D7e549e50D32730C")


class BlockchainService:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(RPC_URL))
        self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

        with open(ABI_PATH) as f:
            abi_data = json.load(f)
            abi = abi_data["abi"] if "abi" in abi_data else abi_data

        self.contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(CONTRACT_ADDRESS),
            abi=abi
        )

    def _get_contract(self):
        return self.contract

    def record_collection(
        self,
        consumer_ref: str,
        tpm_value: int,
        grade: int,
        volume_ml: int,
        location_hash: str,
        driver_ref: str,
        data_integrity: bytes
    ) -> dict:
        if not PRIVATE_KEY:
            return {"status": "simulated", "tx_hash": None}

        nonce = self.w3.eth.get_transaction_count(ACCOUNT_ADDRESS)

        tx = self.contract.functions.recordCollection(
            consumer_ref, tpm_value, grade, volume_ml,
            location_hash, driver_ref, data_integrity
        ).build_transaction({
            "from": ACCOUNT_ADDRESS,
            "nonce": nonce,
            "gas": 500000,
            "gasPrice": self.w3.eth.gas_price,
        })

        signed = self.w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)

        return {
            "status": "pending",
            "tx_hash": tx_hash.hex(),
        }

    def get_record(self, record_id: int) -> dict:
        record = self.contract.functions.getRecord(record_id).call()
        return {
            "consumer_ref": record[0],
            "tpm_value": record[1],
            "grade": record[2],
            "volume_ml": record[3],
            "timestamp": record[4],
            "location_hash": record[5],
            "driver_ref": record[6],
            "data_integrity": "0x" + record[7].hex(),
        }

    def verify_data(self, record_id: int, data_hash: bytes) -> bool:
        return self.contract.functions.verifyData(record_id, data_hash).call()

    def is_connected(self) -> bool:
        return self.w3.is_connected()
