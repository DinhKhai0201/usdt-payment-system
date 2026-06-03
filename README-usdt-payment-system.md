# USDT Payment System Roadmap

A practical project guide for building a USDT payment system with **Next.js** and **NestJS**.

This repository is designed as a portfolio project for developers who want to understand crypto payments, backend payment architecture, security, transaction verification, and production-ready engineering decisions.

> This project is for learning, portfolio, and interview preparation. If you build a real payment product, you must check legal, tax, AML, KYC, accounting, and compliance requirements in your country.

> **Current Implementation State:** This repository has been fully upgraded to a **Real EVM Flow**. It runs a local blockchain (`anvil`), securely generates HD wallets for deposit addresses using `ethers.js`, accepts real MetaMask transactions, and watches the blockchain for `Transfer` events to automatically settle invoices.

---

## 1. Project Goal

Build a payment system that allows users or customers to pay invoices using USDT.

The system should support:

- Creating payment invoices
- Showing a payment QR code
- Accepting USDT payments
- Watching blockchain transactions
- Verifying payment status
- Updating invoice status automatically
- Showing transaction history
- Admin monitoring
- Basic security and risk controls

The goal is not only to “receive USDT”. The goal is to design a system that looks like a real payment product.

Important architecture note:

- In a normal USDT payment system, the customer does not pay through a custom smart contract created by your product
- The customer sends USDT directly to a deposit address controlled by the system
- The backend watcher monitors incoming token transfers and matches them to invoices
- Usually, each invoice or order should have its own deposit address for easier reconciliation

---

## 1.1 How Orders Map to Wallet Addresses

This is one of the most important parts of the system design.

If you use one shared wallet address for every customer and every order, reconciliation becomes hard:

- multiple users may send the same amount
- users may send at nearly the same time
- users may send partial amounts
- users may send extra amounts
- exchange withdrawals may arrive late

Because of that, a practical payment gateway usually does this:

```txt
1. Merchant creates order or invoice in the Web2 system
2. Backend creates payment_intent
3. Backend assigns a unique deposit address for that order
4. Customer sends USDT to that address
5. Watcher sees money arrive at that address
6. System maps that address back to the exact order
```

So the receiving wallet for each order is:

```txt
not one shared public address for everything
but one deposit address assigned to that invoice or order
```

Those addresses are usually generated from:

```txt
- an HD wallet
- a custody system
- an internal address pool
```

You can think of it like this:

```txt
One wallet system
        ↓
Many child deposit addresses
        ↓
Each address linked to one invoice
```

Later, the operator can sweep funds from deposit addresses into a hot wallet or treasury wallet.

---

## 2. Recommended Tech Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui or Radix UI
- React Query / TanStack Query
- Zustand or Redux Toolkit
- QR code generator
- Wallet connection later if needed

### Backend

- NestJS
- TypeScript
- PostgreSQL or MongoDB
- Prisma or TypeORM
- Redis for queue and caching
- BullMQ for background jobs
- WebSocket or polling workers for blockchain monitoring
- JWT authentication
- Role-based access control

### Blockchain

Start with one network first.

Recommended MVP network:

```txt
USDT ERC20 on Ethereum (or local EVM)
```

Why ERC20 first?

- Extremely common and widely supported
- Easy to develop and test locally using EVM tools like Foundry/Anvil
- Easy to simulate with local wallets for demo purposes
- Standard for most DeFi and institutional volume

Later, add:

```txt
USDT TRC20 on Tron
USDT BEP20 on BNB Chain
USDT on Polygon
USDT on Arbitrum
USDT on Solana
```

---

## 3. Product Concept

### Product Name Ideas

```txt
StablePay
USDTPayKit
CryptoPayFlow
TokenCheckout
StableCheckout
ChainInvoice
PayWithUSDT
OpenStablePay
```

### Suggested Repo Name

```txt
usdt-payment-system
```

