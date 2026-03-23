# NullPay MCP Server Plan

This design adds a dedicated MCP server for conversational NullPay flows without leaking wallet private keys back into the model response path.

## Goals

- Expose four tools:
  - `login`
  - `create_invoice`
  - `pay_invoice`
  - `get_transaction_info`
- Reuse the existing NullPay backend, invoices table, user profile table, and relayer/DPS infrastructure.
- Keep decrypted private keys inside the MCP server only.
- Allow wallet preference switching between `main` and `burner` without adding a fifth tool.
- Support env-provided main-wallet credentials so the MCP server can fetch record-backed invoice amounts and automate main-wallet payments without exposing the key to the model.

## Current Wallet Model

Automated invoice payment requires a locally available private key to build the Aleo execution authorization.

- `create_invoice` can be relayed for either `main` or `burner` address because invoice creation does not spend user funds.
- `pay_invoice` can be automated for any wallet whose private key is available inside the MCP server.
- Burner wallet automation works from the encrypted burner private key stored in the profile.
- Main-wallet automation works when the MCP server is started with:
  - `NULLPAY_MAIN_ADDRESS`
  - `NULLPAY_MAIN_PASSWORD`
  - `NULLPAY_MAIN_PRIVATE_KEY`
- If the main private key is not available, the server should still allow login and invoice creation, but it should prompt the user to add the env var when they need record-backed amount lookup or main-wallet payment automation.

## User Flow

1. User says they want to use NullPay.
2. LLM calls `login`.
3. MCP server resolves the main wallet credentials from:
   - tool input, or
   - `NULLPAY_MAIN_ADDRESS` and `NULLPAY_MAIN_PASSWORD` in env
4. MCP server:
   - hashes the main address
   - loads the user profile from the backend
   - validates password by decrypting the stored main address when a profile already exists
   - creates a fresh profile when no profile exists
   - stores session state in MCP server memory
   - keeps any resolved main private key only in memory
5. If no burner wallet exists, `login` recommends creating one.
6. User asks to create burner wallet.
7. LLM calls `login` again with `create_burner_wallet: true`.
8. MCP server:
   - generates Aleo burner keypair
   - encrypts burner address and private key using the user password
   - stores encrypted values in the existing `users` table
   - can switch active wallet to `burner`
9. User asks to create or pay invoices.
10. LLM chooses the right tool and optionally the wallet.
11. User can switch wallets by calling `login` again with `wallet_preference`.

## Tool Design

### `login`

Purpose:

- create or resume a NullPay MCP session
- validate password
- create burner wallet
- switch active wallet
- resolve main-wallet credentials from env without exposing them to the model

Inputs:

- `address?`
- `password?`
- `main_private_key?`
- `create_burner_wallet?`
- `wallet_preference?` = `main | burner`

Behavior:

- if `address` or `password` are omitted, the MCP server falls back to env values
- if the main private key is available, the response confirms that record-backed amount lookup and main-wallet payments are enabled
- if the main private key is missing, the response tells the user to add `NULLPAY_MAIN_PRIVATE_KEY` in env for payments and accurate record-backed amount lookup

### `create_invoice`

Purpose:

- create a standard, multipay, or donation invoice using the active wallet address

Behavior:

- resolves current wallet choice from tool input or active session
- uses backend relayer for invoice creation
- polls Aleo mapping to resolve the invoice hash
- persists the invoice row in the existing `invoices` table
- returns invoice hash, tx id, merchant address, and pay link

### `pay_invoice`

Purpose:

- pay an invoice from a private wallet record

Behavior:

- resolves the wallet private key from session state
- fetches the invoice from the backend
- enriches the invoice amount from the wallet's private records when the private key is available
- scans spendable private records
- builds Aleo execution authorization locally
- asks backend DPS sponsor endpoint to attach relayer fee authorization
- updates invoice settlement state in backend

### `get_transaction_info`

Purpose:

- inspect one invoice by hash
- or list recent invoices for the active wallet

Behavior:

- fetches rows from backend
- when the wallet private key is available, enriches invoice amounts from owned private records
- otherwise returns DB-visible amounts and clearly tells the user to add `NULLPAY_MAIN_PRIVATE_KEY` for record-backed amounts on the main wallet

## Codebase Changes

### New package

- `packages/nullpay-mcp`

Responsibilities:

- MCP stdio protocol handling
- session state
- password-based encryption helpers for Node
- Aleo scanner/payment helpers
- backend API client
- tool orchestration

### Backend changes

Add one new internal route:

- `POST /api/mcp/relay/create-invoice`

Why:

- existing relayer endpoint requires merchant API key
- MCP user flow starts from wallet address + password, not developer secret key
- invoice creation for MCP needs address-based relayer support

Auth model:

- shared secret header from MCP server to backend
- env: `NULLPAY_MCP_SHARED_SECRET`

### Existing tables reused

- `users`
  - `address_hash`
  - `main_address`
  - `burner_address`
  - `encrypted_burner_key`
- `invoices`
  - `invoice_hash`
  - `merchant_address`
  - `designated_address`
  - `merchant_address_hash`
  - `invoice_transaction_id`
  - `payment_tx_ids`
  - `status`
  - `salt`
  - `invoice_type`
  - `token_type`

No schema migration is strictly required for the first version.

## Session Model

The MCP server keeps a per-process in-memory session containing:

- logged-in main address
- current wallet preference
- password in memory only
- burner availability metadata
- optional main private key in memory only

The password is not written back to the database in plaintext.

The decrypted burner private key is never returned in tool output.

The main private key is never returned in tool output and should preferably be supplied through env.

## Security Notes

- Private keys remain encrypted at rest in Supabase when stored in the profile.
- Main-wallet private keys supplied through env remain outside tool output and model-visible responses.
- Private keys are decrypted or loaded only inside the MCP server during record lookup and payment execution.
- Tool responses never include decrypted private keys.
- If an MCP host supports secure secret prompts, the password input should be upgraded to that path later.

## Current Practical UX

- Main wallet with env private key:
  - login without sharing secrets in chat
  - create invoice via relayer
  - read record-backed transaction amounts
  - pay invoice automatically
- Main wallet without private key:
  - login
  - create invoice via relayer
  - read DB-level transaction info
  - receive a prompt to add `NULLPAY_MAIN_PRIVATE_KEY` when record-backed amount lookup or payment automation is needed
- Burner wallet:
  - login
  - create invoice via relayer
  - pay invoice automatically
  - read transaction info
