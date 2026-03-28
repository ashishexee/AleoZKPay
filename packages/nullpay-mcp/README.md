# @nullpay/mcp

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

This server allows AI agents to interact with the NullPay protocol, enabling them to create invoices, track payments, and manage merchant flows directly through chat.

## Features

- **Tool-based Interaction**: Exposes tools for creating NullPay invoices.
- **Privacy First**: Built on top of the Aleo blockchain with Zero-Knowledge Proofs.
- **Stdio Transport**: Compatible with MCP clients like Claude Desktop.

<<<<<<< HEAD
Bundled by NullPay inside the package:

- production backend URL
- public NullPay base URL
- Provable API key
- Provable consumer ID
=======
## Installation

```bash
npm install @nullpay/mcp@latest
```
>>>>>>> d9f1e889642be9d505997c05254a668cd19b13de

## Usage

### As an MCP Server

Add the following to your MCP client configuration (e.g., `claude_desktop_config.json`):

<<<<<<< HEAD
When Claude launches the MCP server, it also loads env values from these files if present:
=======
```json
{
  "mcpServers": {
    "nullpay": {
      "command": "npx",
      "args": ["-y", "@nullpay/mcp"],
      "env": {
        "NULLPAY_BACKEND_URL": "https://your-api.com/api",
        "NULLPAY_MCP_SHARED_SECRET": "your-secret"
      }
    }
  }
}
```
>>>>>>> d9f1e889642be9d505997c05254a668cd19b13de

## Configuration

<<<<<<< HEAD
For relayed invoice creation and sponsored execution, the backend still needs:
=======
The server requires the following environment variables:
>>>>>>> d9f1e889642be9d505997c05254a668cd19b13de

- `NULLPAY_BACKEND_URL`: The base URL of your NullPay backend instance.
- `NULLPAY_MCP_SHARED_SECRET`: A shared secret to authenticate with the backend.

## License

MIT
