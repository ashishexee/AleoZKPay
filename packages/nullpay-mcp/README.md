# @nullpay/mcp

NullPay MCP is a local Model Context Protocol server for Claude that lets users create invoices, pay invoices, and inspect transactions through chat.

The package is designed so the user only needs to provide their own wallet credentials:

- `NULLPAY_MAIN_ADDRESS`
- `NULLPAY_MAIN_PRIVATE_KEY`
- `NULLPAY_MAIN_PASSWORD`

NullPay-owned infrastructure stays inside the package or on the backend:

- default backend API: `https://nullpay-backend-ib5q4.ondigitalocean.app/api`
- default public app URL: `https://nullpay.app`
- relayer private key: backend only

## How It Works

1. The user runs the setup wizard.
2. The wizard asks whether to install into Claude Code or Claude Desktop.
3. The wizard asks for the user's address, private key, and password.
4. The wizard writes the MCP config file automatically on the user's machine.
5. Claude starts the local NullPay MCP server with `@nullpay/mcp server`.
6. The MCP server talks to the NullPay backend and keeps the user's private-key operations local.

## Install For End Users

Run the setup wizard:

```bash
npx -y @nullpay/mcp
```

You can also call the setup command explicitly:

```bash
npx -y @nullpay/mcp setup
```

The wizard writes the required MCP config entry automatically.

## Manual Claude Configuration

The setup wizard is the recommended path, but you can also add the MCP server manually.

### Claude Desktop

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

On Windows, Claude Desktop may need:

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

### Claude Code

The setup wizard can also write the Claude Code config automatically. If needed, the same `server` command is used there too.

After setup, restart Claude and verify the MCP server is available.

## Commands

### Published package

Start the interactive installer:

```bash
npx -y @nullpay/mcp
```

Run the MCP server directly:

```bash
npx -y @nullpay/mcp server
```

Show help:

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

Run the local MCP server directly:

```bash
node dist/cli.js server
```

Run in TypeScript during development:

```bash
npm run dev
```

## Tooling And Login Model

The MCP server exposes four tools:

- `login`
- `create_invoice`
- `pay_invoice`
- `get_transaction_info`

### `login`

`login` creates or resumes the NullPay session inside the MCP process.

Normal path:

- uses address + password from tool input or env
- loads the backend profile
- validates the password by decrypting stored wallet data
- restores burner wallet metadata when present

Recovery path:

- if password is missing but `NULLPAY_MAIN_PRIVATE_KEY` is available
- the server can recover the backed-up password from on-chain backup records
- if a full burner backup exists on-chain, it restores the burner wallet automatically

### `create_invoice`

- uses the active wallet address
- calls the NullPay backend relayer endpoint
- waits for the invoice hash to resolve from Aleo mapping
- stores the invoice row in the backend
- returns a payment link

### `pay_invoice`

- accepts either a full NullPay payment link or an invoice hash
- prefers the full payment link so merchant address, amount, salt, token, and session id are available immediately
- builds the payment authorization locally with the user's wallet key
- sends the authorization to the backend sponsor endpoint

### `get_transaction_info`

- fetches invoice rows from the backend
- enriches private record-backed data locally when the main private key is available

## Credential Model

User-provided values:

- `NULLPAY_MAIN_ADDRESS`
- `NULLPAY_MAIN_PRIVATE_KEY`
- `NULLPAY_MAIN_PASSWORD`

Bundled or backend-side values:

- `NULLPAY_BACKEND_URL` defaults internally to production
- `NULLPAY_PUBLIC_BASE_URL` defaults internally to production
- relayer secrets stay on the backend

## Security Notes

- The user's private key is intended to stay local to the MCP process.
- The config file used by Claude contains sensitive wallet credentials and should be treated like a secret file.
- The MCP server never returns decrypted private keys in tool output.
- Password recovery from on-chain records only works when the main private key is available locally.

## Publishing

From `packages/nullpay-mcp`:

```bash
npm run build
npm publish --access public
```

If npm 2FA is enabled:

```bash
npm publish --access public --otp=123456
```

## License

MIT
