# NullPay MCP Server Design

This document describes the current NullPay MCP package, how it integrates with Claude, what credentials belong to the user, what stays with NullPay, and which terminal commands are used for install, development, testing, and publish.

## Overview

NullPay MCP is a local stdio MCP server packaged as `@nullpay/mcp`.

It gives Claude four NullPay tools:

- `login`
- `create_invoice`
- `pay_invoice`
- `get_transaction_info`

The package is designed for a lightweight end-user setup:

- user runs one command
- user chooses Claude Code or Claude Desktop
- user enters only wallet credentials
- the package writes the MCP JSON config automatically
- Claude loads the local NullPay MCP server

## Current Design

### User-provided credentials

The user should only provide:

- `NULLPAY_MAIN_ADDRESS`
- `NULLPAY_MAIN_PRIVATE_KEY`
- `NULLPAY_MAIN_PASSWORD`

These are passed to the local MCP server through the Claude MCP config `env` block.

### NullPay-provided configuration

The package itself provides the production service defaults:

- backend API base: `https://nullpay-backend-ib5q4.ondigitalocean.app/api`
- public base URL: `https://nullpay.app`

The user should not be asked to type backend URLs manually.

### Backend-only secrets

These should remain on the backend side, not in user config:

- relayer private key
- backend-only internal secrets

## Claude Integration

The local server is launched through:

```bash
npx -y @nullpay/mcp server
```

The setup wizard is launched through:

```bash
npx -y @nullpay/mcp
```

On Windows, Claude Desktop may use:

```bash
cmd /c npx -y @nullpay/mcp server
```

## Setup Flow

### End-user flow

1. User runs:
   ```bash
   npx -y @nullpay/mcp
   ```
2. NullPay asks where to install:
   - Claude Code
   - Claude Desktop
3. NullPay asks for:
   - main wallet address
   - main wallet private key
   - NullPay password
4. NullPay writes the MCP config file automatically.
5. User restarts Claude.
6. Claude loads the local NullPay MCP server.

### Config file locations

Claude Desktop paths used by the installer:

- Windows packaged app:
  - `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json`
- Windows roaming fallback:
  - `%APPDATA%\Claude\claude_desktop_config.json`
- macOS:
  - `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux:
  - `~/.config/Claude/claude_desktop_config.json`

Claude Code path used by the installer:

- `~/.claude.json`

## Example Generated MCP Config

### Claude Desktop / general example

```json
{
  "mcpServers": {
    "nullpay": {
      "command": "npx",
      "args": ["-y", "@nullpay/mcp", "server"],
      "env": {
        "NULLPAY_MAIN_ADDRESS": "aleo1...",
        "NULLPAY_MAIN_PRIVATE_KEY": "APrivateKey1...",
        "NULLPAY_MAIN_PASSWORD": "your-password"
      }
    }
  }
}
```

### Windows Claude Desktop example

```json
{
  "mcpServers": {
    "nullpay": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@nullpay/mcp", "server"],
      "env": {
        "NULLPAY_MAIN_ADDRESS": "aleo1...",
        "NULLPAY_MAIN_PRIVATE_KEY": "APrivateKey1...",
        "NULLPAY_MAIN_PASSWORD": "your-password"
      }
    }
  }
}
```

## Tool Behavior

### `login`

Purpose:

- create or resume the NullPay MCP session
- validate password against encrypted backend profile data
- create a burner wallet if requested
- switch the active wallet
- recover password and burner backup from on-chain records when possible

Normal login path:

- resolve `address` and `password` from tool input or env
- fetch the user profile by hashed address from the backend
- decrypt stored main wallet address to validate password
- restore burner metadata if present in backend profile
- keep the session in MCP memory

Recovery-aware login path:

- if password is missing but `NULLPAY_MAIN_PRIVATE_KEY` is available
- scan owned backup records from the Aleo program
- recover the password from `password_part`
- if a full burner backup exists, restore the burner address and encrypted burner key too
- write recovered burner metadata back to the backend profile

### `create_invoice`

Purpose:

- create a standard, multipay, or donation invoice from the active wallet address

Flow:

- resolve main or burner wallet address from session
- call backend relay route
- wait for `salt_to_invoice` mapping to resolve the invoice hash
- write invoice row to backend
- return invoice hash, tx id, and payment link

### `pay_invoice`

Purpose:

- pay a NullPay invoice from the selected wallet

Preferred input:

- full payment link

Why the full payment link is preferred:

- includes merchant address
- includes amount
- includes salt
- includes token selection
- may include session id

Flow:

- resolve wallet private key locally
- parse the payment link or fetch invoice by hash
- locate a spendable private record
- build Aleo execution authorization locally
- send authorization to backend sponsor endpoint
- update invoice and checkout session state in backend

### `get_transaction_info`

Purpose:

- fetch one invoice by hash or list recent invoice rows

Flow:

- fetch invoice data from backend
- if a local private key is available, enrich the invoice with record-backed amount and private metadata
- otherwise return database-visible information only

## Session Model

The MCP server keeps a per-process in-memory session containing:

- main address
- hashed main address
- password
- active wallet selection
- encrypted burner address
- encrypted burner private key
- optional main private key

The private key is not returned to Claude in tool output.

## On-Chain Backup Recovery

The package supports password recovery and burner restoration from owned program records.

Supported recovery behavior:

- if password backup record exists, recover the password
- if full burner backup record exists, recover burner address and encrypted burner key
- if both exist, prefer the full burner backup

Practical result:

- a user can omit `NULLPAY_MAIN_PASSWORD` if their backup exists on-chain and the MCP has the main private key locally
- a previously backed-up burner wallet can be restored automatically

## Terminal Commands

### End-user install

```bash
npx -y @nullpay/mcp
```

### End-user direct server mode

```bash
npx -y @nullpay/mcp server
```

### Help

```bash
npx -y @nullpay/mcp --help
```

### Local development

From `packages/nullpay-mcp`:

```bash
npm install
npm run build
node dist/cli.js
```

Run the local server directly:

```bash
node dist/cli.js server
```

Run TypeScript dev server mode:

```bash
npm run dev
```

### Publish

From `packages/nullpay-mcp`:

```bash
npm run build
npm publish --access public
```

If npm 2FA is enabled:

```bash
npm publish --access public --otp=123456
```

## Security Notes

- The Claude config file should be treated as sensitive because it contains the user's wallet credentials.
- Private-key operations happen inside the local MCP process.
- Backend-only secrets remain on the backend.
- Decrypted private keys are never returned in tool output.
- Password recovery works only when the main private key is available locally.

## Files That Define The Current Behavior

- package entrypoint: `packages/nullpay-mcp/src/cli.ts`
- setup wizard: `packages/nullpay-mcp/src/setup.ts`
- runtime config defaults: `packages/nullpay-mcp/src/env.ts`
- tool orchestration: `packages/nullpay-mcp/src/service.ts`
- Aleo helpers and recovery logic: `packages/nullpay-mcp/src/aleo.ts`
- backend relay route: `backend/index.js`