### Suggested GitHub About

```txt
A practical USDT payment system built with Next.js and NestJS, including invoice flow, QR payments, blockchain verification, admin dashboard, and security notes.
```

### Suggested GitHub Topics

```txt
usdt
crypto-payment
blockchain
nextjs
nestjs
typescript
payment-gateway
stablecoin
web3
tron
ethereum
backend
fintech
portfolio-project
system-design
```

---

## 4. User Roles

### Customer

The person who pays an invoice.

Customer can:

- View invoice
- See amount and network
- Scan QR code
- Copy wallet address
- Copy amount
- View payment status

### Merchant / User

The person or business that creates invoices.

Merchant can:

- Create invoice
- View invoice list
- View payment status
- See transaction history
- Request withdrawal later

### Admin

The system operator.

Admin can:

- View all payments
- Review failed payments
- Check suspicious activity
- Manage supported networks
- Manage hot wallet addresses
- Export reports

---

## 5. Core Payment Flow

### Simple Flow

```txt
1. Merchant creates invoice
2. System assigns a unique deposit address and amount
3. Customer scans QR code
4. Customer sends USDT
5. Backend watches blockchain
6. Backend verifies transaction
7. Invoice becomes PAID
8. Merchant sees payment success
```

### Detailed Flow

```txt
Merchant creates invoice
        ↓
Backend creates payment_intent
        ↓
Backend assigns deposit address
        ↓
Frontend shows invoice page + QR code
        ↓
Customer sends USDT
        ↓
Blockchain transaction appears
        ↓
Watcher service detects transaction
        ↓
Backend validates:
  - correct network
  - correct token contract
  - correct receiver address
  - correct amount
  - enough confirmations
  - not already processed
        ↓
Backend updates invoice status
        ↓
Frontend shows payment success
        ↓
Merchant balance is updated
```

### Important Clarification

The payment flow usually does not require your project to deploy a custom payment smart contract.

Instead:

```txt
- USDT already exists as a token contract on the network
- customer transfers USDT directly to a deposit address
- watcher monitors token transfers to known addresses
- backend matches the deposit address to the invoice
```

---

## 6. Invoice Status Design

Use clear invoice statuses.

```txt
DRAFT
PENDING
WAITING_PAYMENT
PARTIALLY_PAID
PAID
OVERPAID
EXPIRED
FAILED
CANCELLED
REFUNDED
```

### Status Meaning

| Status | Meaning |
|---|---|
| DRAFT | Invoice is created but not active |
| PENDING | Invoice is active but payment is not detected |
| WAITING_PAYMENT | Customer opened the invoice page |
| PARTIALLY_PAID | Customer sent less than required amount |
| PAID | Payment is confirmed and valid |
| OVERPAID | Customer sent more than required amount |
| EXPIRED | Invoice expired before full payment |
| FAILED | Payment failed or invalid |
| CANCELLED | Merchant cancelled the invoice |
| REFUNDED | Payment was returned manually |

---

## 7. UI / UX Screens

### 1. Landing Page

Purpose: explain the product.

Sections:

- Hero section
- How it works
- Supported networks
- Security highlights
- Dashboard preview
- Developer-friendly architecture
- Call to action

Hero copy example:

```txt
Accept USDT payments with a clean checkout flow.
Built with Next.js, NestJS, and real blockchain verification.
```

---

### 2. Merchant Dashboard

Purpose: show merchant overview.

Cards:

- Total received
- Pending invoices
- Paid invoices
- Failed payments
- Available balance
- Network health

Main table:

- Invoice ID
- Customer email
- Amount
- Network
- Status
- Created at
- Paid at
- Action

---

### 3. Create Invoice Page

Fields:

```txt
Customer email
Amount in USD
Accepted asset: USDT
Network: ERC20 / TRC20 / BEP20
Description
Expiration time
```

Actions:

```txt
Create invoice
Save draft
Cancel
```

