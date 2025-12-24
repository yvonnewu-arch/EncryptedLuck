# EncryptedLuck

EncryptedLuck is a two-ball lottery on FHEVM where ticket picks, draw results, and points remain encrypted on-chain.
Players pay 0.001 ETH to submit two encrypted numbers, trigger an encrypted draw, and decrypt their points only when
ready.

## Project Goals

- Prove that a simple on-chain game can be fully privacy-preserving using homomorphic encryption.
- Keep user picks, draw outcomes, and score totals hidden from everyone except the player.
- Provide a clean, auditable flow that works end-to-end on Sepolia with no mock data.

## Problems Solved

- **Pick privacy**: Numbers are encrypted before they reach the contract, blocking observers and front-running based on
  picks.
- **Result privacy**: Draw results remain encrypted, so only the player can reveal them.
- **Score privacy**: Points are stored as encrypted integers, avoiding public leaderboard leakage.
- **On-chain verifiability**: All logic is on-chain and deterministic, with encrypted comparisons executed by FHEVM.

## Key Features

- Two-ball lottery with picks constrained to numbers 1-9.
- Encrypted ticket submission using the Zama relayer API.
- Encrypted draw using FHEVM random generation.
- Points awarded on encrypted matches (1 match = 1 point, 2 matches = 10 points).
- Player-controlled decryption of points via EIP-712 signatures.
- Frontend that reads state with viem and writes transactions with ethers.
- Sepolia-only frontend configuration (no localhost network).
- No persistent client storage; wallet state is kept in memory.

## Advantages

- **Privacy by default**: Nothing about picks or scores is readable in plaintext on-chain.
- **Trust minimization**: Players do not depend on an off-chain server to compute outcomes.
- **Simple mental model**: Encrypted data in, encrypted data out, decrypt only at the edge.
- **Composability**: The contract exposes clean view functions for external integrations.

## How It Works

1. **Buy a ticket**
   - The frontend creates an encrypted input payload with two numbers.
   - The contract normalizes both values to the 1-9 range.
   - The encrypted values are stored as the active ticket.

2. **Draw**
   - The contract generates two encrypted random numbers using FHEVM.
   - Encrypted comparisons determine matches without revealing values.
   - Points are updated as encrypted euint32 and stored per player.

3. **Decrypt points**
   - The frontend requests a user-decrypt operation from the relayer.
   - The user signs an EIP-712 message with their wallet.
   - The clear points value is returned to the client UI only.

## Tech Stack

- **Smart contracts**: Solidity 0.8.x + Zama FHEVM libraries
- **Framework**: Hardhat + hardhat-deploy
- **Tasks**: Hardhat custom tasks for local interaction and decryption
- **Frontend**: React + Vite
- **Wallets**: RainbowKit + wagmi
- **Reads**: viem
- **Writes**: ethers v6

## Repository Layout

- `contracts/` Smart contracts
- `deploy/` Deployment scripts
- `tasks/` Hardhat tasks for CLI interaction
- `test/` Unit and integration tests
- `frontend/` React application
- `docs/` Zama reference material

## Setup and Usage

### Requirements

- Node.js 20+
- npm

### Install dependencies

```bash
npm install
```

```bash
cd frontend
npm install
```

### Compile and test

```bash
npm run compile
npm run test
```

### Local node and local deploy

```bash
npx hardhat node
```

In a new terminal:

```bash
npx hardhat deploy --network localhost
```

### Local interaction (tasks)

```bash
npx hardhat --network localhost task:buy-ticket --first 3 --second 7
npx hardhat --network localhost task:draw
npx hardhat --network localhost task:decrypt-points
```

### Sepolia deployment

Create a `.env` file at the repository root with:

- `INFURA_API_KEY`
- `PRIVATE_KEY`

Then deploy:

```bash
npx hardhat deploy --network sepolia
```

Optional Sepolia test run:

```bash
npx hardhat test --network sepolia
```

### Frontend setup

1. Copy the deployed ABI from `deployments/sepolia/EncryptedLuck.json` into
   `frontend/src/config/contracts.ts`.
2. Replace `CONTRACT_ADDRESS` in `frontend/src/config/contracts.ts` with the deployed Sepolia address.
3. Start the app:

```bash
cd frontend
npm run dev
```

## Configuration Notes

- The frontend does not use environment variables; contract details live in
  `frontend/src/config/contracts.ts`.
- Wallet state is held in memory only; no local storage is used.
- The frontend is configured for Sepolia and is not intended for localhost.
- Contract view methods take an explicit `player` address; they do not rely on `msg.sender`.

## Security and Privacy Considerations

- Keep `PRIVATE_KEY` secure and never commit it to source control.
- Encrypted outputs are meaningful only to the holder of the decrypt key and signature.
- On-chain randomness comes from FHEVM primitives; treat it as testnet randomness.

## Future Roadmap

- Multiple concurrent tickets per player with clear lifecycle tracking.
- Encrypted leaderboards with selective disclosure.
- Dynamic pricing and jackpot pools with encrypted accounting.
- Expanded randomness sources and verifiable draw schedules.
- Accessibility improvements and richer mobile UX.
- Production readiness checklist and external security review.

## License

BSD-3-Clause-Clear. See `LICENSE`.
