# NullPay SDK Reference

This document consolidates everything developers need to integrate the NullPay SDK: the `nullpay.json` configuration, the developer CLI (`@nullpay/cli`), and the Node SDK (`@nullpay/node`). It pulls examples and behavior directly from the repository implementation.

Files referenced in this guide:
- `testing-website/backend/nullpay.json` — sample generated file with example invoices. See [testing-website/backend/nullpay.json](testing-website/backend/nullpay.json).
- CLI onboard implementation: [packages/nullpay-cli/src/commands/onboard.ts](packages/nullpay-cli/src/commands/onboard.ts).
- Node SDK implementation: [packages/nullpay-node/src/index.ts](packages/nullpay-node/src/index.ts).

## Overview

NullPay provides:
- A developer CLI (`@nullpay/cli`) to interactively create invoices and produce a local `nullpay.json` for your project.
- A lightweight Node SDK (`@nullpay/node`) to read `nullpay.json`, create checkout sessions, retrieve sessions, and verify webhook events.
- A runtime relayer/backend that maps Aleo salts to invoice hashes and powers checkout flows.
- A relayer-sponsored setup path so invoice creation can be submitted by NullPay on the merchant's behalf.

Use-case summary:
- Run `nullpay sdk onboard` (CLI) while authenticated with your NullPay secret key to create invoices on Aleo and produce `nullpay.json`.
- Commit `nullpay.json` to your project or keep it local based on how you want to manage your backend configuration.
- In your app, use `@nullpay/node` to load `nullpay.json` and create checkout sessions or call the remote API directly.
- `nullpay.json` is optional; use it for named pre-generated invoices, or skip it and create sessions directly with `amount`, `currency`, and `type`.

---

## `nullpay.json` (schema and guidance)

Purpose: a developer-supplied JSON manifest that lists merchant address and pre-generated invoices (names, salts, hashes). The file is used as a local convenience for creating checkout sessions by name.

`nullpay.json` is optional; use it for named pre-generated invoices, or skip it and create sessions directly with `amount`, `currency`, and `type`.

Schema (TypeScript interface excerpt from the SDK):

- `merchant: string` — Aleo merchant address (string).
- `generated_at: string` — ISO timestamp when file generated.
- `invoices: Array<Invoice>` where each invoice is:
  - `name: string` — developer-chosen identifier (e.g., "basic-usdcx").
  - `type: 'multipay' | 'donation'` — invoice kind.
  - `amount: number | null` — fixed amount (major units) for multipay, `null` for open donation invoices.
  - `currency: string` — token label (e.g., `CREDITS`, `USDCX`, `USAD`, `ANY`).
  - `label?: string` — optional memo.
  - `hash: string` — Aleo invoice hash (string, often ending in "field").
  - `salt: string` — pre-generated salt used on-chain.

Example (from `testing-website/backend/nullpay.json`):

```json
{
  "merchant": "aleo1yu926k0j...",
  "generated_at": "2026-03-21T09:10:24.522Z",
  "invoices": [
    { "name": "basic-credits", "type": "multipay", "amount": 1, "currency": "CREDITS", "label": "", "hash": "7664...62field", "salt": "5261...436field" },
    { "name": "support-any", "type": "donation", "amount": null, "currency": "ANY", "label": "dsfbh", "hash": "3890...623field", "salt": "6496...428field" }
  ]
}
```

## `@nullpay/cli` — Onboard Wizard

Command: `nullpay sdk onboard`

Location: implementation in [packages/nullpay-cli/src/commands/onboard.ts](packages/nullpay-cli/src/commands/onboard.ts).

What it does (high level):
- Authenticates via a NullPay secret key (`sk_test_...` or `sk_live_...`).
- Validates the provided Aleo merchant address against the NullPay backend (`/sdk/onboard/validate`).
- Lets you create two categories of invoices:
  - Multi-pay (fixed amount) invoices — the CLI prompts `name`, `amount`, and `currency`.
  - Donation (open-amount) invoices — prompts `name` and optional `memo` per token template.
- For each invoice the CLI:
  - Generates a random salt (16 bytes converted to big integer, appended with `field`).
  - Submits a request to the backend relayer (`/dps/relayer/create-invoice`) to pre-generate the on-chain mapping.
  - Polls the Aleo mapping endpoint (Provable mapping API) to resolve the resulting invoice hash for the salt.
