# OilTrace

Used cooking oil collection for Philippine karinderyas. IoT sensor measures oil quality, grades it for SAF/biofuel, records everything on Ethereum, and rewards consumers with redeemable points at partner stores.

---

## Team

| Role | Stack |
|------|-------|
| Backend | FastAPI (Python) + Supabase PostgreSQL + Web3.py |
| Mobile (Consumer) | React Native + Expo |
| Mobile (Driver) | React Native + Expo |
| IoT | ESP32 + SIM800L + TPM sensor |
| Blockchain | Solidity + Hardhat (Sepolia testnet) |

---

## Repo Structure

```
oil-trace/
├── backend/           # FastAPI app + tests
│   ├── app/           # (to be built)
│   └── tests/         # pytest test suite (~112 tests)
├── contract/          # Solidity smart contract + Hardhat
│   ├── contracts/     # (to be built)
│   └── test/          # Hardhat test suite (20+ tests)
├── mobile/            # React Native + Expo app
├── hardware/           # ESP32 firmware (PlatformIO)
├── docs/              # Full system documentation
│   ├── plan/          # 14 architecture & design docs
│   ├── test.md        # Test suite reference
│   └── README.md      # Docs index
└── .github/workflows/ # CI per stack
```

---

## Getting Started Per Stack

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
# Tests:
pytest tests/ -v
```

### Smart Contract

```bash
cd contract
npm install
npx hardhat test              # Run tests
npx hardhat compile           # Compile
npx hardhat run scripts/deploy.ts --network sepolia
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```

### IoT (ESP32)

Open `hardware/` in PlatformIO (VS Code extension). Build and upload to ESP32 via USB.

---

## How CI Works

Two completely separate workflows that only fire when their files change:

| Workflow | Trigger | What it runs |
|----------|---------|-------------|
| `contract.yml` | Any commit touching `contract/` | `npx hardhat test` |
| `backend.yml` | Any commit touching `backend/` | `pytest tests/ -v` |

Changes to `docs/`, `mobile/`, `hardware/` — **no CI runs**. No false reds for unrelated work.

---

## Branch Strategy

1. Create a branch per task from `main`
2. Develop and commit on your branch
3. Open a PR to `main`
4. CI runs automatically on your PR (for your stack)
5. Merge when CI is green

```
main ──┬── backend/collection-api   ← PR
       ├── mobile/consumer-screens  ← PR
       ├── contract/grade-function  ← PR
       └── iot/tpm-reader           ← PR
```

---

## Commit Convention

```
<stack>: <short description>

Examples:
  backend: add collection API endpoints
  contract: implement recordCollection function
  mobile: add login screen
  iot: implement TPM sensor read loop
  docs: update deployment guide
```

---

## Full Docs

See [docs/README.md](docs/README.md) for the complete system plan: architecture, database schema, mobile screens, hardware wiring, grading logic, points economics, cost breakdown, and implementation roadmap.
