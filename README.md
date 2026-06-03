# PayFlow USDT Local Demo

Local-first learning project for a USDT payment system, based on the roadmap in [README-usdt-payment-system.md](./README-usdt-payment-system.md).

## Stack

- `apps/web`: Next.js 15 frontend for dashboard, invoices and checkout
- `apps/api`: NestJS API with a local file-backed database and payment watcher loop
- `packages/shared`: shared types between frontend and backend
- `contracts`: Foundry setup for a local mock USDT token only

## Core Demo Flow

1. Select a pre-funded **Demo Wallet** (Customer or System Admin) from the home page.
2. The Customer creates an order on the merchant storefront.
3. The backend assigns a unique deposit address for that invoice (derived via HD Wallet).
4. Open the checkout page and click `Pay as Customer`.
5. The frontend reads the selected wallet's private key and sends a real `transfer` transaction to the `MockUSDT` smart contract on the local Anvil network using `ethers.js`.
6. A backend `BlockchainWatcherService` listens for the `Transfer` event on-chain, increments confirmations, and marks the invoice as `PAID`, `PARTIALLY_PAID`, or `OVERPAID`.

## Payment Architecture

This project now follows the practical gateway model used by most crypto payment systems:

1. The platform controls a wallet system, usually HD-wallet based.
2. Each invoice gets a unique deposit address derived from that wallet system.
3. The customer sends USDT directly to that address.
4. The backend watcher listens for token transfers to known deposit addresses.
5. The system matches `to_address + network + token contract + amount + confirmations` to the invoice.
6. Later, funds can be swept from deposit addresses to an operator hot wallet.

Important clarification:

- The customer still transfers USDT through the USDT token contract on-chain.
- But the payment product does not need to deploy its own custom smart contract for the normal invoice flow.
- The unique deposit address is what helps identify which invoice was paid.

## 1. Local Run

1. Copy `.env.example` to `.env`.
2. Install dependencies:

```bash
npm install
```

3. Generate Prisma client and start the apps:

```bash
npm run dev
```

4. Open:

- Web: [http://localhost:3000](http://localhost:3000)
- API health: [http://localhost:4000/health](http://localhost:4000/health)

## 2. Blockchain Setup & Mock USDT Seeding

To make the demo work with real EVM transactions without requiring you to use real money or testnets, we run a local blockchain using Foundry (`anvil`).

1. **Start the local blockchain** (leave this running):
```bash
anvil --accounts 20
```

2. **Deploy the Mock USDT contract** (in a new terminal):
```bash
cd lib
forge script script/DeployLocal.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```
*This compiles the Solidity contract and deploys it to your Anvil node.*

3. **Distribute (Seed) Mock USDT to test accounts**:
```bash
npm run seed:anvil
```
*This script mints 100,000 USDT to Anvil Accounts 1-10. These accounts map exactly to the Customer and Admin wallets you can select in the frontend, ensuring they have balance to pay invoices.*

## Notes

- Database is fully local (SQLite/JSON) for easy demo setup.
- The watcher uses `ethers.js` to listen for on-chain events on Anvil.
- The active demo uses `ERC20` on a local EVM network with a real Mock USDT contract and actual MetaMask transactions.
- Deposit addresses are securely derived using `ethers.HDNodeWallet`.
