# Payment Architecture

## Correct Core Model

For a normal USDT payment gateway, the customer does not interact with a custom smart contract created by the payment system.

The common production flow is:

1. System creates an invoice.
2. System assigns a deposit address to that invoice.
3. Customer sends USDT directly to that deposit address.
4. Watcher listens for token transfers into known addresses.
5. Backend verifies:
   - network
   - token contract
   - receiver address
   - amount
   - confirmations
   - duplicate tx hash
   - invoice expiration
6. Invoice status is updated.
7. Funds may later be swept into a treasury or hot wallet.

## Sweep Flow

For token networks like ERC20, a deposit address may hold USDT but still need native gas to move funds out.

Practical sweep flow:

1. User sends USDT into a deposit address.
2. Watcher detects the incoming transaction.
3. Backend waits for enough confirmations.
4. Backend credits the merchant's internal balance.
5. Backend checks whether the deposit address has enough native gas.
6. If not, a gas wallet tops up the deposit address.
7. Deposit address sends USDT to the hot wallet.
8. Backend stores both the gas top-up tx hash and the sweep tx hash.

Simple shape:

```txt
HD Wallet / Master Wallet
        ↓
Generate many deposit addresses
        ↓
Customer pays a deposit address
        ↓
Watcher confirms payment
        ↓
Internal balance is credited
        ↓
Gas wallet tops up native gas if needed
        ↓
Deposit address sweeps USDT to hot wallet
```

## Address Strategy

What you said is the right direction:

- Many addresses can belong to one wallet system.
- In practice this is often done using an HD wallet or a managed custody/key service.
- Each invoice can receive a unique address.
- That unique address makes reconciliation much easier than trying to infer everything from amount only.

## Important Nuance

Even though the product does not need its own payment smart contract, USDT itself is still a token contract on-chain.

That means the watcher usually listens to:

- `Transfer` events of the USDT token contract on EVM-like chains

So the real distinction is:

- `No custom payment contract needed`
- `Yes, still need to monitor the token contract activity`

## Why This Is Better For MVP

- Closer to real crypto payment gateways
- Simpler customer UX
- Easier invoice reconciliation
- Easier to expand to multiple networks
- Avoids unnecessary on-chain product logic for a checkout MVP