---

### 4. Invoice Payment Page

This is the most important user screen.

Must include:

- Amount to pay
- Network name
- Token name
- QR code
- Wallet address
- Copy address button
- Copy amount button
- Expiration countdown
- Payment status
- Warning about correct network

Important warning text:

```txt
Only send USDT on the selected network. Sending another token or using another network may result in lost funds.
```

---

### 5. Payment Success Page

Show:

- Payment success message
- Transaction hash
- Network
- Paid amount
- Invoice ID
- Link to explorer

---

### 6. Transaction Detail Page

Show:

- Transaction hash
- From address
- To address
- Amount
- Network
- Token contract
- Confirmations
- Status
- Detected at
- Confirmed at
- Related invoice

---

### 7. Admin Dashboard

Show:

- All invoices
- All deposits
- Failed transaction queue
- Suspicious payments
- Hot wallet balance
- System health
- Blockchain watcher status
- Manual review tools

---

## 8. Design System

### Design Direction

Use a clean fintech style.

Keywords:

```txt
clean
secure
modern
trustworthy
minimal
professional
fast
stable
```

### Color Tokens

```txt
--background: #0B0F17
--surface: #111827
--surface-soft: #1F2937
--primary: #22C55E
--primary-hover: #16A34A
--accent: #38BDF8
--warning: #F59E0B
--danger: #EF4444
--success: #22C55E
--text-primary: #F9FAFB
--text-secondary: #9CA3AF
--border: #374151
```

### Typography

```txt
Font: Inter or Geist Sans
Heading weight: 600 / 700
Body weight: 400 / 500
Code font: Geist Mono or JetBrains Mono
```

### Component Style

Use:

- Rounded corners: 12px to 20px
- Soft border
- Dark mode first
- Clear status badges
- Large QR section
- Strong warning messages
- Mobile-first layout

### Status Badge Colors

```txt
PENDING: gray
WAITING_PAYMENT: blue
PAID: green
PARTIALLY_PAID: yellow
OVERPAID: purple
EXPIRED: orange
FAILED: red
REFUNDED: slate
```

---

## 9. Suggested Frontend Structure

```txt
apps/web/
├── app/
│   ├── page.tsx
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── invoices/
│   │       ├── page.tsx
│   │       ├── new/page.tsx
│   │       └── [id]/page.tsx
│   ├── pay/
│   │   └── [invoiceId]/page.tsx
│   └── admin/
│       ├── page.tsx
│       ├── payments/page.tsx
│       └── transactions/page.tsx
├── components/
│   ├── ui/
│   ├── invoice/
│   ├── payment/
│   └── dashboard/
├── lib/
│   ├── api.ts
│   ├── format.ts
│   └── constants.ts
├── hooks/
│   ├── useInvoice.ts
│   └── usePaymentStatus.ts
└── styles/
    └── globals.css
```

---

## 10. Suggested Backend Structure

```txt
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/
│   ├── auth/
│   ├── users/
│   ├── merchants/
│   ├── invoices/
│   ├── payments/
│   ├── blockchain/
│   │   ├── tron/
│   │   ├── ethereum/
│   │   └── workers/
│   ├── wallets/
│   ├── ledger/
│   ├── admin/
│   ├── webhooks/
│   ├── notifications/
│   └── common/
└── prisma/
    └── schema.prisma
```

---

## 11. Database Design

### User

```txt
id
email
password_hash
role
created_at
updated_at
```

### Merchant

```txt
id
user_id
business_name
status
created_at
updated_at
```

### Invoice

```txt
id
merchant_id
customer_email
amount_usd
amount_token
asset
network
payment_address
status
description
expires_at
paid_at
created_at
updated_at
```

### DepositTransaction

```txt
id
invoice_id
network
tx_hash
from_address
to_address
token_contract
amount
confirmations
status
detected_at
confirmed_at
raw_payload
created_at
updated_at
```

