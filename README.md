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
## Payment Architecture & Wallet Roles

To keep customer funds secure and manage transaction fees efficiently, the system uses a standard cryptocurrency exchange sweeping architecture. Below is the list of wallet roles in the order of their involvement in the flow, mapped directly to the local `anvil` test accounts (which use the standard `m/44'/60'/0'/0/i` derivation path):

1. **Customer Wallets (Anvil Accounts 1 - 5)**
   - **Role:** The buyers' personal wallets.
   - **Usage:** Pre-funded with MockUSDT and ETH. Used to browse the storefront and pay invoices.

2. **System Admin / Merchant Wallet (Anvil Account 6)**
   - **Role:** The store owner's wallet.
   - **Usage:** Used to log into the Merchant Portal to view revenue and track sweeping status.

3. **Master Wallet (`MASTER`)**
   - **Role:** The root HD wallet inside the backend.
   - **Usage:** Its derivation path (`m/44'/60'/0'/0`) is used to mathematically generate an infinite number of unique child addresses without interacting with the blockchain.

4. **Deposit Address (Anvil Accounts 20+)**
   - **Role:** A unique, disposable address generated for a single invoice.
   - **Usage:** The customer sends their USDT to this address. This allows the backend to precisely identify which invoice was paid. However, this address starts with 0 ETH, meaning it cannot pay the network fee (Gas) required to move the USDT out.

5. **Hot Wallet (`HOT` - Anvil Account 7)**
   - **Role:** The company's central revenue vault.
   - **Usage:** Safely stores all the incoming swept USDT revenue from all customers.

6. **Gas Wallet (`GAS` - Anvil Account 8)**
   - **Role:** The company's centralized "fuel" wallet, pre-funded natively by Anvil with 10,000 ETH.
   - **Usage:** Once a Deposit Address receives USDT, the Gas Wallet automatically sends a tiny fraction of ETH (Gas Top-up) to that Deposit Address. The Deposit Address then instantly executes an ERC20 `transfer` (Sweeping) to send the entire USDT balance to the Hot Wallet.

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
