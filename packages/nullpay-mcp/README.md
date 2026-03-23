# NullPay MCP

MCP server for conversational NullPay onboarding, invoice creation, invoice payment, and transaction lookup.

## Tools

- `login`
- `create_invoice`
- `pay_invoice`
- `get_transaction_info`

## Environment

Required for backend and MCP connectivity:

- `NULLPAY_BACKEND_URL`
- `NULLPAY_PUBLIC_BASE_URL`
- `NULLPAY_MCP_SHARED_SECRET`
- `PROVABLE_API_KEY`
- `PROVABLE_CONSUMER_ID` or `PROVABLE_CONSUMER_KEY`

Optional main-wallet credentials for record-backed transaction lookup and automated main-wallet payments:

- `NULLPAY_MAIN_ADDRESS`
- `NULLPAY_MAIN_PASSWORD`
- `NULLPAY_MAIN_PRIVATE_KEY`

`NULLPAY_MAIN_PVT_KEY` is also accepted as a legacy alias for the private key.

When Claude launches the MCP server, it now also loads env values from these files if present:

- `packages/nullpay-mcp/.env`
- repo-root `.env`
- `backend/.env`

For relayed invoice creation and sponsored execution, the backend also needs:

- `RELAYER_PRIVATE_KEY`

## Notes

- Burner wallet private keys remain encrypted at rest in the existing `users` table.
- The MCP server decrypts burner keys only in memory during payment execution.
- If `NULLPAY_MAIN_PRIVATE_KEY` is available, the MCP server can fetch invoice amounts from main-wallet records and pay invoices from the main wallet without exposing that key to the model.
- If the main private key is not available, the MCP server still allows login and invoice creation, and it prompts the user to add the env var for record-backed amount lookup and automated main-wallet payments.
