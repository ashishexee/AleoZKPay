# NullPay Contract Split Plan

This plan identifies what should move out of `contracts/zk_pay/src/main.leo` first, based on the current frontend and backend dependencies in this repo.

## Goal

Keep the invoice and settlement surface stable for the existing app while moving feature-specific state into separate Aleo programs so the core contract stays deployable as NullPay grows.

## What Must Stay In `zk_pay_core`

These are the pieces the current frontend, checkout flow, batch flow, backend invoice creation, dashboard, and receipt scanners rely on directly. Moving them first would create the highest break risk.

- `InvoiceData`
- `PayerReceipt`
- `MerchantReceipt`
- `Invoice`
- `invoices`
- `salt_to_invoice`
- `create_invoice`
- `create_invoice_usdcx`
- `create_invoice_usad`
- `create_invoice_any`
- `pay_invoice`
- `pay_invoice_usdcx`
- `pay_invoice_usad`
- `pay_donation`
- `pay_donation_usdcx`
- `pay_donation_usad`
- `settle_invoice`
- `get_invoice_status`

### Why These Stay

They are used across the main product surfaces:

- `frontend/src/shared/hooks/useCreateInvoice.ts`
- `backend/src/utils/provable.js`
- `frontend/src/shared/hooks/Payments/useCreditsPayment.ts`
- `frontend/src/shared/hooks/Payments/useUSDCxPayment.ts`
- `frontend/src/shared/hooks/Payments/useUSADPayment.ts`
- `frontend/src/shared/hooks/Payments/useSharedPayment.ts`
- `frontend/src/shared/pages/Checkout/hooks/useCheckoutPayment.ts`
- `frontend/src/shared/pages/BatchPay/index.tsx`
- `frontend/src/shared/pages/Profile/index.tsx`
- `frontend/src/shared/pages/InvoiceDetails/index.tsx`
- `frontend/src/shared/utils/aleo-utils.ts`

These are the true core of NullPay right now.

## What Should Move Out First

The safest first split is a second program for wallet artifacts and user-owned auxiliary records.

Recommended new program name:

- `zk_pay_wallets.aleo`

Move these definitions and transitions first:

- `BurnerWalletRecord`
- `CardLookupData`
- `CardProfileRecord`
- `GiftCardRecord`
- `backup_password`
- `backup_burner_wallet`
- `create_card_profile`
- `set_card_status`
- `create_gift_card_record`

### Why This Is The Best First Split

These features are valuable, but they do not own the invoice lifecycle.

They are more self-contained:

- burner backup is operational wallet metadata
- card profile is card identity and recovery metadata
- card status is card lifecycle metadata
- gift card record is wallet-artifact metadata

They do not mutate the core invoice mappings:

- `invoices`
- `salt_to_invoice`

That means we can move them without redesigning the payment protocol itself.

## Current Frontend/Backend Dependencies For The First Split

If we move the wallet-artifact surface into a new program, these call sites need only a program-id/function-name update, not a product redesign.

### Burner Backup

Used by:

- `frontend/src/shared/pages/Profile/components/BurnerWallet/useBurnerActions.ts`

Transitions used:

- `backup_password`
- `backup_burner_wallet`

### Card Features

Used by:

- `frontend/src/shared/hooks/CardWalletProvider.tsx`
- `frontend/src/shared/utils/card-chain.ts`
- `backend/src/controllers/users.controller.js`

Transitions used:

- `create_card_profile`
- `set_card_status`

Mappings/records used:

- `card_lookup`
- `CardProfileRecord`

### Gift Cards

Used by:

- `frontend/src/shared/pages/GiftCards/components/CreateGiftCard.tsx`
- `frontend/src/shared/utils/gift-card-chain.ts`

Transition used:

- `create_gift_card_record`

Record used:

- `GiftCardRecord`

## What Should Not Move In Phase 1

Do not move these in the first split:

- `create_invoice*`
- `pay_*`
- `pay_donation_*`
- `settle_invoice`
- `get_invoice_status`
- `PayerReceipt`
- `MerchantReceipt`
- `InvoiceData`
- `Invoice`
- `invoices`
- `salt_to_invoice`

### Why Not

Those transitions and mappings are the backbone of:

- merchant invoice creation
- `/pay`
- `/checkout`
- batch payments
- settlement actions
- merchant dashboard receipt views
- payer dashboard paid-invoice views
- invoice detail pages
- MCP/SDK references

Moving them first would force a protocol-wide migration instead of a safe modular split.

## What To Do With Batch Functions

These should not stay in the core contract if they threaten deploy size.

Recommended handling:

- remove them from the deployable core program for now
- keep burner-based batch execution as the production feature
- if on-chain batch experiments continue later, put them into a separate experimental batch program

Recommended future program:

- `zk_pay_batch.aleo`

But only after the wallet-artifact split is done.

## Proposed Program Layout

### `zk_pay_core.aleo`

Owns:

- invoice creation
- invoice mappings
- settlement
- donation flows
- payer and merchant receipts

### `zk_pay_wallets.aleo`

Owns:

- burner backup records
- card profile record
- card status mapping
- gift card record

### `zk_pay_batch.aleo`

Owns later:

- fixed-size batch settlement experiments
- any future protocol-level batch primitives

This program should stay optional until the batching model is proven deployable and worth the complexity.

## Frontend Safety Strategy

To avoid breaking features, split in this order:

1. Deploy a leaner core contract first.
2. Create `zk_pay_wallets.aleo` with the moved wallet/card/gift-card functions.
3. Update frontend call sites to use the new wallet program id only for:
   - burner backup
   - card create/status
   - gift card record creation
4. Leave all invoice, pay, checkout, and dashboard receipt logic pointing at the core contract.

### Result

This preserves:

- pay route
- checkout route
- batch burner flow
- merchant dashboard
- payer paid invoices
- invoice details page
- backend invoice creation

while still shrinking the core contract materially.

## Recommended First Migration Checklist

### Move To `zk_pay_wallets.aleo`

- `BurnerWalletRecord`
- `CardLookupData`
- `CardProfileRecord`
- `GiftCardRecord`
- `backup_password`
- `backup_burner_wallet`
- `create_card_profile`
- `set_card_status`
- `create_gift_card_record`

### Keep In `zk_pay_core.aleo`

- `InvoiceData`
- `PayerReceipt`
- `MerchantReceipt`
- `Invoice`
- `invoices`
- `salt_to_invoice`
- `create_invoice`
- `create_invoice_usdcx`
- `create_invoice_usad`
- `create_invoice_any`
- `pay_donation`
- `pay_invoice`
- `pay_invoice_usdcx`
- `pay_invoice_usad`
- `pay_donation_usdcx`
- `pay_donation_usad`
- `settle_invoice`
- `get_invoice_status`

### Remove Or Defer

- experimental batch-payment entrypoints

## Final Recommendation

If we want the lowest-risk split that does not break the current frontend product, move the wallet/card/gift-card surface out first and keep invoice/pay/receipt logic in the core program.

That gives NullPay the best tradeoff between:

- deployability
- modularity
- future growth
- frontend stability