### WalletAddress

```txt
id
merchant_id
invoice_id
network
address
address_type
status
derivation_path
assigned_at
last_seen_at
created_at
updated_at
```

Suggested meaning:

```txt
address_type = DEPOSIT / HOT / TREASURY
```

For the invoice flow, the most important one is:

```txt
DEPOSIT address
```

This lets the system know:

- which address was shown to the customer
- which invoice owns that address
- which transfer should update which order

### LedgerEntry

```txt
id
merchant_id
invoice_id
entry_type
amount
asset
network
direction
status
created_at
```

### WebhookEvent

```txt
id
event_type
payload
status
retry_count
created_at
processed_at
```

### AuditLog

```txt
id
actor_id
action
resource_type
resource_id
metadata
created_at
```

---

## 12. API Design

### Auth

```txt
POST /auth/register
POST /auth/login
GET  /auth/me
```

### Invoices

```txt
POST /invoices
GET  /invoices
GET  /invoices/:id
PATCH /invoices/:id/cancel
GET  /invoices/:id/status
```

### Public Payment

```txt
GET /public/invoices/:id
GET /public/invoices/:id/status
```

### Payments

```txt
GET /payments
GET /payments/:id
POST /payments/:id/manual-review
```

### Admin

```txt
GET /admin/overview
GET /admin/invoices
GET /admin/transactions
GET /admin/wallets
GET /admin/system-health
```

---

## 13. Blockchain Watcher Design

The watcher is responsible for detecting incoming USDT payments.

### Responsibilities

```txt
- Connect to blockchain node or provider API
- Scan new blocks
- Detect USDT Transfer events
- Match receiver address with assigned deposit address
- Match amount with invoice amount
- Wait for required confirmations
- Prevent duplicate processing
- Update invoice status
- Create ledger entry
```

### Simple Worker Flow

```txt
Every few seconds:
  1. Get latest block number
  2. Scan new blocks
  3. Find USDT Transfer events
  4. Check if to_address belongs to system
  5. Find which invoice owns that deposit address
  6. Validate amount
  7. Save transaction
  8. Update invoice status
```

### Why Unique Deposit Addresses Matter

If many invoices share one address, the system may not know which order was paid.

Unique deposit addresses make it easier to handle:

- same amount paid by different users
- multiple payments at the same minute
- partial payment
- overpayment
- delayed transfers from exchanges
- cleaner reconciliation and audit trails

### Required Confirmations

For a portfolio project:

```txt
TRC20: 12 confirmations
ERC20: 12 confirmations
BEP20: 15 confirmations
Polygon: 100 confirmations
```

These values can be configured and adjusted later.

---

## 14. Payment Matching Rules

A payment is valid when:

```txt
network is correct
token contract is correct
receiver address is correct
amount is equal or greater than required amount
transaction is confirmed
transaction hash is not processed before
invoice is not expired
invoice is not already paid
```

### Partial Payment

If user sends less than required amount:

```txt
invoice status = PARTIALLY_PAID
```

### Overpayment

If user sends more than required amount:

```txt
invoice status = OVERPAID or PAID_WITH_OVERPAYMENT
```

### Late Payment

If payment arrives after expiration:

```txt
invoice status = EXPIRED_WITH_PAYMENT
manual review required
```

---

## 15. Security Checklist

### Private Key Security

For MVP, avoid automatic withdrawals.

Do not store private keys in plain text.

If you must manage keys:

```txt
- Encrypt private keys
- Use environment secrets
- Use cloud KMS in production
- Separate hot wallet and cold wallet
- Limit hot wallet balance
- Add withdrawal approval
```

For portfolio, you can design the architecture without holding real funds.

---

### API Security

```txt
- JWT authentication
- Refresh token rotation
- Role-based access control
- Rate limiting
- Input validation with DTOs
- Request body size limit
- CORS configuration
- Helmet security headers
- Audit logs for admin actions
```

