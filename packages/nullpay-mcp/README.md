# NullPay MCP

NullPay MCP installs a local MCP server for Claude and lets users connect with only their wallet credentials.

## Install

```bash
npx -y @nullpay/mcp
```

The setup wizard asks whether to install into Claude Code or Claude Desktop, then writes the required MCP config automatically on the user's machine.

## User-provided env

Users only need to provide:

- `NULLPAY_MAIN_ADDRESS`
- `NULLPAY_MAIN_PRIVATE_KEY`
- `NULLPAY_MAIN_PASSWORD`

## Tools

- `login`
- `create_invoice`
- `pay_invoice`
- `get_transaction_info`

## Environment

Bundled by NullPay inside the package:

- production backend URL
- public NullPay base URL
- Provable API key
- Provable consumer ID

Optional main-wallet credentials for record-backed transaction lookup and automated main-wallet payments:

- `NULLPAY_MAIN_ADDRESS`
- `NULLPAY_MAIN_PASSWORD`
- `NULLPAY_MAIN_PRIVATE_KEY`

`NULLPAY_MAIN_PVT_KEY` is also accepted as a legacy alias for the private key.

When Claude launches the MCP server, it also loads env values from these files if present:

- `packages/nullpay-mcp/.env`
- repo-root `.env`
- `backend/.env`

For relayed invoice creation and sponsored execution, the backend still needs:

- `RELAYER_PRIVATE_KEY`

## Notes

- Burner wallet private keys remain encrypted at rest in the existing `users` table.
- The MCP server decrypts burner keys only in memory during payment execution.
- If `NULLPAY_MAIN_PRIVATE_KEY` is available, the MCP server can fetch invoice amounts from main-wallet records and pay invoices from the main wallet without exposing that key to the model.
- If the main private key is not available, the MCP server still allows login and invoice creation, and it prompts the user to add the env var for record-backed amount lookup and automated main-wallet payments.