- Writes a `nullpay.json` file containing merchant, generated_at, and the generated invoice objects (including salts and hashes).

Relayer highlight:
- The invoice-creation step is relayed by NullPay.
- NullPay's relayer wallet submits the on-chain invoice-creation transaction on behalf of the merchant.
- The network fee for that setup step is covered by the relayer wallet instead of the merchant manually broadcasting it.

Implementation notes & helpful functions:
- `generateSalt()` — uses `crypto.randomBytes(16)` and converts to a bigint string plus `field` suffix.
- `validateMerchant(secretKey, merchantAddress)` — POST to `${BACKEND_URL}/sdk/onboard/validate` with `Authorization: Bearer ${secretKey}`.
- `submitToRelayer(secretKey, invoice, salt)` — POST to `${BACKEND_URL}/dps/relayer/create-invoice` with invoice fields.
- `pollForHash(salt)` — polls `https://api.provable.com/v2/testnet/program/zk_pay_proofs_privacy_v27.aleo/mapping/salt_to_invoice/${salt}` for a mapping value.

Developer tips:
- The CLI prints a summary card showing `hash` and `salt` (hash truncated) for verification.
- If mapping resolution times out, the invoice may have been submitted; you can re-run or query the mapping endpoint manually.

---

## `@nullpay/node` — Node SDK Reference

Implemented at [packages/nullpay-node/src/index.ts](packages/nullpay-node/src/index.ts).

`nullpay.json` is optional; use it for named pre-generated invoices, or skip it and create sessions directly with `amount`, `currency`, and `type`.

Exports & basic usage:

```ts
import { NullPay } from '@nullpay/node';

const client = new NullPay({ secretKey: 'sk_test_...', baseURL?: 'https://nullpay-backend-ib5q4.ondigitalocean.app/api' });
```

Constructor:
- `secretKey` (required) — your NullPay API key (used for Authorization and HMAC verification).
- `baseURL` (optional) — base URL of NullPay API; defaults to `https://nullpay-backend-ib5q4.ondigitalocean.app/api` in the implementation.
- `projectRoot` (optional) — tells the SDK which folder should be treated as the root when resolving `nullpay.json`.
- `configPath` (optional) — lets you pass the exact file path to `nullpay.json` if you do not want the SDK to guess.

nullpay.json helpers
- `loadNullPayConfig(projectRoot?, configPath?)` — loads and parses `nullpay.json` from the project root or from an explicit file path.

Invoice helper methods (client-side convenience):
- `invoices.getAll()` — returns all invoices from `nullpay.json` or throws if missing.
- `invoices.getByIndex(i)` — get invoice by array index.
- `invoices.getByName(name)` — get invoice by developer-defined name. Throws if not found.
- `invoices.getByType(type)` — filter by `'multipay' | 'donation'`.

Checkout sessions (remote API integration):

- `checkout.sessions.create(params)` — creates a hosted checkout session and returns `{ id, checkout_url, status, invoice_hash, salt }`.
  - Params (partial):
    - `amount?` (number)
    - `currency?` (`'CREDITS'|'USDCX'|'USAD'|'ANY'`)
    - `type?` (`'standard'|'donation'|'multipay'`)
    - `success_url?`, `cancel_url?`
    - `invoice_hash?`, `salt?`
    - `nullpay_invoice_name?` (shorthand — looks up invoice by name in `nullpay.json`)
    - `nullpay_invoice_index?` (shorthand)

  - Behavior notes (important):
    - If `nullpay_invoice_name` or `nullpay_invoice_index` is provided, the SDK will resolve the invoice from the local `nullpay.json` and merge its `hash`, `salt`, `amount`, and `currency` into the request unless overridden explicitly.
    - If `invoice_hash` or `salt` are missing, the SDK will pre-generate a `salt`, call the relayer endpoint (`/dps/relayer/create-invoice`) on the configured `baseURL` using your `secretKey`, then poll the Provable mapping endpoint to resolve the invoice hash. This enables serverless usage where invoices can be pre-generated via the relayer automatically.
    - In that fallback flow, the invoice-creation transaction is submitted by NullPay's relayer wallet on behalf of the merchant, and the relayer covers the associated network fee for that setup action.
    - The method validates non-donation invoices require an `amount > 0`.
    - Errors from the API or relayer are thrown with informative messages (`NullPay Relayer Pre-gen Error`, `NullPay API Error`, or timeouts for mapping resolution).