---

### Payment Security

```txt
- Never trust frontend payment status
- Always verify transaction on backend
- Check token contract address
- Check network
- Check amount
- Check confirmations
- Check duplicate tx hash
- Check invoice expiration
- Check address ownership
- Do not rely only on amount matching when one shared address is used
```

---

### Database Security

```txt
- Use unique constraint for tx_hash + network
- Use transactions for balance updates
- Use decimal type for money values
- Never use floating point for token amounts
- Keep raw blockchain payload for debugging
- Add audit logs for manual changes
```

---

### Frontend Security

```txt
- Do not expose admin API keys
- Do not expose private keys
- Sanitize user input
- Avoid storing sensitive data in localStorage
- Show clear network warnings
- Use HTTPS only
```

---

## 16. Common User Mistakes

Your UI should protect users from these mistakes:

```txt
- Sending USDT on the wrong network
- Sending wrong token
- Sending less than required amount
- Sending after invoice expiration
- Sending to old invoice address
- Sending multiple times
- Sending from exchange with delayed withdrawal
```

UX should always show:

```txt
network name
token name
exact amount
wallet address
expiration time
warning message
```

---

## 17. Internal Ledger Design

Do not only update merchant balance directly.

Bad design:

```txt
merchant.balance = merchant.balance + amount
```

Better design:

```txt
Create ledger entry:
  merchant_id
  type = DEPOSIT
  amount = 100
  asset = USDT
  direction = CREDIT
```

Merchant balance should be calculated from ledger entries or updated inside a database transaction.

This helps with:

- Auditing
- Debugging
- Refunds
- Reconciliation
- Dispute handling
- Interview discussion

---

## 18. System Architecture

```txt
Next.js Frontend
        ↓
NestJS API
        ↓
PostgreSQL / MongoDB
        ↓
Redis Queue
        ↓
Blockchain Watcher Worker
        ↓
Tron / Ethereum / BNB Chain Node or Provider
```

### Components

```txt
Frontend App
Merchant Dashboard
Public Payment Page
Admin Dashboard
API Gateway
Invoice Service
Payment Service
Blockchain Watcher
Ledger Service
Notification Service
Audit Service
```

---

## 19. MVP Scope

### Phase 1: Basic Invoice Payment

```txt
- Merchant login
- Create invoice
- Public invoice page
- Show QR code
- Manual payment check button
- Basic status update
```

### Phase 2: Blockchain Watcher

```txt
- Auto scan transactions
- Match payments to invoices
- Confirm payment
- Save transaction history
```

### Phase 3: Dashboard

```txt
- Merchant overview
- Invoice table
- Transaction detail
- Export CSV
```

### Phase 4: Admin and Security

```txt
- Admin dashboard
- Failed payment queue
- Manual review
- Audit logs
- Rate limit
- RBAC
```

### Phase 5: Multi-Network Support

```txt
- Add ERC20
- Add BEP20
- Add Polygon
- Add network selector
- Add different confirmation rules
```

---

## 20. Interview Talking Points

Use this project to explain senior-level thinking.

### System Design

```txt
I separated invoice creation from blockchain verification.
The frontend never decides payment status.
The backend verifies every transaction using network, token contract, amount, receiver address, and confirmations.
```

### Security

```txt
I do not store private keys in the frontend.
I use unique constraints to prevent duplicate transaction processing.
I use an internal ledger instead of directly mutating balances.
```

### Reliability

```txt
The blockchain watcher is a background worker.
If it fails, it can resume from the last scanned block.
Transactions are idempotent.
```

### Product Thinking

```txt
The payment page clearly warns users about network mismatch because crypto payment mistakes are common and often irreversible.
```

### Scaling

```txt
The system can support multiple networks by using a network adapter pattern.
Each network has its own scanner, confirmation rule, and token contract configuration.
Each network can also have its own address derivation and deposit wallet strategy.
```

