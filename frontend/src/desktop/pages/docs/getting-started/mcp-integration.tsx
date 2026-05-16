import { Bot, Lock, Send, Sparkles } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';
import { installMcpCommand, claudeConfigExample } from '../examples';

const mcpToolsExample = `// NullPay MCP exposes the following tools to AI clients:
// (Tools your AI model can call when you interact with it)
//
// ─ Authentication ─────────────────────────────────────────────
// mcp_nullpay_login
//   Login, create a burner wallet, switch active wallet,
//   or recover from on-chain backup.
//
// ─ Invoices ───────────────────────────────────────────────────
// mcp_nullpay_create_invoice
//   Create a NullPay invoice using the active wallet.
//   Params: amount, currency, invoice_type, line_items, memo
//
// ─ Payments ───────────────────────────────────────────────────
// mcp_nullpay_pay_invoice
//   Pay an invoice or a full payment link.
//   Params: payment_link, invoice_hash, amount, currency, wallet
//
// ─ Transaction History ────────────────────────────────────────
// mcp_nullpay_get_transaction_info
//   Retrieve a single invoice by hash, or list recent transactions
//   for the active wallet.
//
// ─ Fund Management ────────────────────────────────────────────
// mcp_nullpay_sweep_funds
//   Sweep settled balances from records to cold storage.
//   Supports main and burner wallet targets.
//
// mcp_nullpay_check_burner_balance
//   Check the balance of the current burner wallet.
//   Returns available credits and token balances.
//
// ─ Alternative Payment Methods ────────────────────────────────
// mcp_nullpay_pay_with_giftcard
//   Pay an invoice using a gift card record.
//
// mcp_nullpay_pay_with_card
//   Pay an invoice using a card profile record.
//
// ─ Analytics ──────────────────────────────────────────────────
// mcp_nullpay_get_analytics
//   Return payment volume and settlement statistics.
//   Filters by date range, token type, and wallet.`;

const mcpStandardInvoiceToolExample = `// Example: AI agent creates a standard invoice
// (The model drives this based on your conversation context)

// User says: "Create a $25 USDCx invoice for a consulting session"
// Agent calls:
{
  "tool": "mcp_nullpay_create_invoice",
  "params": {
    "amount": 25,
    "currency": "USDCX",
    "invoice_type": "standard",
    "memo": "1-hour consulting session",
    "wallet": "main"   // or "burner"
  }
}
// Returns: payment link that the user can share with their client`;

const mcpLoginExample = `// MCP login is called automatically on first use.
// The MCP server reads credentials from environment variables
// so they are never exposed to the AI model.

// Environment variables required in your MCP server config:
NULLPAY_MAIN_ADDRESS=aleo1...
NULLPAY_MAIN_PRIVATE_KEY=APrivateKey1...    // Optional: for signing
NULLPAY_MAIN_PASSWORD=your-password         // Optional: for encrypted wallets

// When the model calls login() with no args, the MCP server
// reads NULLPAY_MAIN_ADDRESS and NULLPAY_MAIN_PASSWORD from env.
// NULLPAY_MAIN_PRIVATE_KEY is read from env but NEVER sent to the model.`;

const mcpWalletPreferenceExample = `// The MCP server tracks which wallet is "active" (main or burner)
// Switching between them mid-conversation is supported.

// Tool: mcp_nullpay_login with wallet_preference
{
  "tool": "mcp_nullpay_login",
  "params": {
    "wallet_preference": "burner"  // Now all actions use the burner wallet
  }
}

// Create a burner wallet if none exists:
{
  "tool": "mcp_nullpay_login",
  "params": {
    "create_burner_wallet": true
  }
}`;

