# Multi-Token Oracle Architecture

The NullPay Oracle system enables "Pay with Any Token" functionality, allowing payers to settle invoices using their preferred token (Credits, USDCx, or USAD) regardless of the merchant's base currency.

## 🏗️ Architecture Overview

The system relies on three pillars to ensure price integrity without sacrificing privacy:

1.  **Live Price Feed**: CREDITS price is fetched live from the **Provable API** with 60-second caching. Stablecoins (USDCx, USAD) are pegged to $1.00.
2.  **Signed Quotes**: The backend Oracle signs every conversion quote using its private key and ZK-optimized `BHP256` hashing. 
3.  **On-Chain Verification**: The smart contract independently reconstructs and verifies the signature in the finalizer. If the rate or amount has been tampered with, the transaction reverts.
4.  **Block-Height Expiry**: Every quote is valid for only ~30 blocks (~5 minutes) to prevent price-lag exploitation.

---

## 🔄 End-to-End Workflow

1.  **Detection**: The payment frontend detects if the payer's selected token differs from the invoice's base currency.
2.  **Quote Fetch**: Frontend calls `/api/oracle/quote` passing `from_token`, `to_token`, and the `amount`.
3.  **Backend Signing**: 
    - Fetches live USD rates.
    - Computes conversion.
    - Constructs `OracleQuote` struct.
    - Hashes the struct and signs it with the `ORACLE_PRIVATE_KEY`.
4.  **Transaction Routing**: The transaction is routed to the `zk_pay_wallet` contract using a specific conversion function (e.g., `pay_invoice_credits_via_usdcx`).
5.  **Smart Contract Assertions**: 
    - Reconstructs the `OracleQuote`.
    - Hashes it using `BHP256`.
    - Verifies the signature against the trusted `oracle_address`.
    - Asserts `block.height <= expires_at`.

---

## 📂 The Oracle Data Structure

Both the backend and the smart contract share the same canonical data structure for hashing:

```leo
struct OracleQuote {
    original_amount_micro: u64,    // Invoice amount (micros)
    converted_amount_micro: u64,   // Payer amount (micros)
    from_token_type: u8,           // Base token (0=Credits, 1=USDCx, 2=USAD)
    to_token_type: u8,             // Payer token
    expires_at: u32                // Block-height deadline
}
```

---

## 🛡️ Security Guarantees

-   **Tamper Proof**: Because the signature is over the entire struct (including amounts and tokens), changing even 1 micro-token or switching a token ID will result in a signature mismatch.
-   **No Replays**: Direction is encoded in the quote hash. A signature for `Credits -> USDCx` cannot be used to pay a `Credits -> USAD` transition.
-   -   **Trust Anchor**: The on-chain protocol only trusts the address stored in the `oracle_address` mapping, which is managed via an admin-only `set_oracle_address` transition.

## 📈 Supported Pairs

The following pairs are natively supported in the `zk_pay_wallet` contract:

| Transition Name | Invoice Base | Payer Uses |
| :--- | :--- | :--- |
| `pay_invoice_credits_via_usdcx` | Credits | USDCx |
| `pay_invoice_credits_via_usad` | Credits | USAD |
| `pay_invoice_usdcx_via_credits` | USDCx | Credits |
| `pay_invoice_usdcx_via_usad` | USDCx | USAD |
| `pay_invoice_usad_via_credits` | USAD | Credits |
| `pay_invoice_usad_via_usdcx` | USAD | USDCx |

---

> [!IMPORTANT]
> **Privacy Note**: While the Oracle knows the amount being converted, the identity of the payer and merchant remains encapsulated within the standard NullPay ZK-proofs. The Oracle only provides the price integrity layer for the swap.