---

## 21. Network Adapter Pattern

Create a shared interface:

```ts
interface BlockchainAdapter {
  getLatestBlock(): Promise<number>
  scanTransfers(fromBlock: number, toBlock: number): Promise<TokenTransfer[]>
  getTransaction(txHash: string): Promise<BlockchainTransaction>
  getConfirmations(txHash: string): Promise<number>
}
```

Then implement:

```txt
TronAdapter
EthereumAdapter
BnbChainAdapter
PolygonAdapter
```

This makes your code easier to extend.

---

## 22. Environment Variables

```txt
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
TRON_RPC_URL=
ETHEREUM_RPC_URL=
BNB_RPC_URL=
USDT_TRC20_CONTRACT=
USDT_ERC20_CONTRACT=
USDT_BEP20_CONTRACT=
MIN_CONFIRMATIONS_TRC20=12
MIN_CONFIRMATIONS_ERC20=12
ADMIN_EMAIL=
```

Never commit real secrets.

---

## 23. Testing Plan

### Backend Tests

```txt
Invoice creation
Invoice expiration
Payment matching
Partial payment
Overpayment
Duplicate tx hash
Wrong network
Wrong token contract
Wrong receiver address
Ledger entry creation
```

### Frontend Tests

```txt
Invoice page renders correctly
QR code renders correctly
Copy address works
Payment status refresh works
Warning messages are visible
```

### Integration Tests

```txt
Create invoice
Mock blockchain transfer
Watcher detects transfer
Invoice becomes paid
Ledger entry is created
```

---

## 24. Mockup Ideas

### Payment Page Layout

```txt
 -------------------------------------------------
| Pay Invoice                                     |
| Invoice #INV-1024                               |
|-------------------------------------------------|
| Amount: 100 USDT                                |
| Network: Ethereum ERC20                         |
| Status: Waiting for payment                     |
|                                                 |
|                  [ QR CODE ]                    |
|                                                 |
| Address: Txxxxxxxxxxxxxxxxxxxxxxxxxxxx          |
| [Copy address] [Copy amount]                    |
|                                                 |
| Expires in: 14:32                               |
|                                                 |
| Warning: Only send USDT on Ethereum ERC20.      |
 -------------------------------------------------
```

### Dashboard Layout

```txt
 -------------------------------------------------
| Dashboard                                       |
|-------------------------------------------------|
| Total Received | Pending | Paid | Failed        |
|-------------------------------------------------|
| Recent Invoices                                 |
| INV-001 | 100 USDT | PAID     | View           |
| INV-002 | 50 USDT  | PENDING  | View           |
| INV-003 | 20 USDT  | EXPIRED  | View           |
 -------------------------------------------------
```

---

## 25. What Not To Do

```txt
- Do not mark invoice as paid from frontend only
- Do not accept any token with the same symbol
- Do not ignore network mismatch
- Do not assume one shared address is enough for all orders
- Do not use JavaScript floating point for money
- Do not store private keys in localStorage
- Do not process the same tx hash twice
- Do not skip audit logs for manual admin actions
- Do not promise users that wrong-network transfers can always be recovered
```

---

## 26. Future Improvements

```txt
- Merchant API keys
- Webhooks for merchants
- Hosted checkout page
- Multi-network support
- HD wallet derivation service
- Address pool manager
- Auto sweep from deposit addresses to treasury
- Auto refund flow
- Withdrawal system
- KYC/KYB module
- Risk scoring
- Wallet screening integration
- Accounting export
- Stablecoin swap/off-ramp integration
- Mobile app
```

---

## 27. Final Portfolio Goal

At the end, your repo should show that you understand:

```txt
- Payment flow
- Blockchain transaction verification
- Backend architecture
- Frontend UX
- Security risks
- Database design
- Background workers
- System design
- Real-world fintech concerns
```

This is much stronger than a simple “send token” demo.