export const mcpIntegrationSection: DocsSection = {
    id: 'gs-mcp',
    group: 'Setup & Tooling',
    label: 'MCP Integration',
    eyebrow: 'Setup & Tooling',
    title: 'NullPay MCP — payments in AI clients',
    summary:
        'The NullPay MCP server is a Model Context Protocol implementation that exposes invoice creation, payment, and transaction inspection as structured tools to AI clients like Claude, Codex, OpenClaw, and Cursor. The private key stays local — the model decides, but never holds secrets.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-3">
                <MetricCard
                    icon={Bot}
                    title="Works with your AI client"
                    description="Supports Claude, OpenClaw, Codex, Cursor, Antigravity, and any MCP-compatible client. Each has a client-specific config file to point to the MCP server."
                />
                <MetricCard
                    icon={Lock}
                    title="Private key stays local"
                    description="The MCP server process reads your private key from environment variables. The AI model never receives or stores raw key material — it only calls structured tool functions."
                />
                <MetricCard
                    icon={Sparkles}
                    title="Conversational payment flows"
                    description="Create invoices, pay links, inspect transactions, and switch wallets entirely through conversation. The agent handles tool calls, you just describe what you want."
                />
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">How NullPay MCP works</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    When you run <code className="rounded bg-white/5 px-1.5 py-0.5 text-orange-300">npx -y @nullpay/mcp server</code>, the MCP process starts a local stdio-based server. Your AI client (e.g., Claude Desktop) connects to it automatically based on the entry in its MCP servers config. From that point, the AI model can call NullPay tools in response to your conversational requests.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-2 text-sm font-bold text-white">What the AI model sees</p>
                        <ul className="space-y-1 text-xs leading-relaxed text-gray-400">
                            <li>• Tool definitions with parameter schemas</li>
                            <li>• Tool call results (invoice hashes, payment links)</li>
                            <li>• Session status and transaction history</li>
                        </ul>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-2 text-sm font-bold text-white">What the AI model never sees</p>
                        <ul className="space-y-1 text-xs leading-relaxed text-gray-400">
                            <li>• Your Aleo private key</li>
                            <li>• Your raw wallet credentials</li>
                            <li>• Encrypted backup data</li>
                        </ul>
                    </div>
                </div>
            </GlassCard>

            <CodeBlock title="Install NullPay MCP" language="bash" code={installMcpCommand} />

            <CodeBlock title="Claude Desktop config (claude_desktop_config.json)" language="json" code={claudeConfigExample} />

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">
                    <Send className="inline mr-2 h-5 w-5 text-orange-300" />
                    Available MCP tools
                </h3>
                <CodeBlock title="MCP tool surface" language="text" code={mcpToolsExample} />
            </GlassCard>

            <CodeBlock title="MCP login — credential handling" language="js" code={mcpLoginExample} />

            <CodeBlock title="Creating an invoice via MCP tool call" language="json" code={mcpStandardInvoiceToolExample} />

            <CodeBlock title="Switching to burner wallet in MCP" language="json" code={mcpWalletPreferenceExample} />

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Supported invoice types in MCP</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    The <code className="rounded bg-white/5 px-1.5 py-0.5 text-orange-300">mcp_nullpay_create_invoice</code> tool supports all three NullPay invoice types through the <code className="rounded bg-white/5 px-1.5 py-0.5">invoice_type</code> parameter:
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                    {[
                        { type: 'standard', desc: 'One-time fixed-amount invoice. Settles once, then closed.' },
                        { type: 'multipay', desc: 'Campaign-style invoice. Multiple contributors can pay the same hash.' },
                        { type: 'donation', desc: 'Open amount, any token. Payer decides the contribution size.' },
                    ].map(({ type, desc }) => (
                        <div key={type} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                            <code className="mb-2 block text-sm font-bold text-orange-300">{type}</code>
                            <p className="text-xs leading-relaxed text-gray-400">{desc}</p>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <Callout title="NullPay MCP and the 'ANY' currency" tone="blue">
                When creating a donation invoice via MCP, you can pass <code className="rounded bg-white/10 px-1.5 py-0.5">currency: "ANY"</code>. This signals to the checkout page that the payer chooses their token. All other invoice types require a specific token: <code className="rounded bg-white/10 px-1.5 py-0.5">CREDITS</code>, <code className="rounded bg-white/10 px-1.5 py-0.5">USDCX</code>, or <code className="rounded bg-white/10 px-1.5 py-0.5">USAD</code>.
            </Callout>

            <Callout title="MCP clients are not merchants" tone="orange">
                NullPay MCP is designed for the operator or user side — creating invoices, paying links, checking transactions. It is not a replacement for the backend Node SDK. Merchant registration, webhook handling, and server-side session management still belong in your backend using <code className="rounded bg-white/10 px-1.5 py-0.5">@nullpay/node</code>.
            </Callout>
        </div>
    ),
};
