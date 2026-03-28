# @nullpay/mcp

NullPay MCP (Model Context Protocol) server for conversational invoice and payment flows.

This server allows AI agents to interact with the NullPay protocol, enabling them to create invoices, track payments, and manage merchant flows directly through chat.

## Features

- **Tool-based Interaction**: Exposes tools for creating NullPay invoices.
- **Privacy First**: Built on top of the Aleo blockchain with Zero-Knowledge Proofs.
- **Stdio Transport**: Compatible with MCP clients like Claude Desktop.

## Installation

```bash
npm install @nullpay/mcp
```

## Usage

### As an MCP Server

Add the following to your MCP client configuration (e.g., `claude_desktop_config.json`):

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

## Configuration

The server requires the following environment variables:

- `NULLPAY_BACKEND_URL`: The base URL of your NullPay backend instance.
- `NULLPAY_MCP_SHARED_SECRET`: A shared secret to authenticate with the backend.

## License

MIT
