# NullPay SDK Architecture: The Relayer Approach

*This document serves as the master blueprint for the NullPay SDK architecture, specifically designed to solve the Aleo SDK BHP256 hashing discrepancies while securely abstracting private key management away from merchants.*

---

## 1. The Core Problem We Are Solving

Building a "Stripe-like" developer experience on a Zero-Knowledge blockchain (Aleo) presents two massive friction points:
1. **The Private Key Problem:** Merchants refuse to store their Aleo private keys on their web servers to sign `create_invoice` transactions due to extreme security risks.
2. **The Hashing Discrepancy Problem:** The `@aleohq/sdk` implementation of `BHP256` hashing in JavaScript does not perfectly match the native Leo `BHP256::hash_to_field` implementation. We cannot reliably generate the `invoice_hash` locally off-chain to pass it later.

## 2. The Solution: The NullPay Relayer Architecture

To solve this, NullPay will act as a **Relayer** (a Meta-Transaction Executor). 
The NullPay API Server will execute the `create_invoice` transaction on the Aleo network *on behalf* of the merchant, paying the gas fee and using the NullPay Master Wallet to sign the transaction. 

Crucially, **we do not require any changes to the existing `main.leo` smart contract** for this to work natively and securely.

---

## 3. End-to-End Architectural Flow

### Step 1: Merchant Requests an Invoice (Off-Chain API)
The merchant's backend server wants to charge a user $50 USDCx. They make a standard Web2 REST API call to NullPay using their Secret API Key (e.g., `sk_live_123`).

```javascript
// POST https://api.nullpay.xyz/v1/payment_intents
{
  "merchant_address": "aleo1merchantxyz987...",
  "amount": 50000000, // $50.00
  "currency": "USDCx", // Maps to invoice_type 1u8
  "metadata": { "order_id": "cart_999" }
}
```

### Step 2: NullPay API Server Acts as Relayer (On-Chain Execution)
NullPay's backend receives the request. It holds the private key to the **NullPay Master Relayer Wallet** (which is kept heavily funded with Aleo Credits for gas).

The server generates a secure, random `salt` (a field element).
The server then programmatically executes the `create_invoice` transition on the Aleo network:

```bash
# Executed by NullPay's Server backend automatically
leo run create_invoice_usdcx \
  aleo1merchantxyz987... \  # Merchant Address (private)
  50000000u128 \            # Amount (private)
  <generated_salt> \        # Salt (private)
  0field \                  # Memo (private)
  24u32 \                   # Expiry Hours (public)
  0u8 \                     # Invoice Type (public)
  0u8                       # Wallet Type (public)
```
*Because this is executed directly on an Aleo node, the native Leo `BHP256` hashing is guaranteed to be 100% accurate.*

### Step 3: Smart Contract Enforces Merchant Ownership
This is the most critical security feature of the architecture. Even though **NullPay** signed and paid for the transaction, the `main.leo` contract assigns the resulting `Invoice` record strictly to the merchant:

```leo
// Inside main.leo -> create_invoice_usdcx
let invoice_record: Invoice = Invoice {
    owner: merchant, // <--- Assigned directly to aleo1merchantxyz987...
    invoice_hash: invoice_hash,
    amount: amount_u64,
    // ...
};
```
Because `owner: merchant` is explicitly set, Aleo's privacy model dictates that **only the Merchant's Aleo Private Key** can decrypt, view, or use this generated `Invoice` record. The NullPay Master Wallet (the caller) has zero ability to access the funds or the record post-creation.

### Step 4: NullPay Returns the Client Secret
Once the Relayer transaction is confirmed on-chain, our API responds to the merchant's backend:

```json
// Response from POST /payment_intents
{
  "client_secret": "pi_123_secret_456_salt_789",
  "invoice_hash": "654321...field",
  "salt": "789...field",
  "status": "requires_payment"
}
```

### Step 5: The User Pays (Frontend SDK)
The merchant passes the `client_secret` to their frontend React application. The NullPay SDK (`@nullpay/react`) mounts the payment button.

When the customer clicks "Pay", the customer's wallet connects (Leo/Puzzle). Our SDK constructs the `pay_invoice_usdcx` transaction using the data from the `client_secret`. 

```leo
// Executed by the CUSTOMER's wallet on the frontend
leo run pay_invoice_usdcx \
  <customer_usdcx_record> \
  aleo1merchantxyz987... \
  50000000u128 \
  <salt_from_client_secret> \ // 100% guaranteed to match the hash NullPay created
  ...
```

### Step 6: Webhook Fulfillment
NullPay's Indexer monitors the Aleo blockchain. It sees the `pay_invoice_usdcx` transaction successfully confirm. 
It matches the `invoice_hash` to the pending $50 order in our PostgreSQL/Supabase database.
NullPay fires a webhook (`payment_intent.succeeded`) to the merchant's server.
The merchant ships the product.

---

## 4. Why This Architecture is Bulletproof for SDKs

1. **Flawless Cryptography:** We completely bypass the Aleo JavaScript SDK's hashing bugs by forcing the native Aleo node to do the `BHP256` hashing via the Relayer.
2. **"Stripe-Level" Developer Experience:** A merchant can integrate NullPay in 10 lines of code without ever needing to understand Zero-Knowledge proofs or manage a crypto wallet private key on their server.
3. **Zero Smart Contract Audits Needed:** This flow uses the exact `main.leo` code as it is written today. The only thing that changes is *who* executes the first transaction (The Master Wallet instead of the Merchant Wallet).
4. **Gas Subsidization as a Premium Feature:** NullPay covers the tiny Aleo gas fee for creating the invoice. This is standard industry practice for "Gasless Meta-Transactions" (e.g., Biconomy) and is easily recouped by the 1-2% platform fee NullPay takes on the final `pay_invoice` settlement.