- `checkout.sessions.retrieve(sessionId)` — fetches an existing session by id (GET to `${baseURL}/checkout/sessions/${sessionId}`).

Webhooks
- `webhooks.verifySignature(payload, signature)` — verifies HMAC-SHA256 signature using your `secretKey`. Returns `boolean`.
- `webhooks.constructEvent(payload, signature)` — verifies signature and parses payload into `WebhookEvent`. Throws if signature invalid.

Types
- `CreateCheckoutSessionParams`, `CheckoutSession`, `WebhookEvent` and `NullPayJson` are exported by the SDK for type-safe usage. See [packages/nullpay-node/src/index.ts](packages/nullpay-node/src/index.ts).

Example: create a session by invoice name using local `nullpay.json` shorthand

```ts
const client = new NullPay({ secretKey: process.env.NULLPAY_SK });
const session = await client.checkout.sessions.create({
  nullpay_invoice_name: 'basic-usdcx',
  success_url: 'https://example.com/success',
  cancel_url: 'https://example.com/cancel'
});
console.log('Open the checkout URL:', session.checkout_url);
```

Example: serverless-safe `nullpay.json` loading

```ts
import path from 'path';
import { NullPay } from '@nullpay/node';

const client = new NullPay({
  secretKey: process.env.NULLPAY_SK!,
  baseURL: 'https://nullpay-backend-ib5q4.ondigitalocean.app/api',
  projectRoot: __dirname,
  configPath: path.join(__dirname, 'nullpay.json'),
});
```

Why this matters:
- In local development, `process.cwd()` often already points at your backend folder, so automatic `nullpay.json` discovery works.
- In serverless environments such as Vercel, the runtime working directory may not match your backend folder.
- Passing `projectRoot` or `configPath` makes `nullpay.json` lookup deterministic and avoids runtime errors like `nullpay.json not found`.

Example: verify an incoming webhook (Express)

```ts
app.post('/webhook/nullpay', express.text({ type: '*/*' }), (req, res) => {
  const sig = req.header('x-nullpay-signature') || '';
  try {
    const event = client.webhooks.constructEvent(req.body, sig);
    // handle event (WebhookEvent type)
    res.status(200).send({ ok: true });
  } catch (err) {
    res.status(400).send({ error: 'Invalid signature' });
  }
});
```

---

## Testing Website — `testing-website/backend/nullpay.json`

Location: [testing-website/backend/nullpay.json](testing-website/backend/nullpay.json).

- This file is an example `nullpay.json` used by the SDK testing site. It demonstrates multiple invoice types (multipay and donation) across tokens and shows the expected `hash` and `salt` fields.

If you run the CLI locally in the testing site, the generated `nullpay.json` will follow the same structure.

## Sponsored Flows Worth Highlighting

- CLI onboarding uses the relayer-backed invoice-creation endpoint, so NullPay can submit that setup transaction on behalf of the merchant.
- The Node SDK fallback path uses the same relayer flow when `invoice_hash` or `salt` is not supplied.
- Burner-wallet sweeps, gift-card redeems, and direct gift-card payment flows use the backend-sponsored execution endpoint (`/dps/sponsor-sweep`) so NullPay can cover the execution fee for those supported actions.

---

## Implementation & Troubleshooting Notes (from code)

- The onboarding CLI polls the Aleo mapping endpoint for up to ~2 minutes per invoice (`pollForHash` retries) — network delays can cause timeouts.
- The SDK will attempt to pre-generate invoices by calling the remote relayer; if you host your own backend, ensure it exposes `/dps/relayer/create-invoice` with the expected contract.
- If your backend runs on Vercel or another serverless platform and uses `nullpay.json`, prefer passing `projectRoot` and `configPath` into `new NullPay(...)` so the SDK does not rely on `process.cwd()`.

---

## Suggested docs improvements & future additions
- Add MD examples showing exact request/response shapes for `/checkout/sessions` on the backend.
- Provide a small example repo demonstrating `nullpay.json`-driven checkout flows including frontend + server webhook handling.

---

If you'd like, I can:
- generate a long-form README for `packages/nullpay-node` with code samples and publish-ready markdown, or
- update the developer route pages in the frontend to include an SDK reference panel that displays `nullpay.json` examples and quickstart code snippets.

Tell me which of the two you want next and I'll implement it.
