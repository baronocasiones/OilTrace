# OilTrace

Used cooking oil collection for Philippine karinderyas. IoT sensor measures oil quality, grades it for SAF/biofuel, records everything on Ethereum, and rewards consumers with redeemable points at partner stores.

## Table of Contents

- [Repo Structure](#repo-structure)
- [Getting Started](#getting-started)
  - [Backend](#backend)
  - [Smart Contract](#smart-contract)
  - [Mobile](#mobile)
  - [IoT](#iot)
- [Testing](#testing)
- [CI / CD](#ci--cd)
- [Workflow](#workflow)
- [Documentation](#documentation)

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
├── hardware/          # ESP32 firmware (PlatformIO)
├── docs/              # System documentation
│   ├── plan/          # 14 architecture & design docs
│   ├── test.md        # Test suite reference
│   └── README.md      # Docs index
└── .github/workflows/ # CI per stack
```

## Getting Started

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Smart Contract

```bash
cd contract
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network sepolia
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```

### IoT

Open `hardware/` in PlatformIO (VS Code extension). Build and upload to ESP32 via USB.

## Testing

```bash
# Backend
cd backend && pytest tests/ -v

# Contract
cd contract && npx hardhat test
```

See [docs/test.md](docs/test.md) for detailed test documentation including fixture architecture, environment variables, and coverage.

## CI / CD

Two separate workflows that only trigger when their stack changes:

| Workflow | Trigger | Runs |
|----------|---------|------|
| `contract.yml` | `contract/**` | `npx hardhat test` |
| `backend.yml` | `backend/**` | `pytest tests/ -v` |

Changes to `docs/`, `mobile/`, `hardware/` do not trigger CI.

## Workflow

1. Create a branch per task from `main`
2. Develop and commit on your branch
3. Open a pull request to `main`
4. CI runs automatically on your PR
5. Merge when CI is green

Use commit prefixes: `backend:`, `contract:`, `mobile:`, `iot:`, `docs:`

## Documentation

Full system plan is in [docs/](docs/README.md) — architecture, database schema, API endpoints, security, mobile screens, hardware wiring, grading logic, points economics, government compliance, cost breakdown, and implementation roadmap.
