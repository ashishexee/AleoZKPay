import { Lock, Shield, Wallet } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const burnerSetupExample = `// In your MCP config, you can configure a burner wallet
// alongside the main wallet for identity separation.
{
  "mcpServers": {
    "nullpay": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@nullpay/mcp", "server"],
      "env": {
        "NULLPAY_MAIN_ADDRESS": "aleo1...",
        "NULLPAY_MAIN_PRIVATE_KEY": "APrivateKey1...",
        "NULLPAY_MAIN_PASSWORD": "optional-wallet-encryption-password"
      }
    }
  }
}`;

const walletOperationsExample = `// The NullPay platform uses two wallet programs:
// 1. Main wallet (zk_pay_proofs_privacy_wallet_v3.aleo)
// 2. Core payment program (zk_pay_proofs_privacy_v27.aleo)

// Wallet program helpers available:
// - backup_password       → store an encrypted password backup on-chain
// - backup_burner_wallet  → store encrypted burner key on-chain
// - create_card_profile   → initialize a profile for gift cards
// - set_card_status       → toggle card active/inactive
// - create_gift_card_record → mint a redeemable gift card record`;

export const walletsSection: DocsSection = {
    id: 'gs-wallets',
    group: 'Core Concepts',
    label: 'Wallets & Identity',
    eyebrow: 'Core Concepts',
    title: 'Wallets and identity on NullPay',
    summary:
        'NullPay supports two distinct wallet identities: a Main Wallet connected via the Shield browser extension, and an optional Burner Wallet for disposable, anonymous payment identities. Understanding how these two identities work is critical for building private payment flows.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-3">
                <MetricCard
                    icon={Shield}
                    title="Main Wallet (Shield)"
                    description="Your primary Aleo wallet, connected via the NullPay Shield browser extension. This is the identity used for merchant registration, invoice creation, and receiving settlements."
                />
                <MetricCard
                    icon={Wallet}
                    title="Burner Wallet"
                    description="A freshly generated, ephemeral Aleo keypair created inside the platform. Used to send payments without linking the transaction to your main identity. Completely voluntary."
                />
                <MetricCard
                    icon={Lock}
                    title="On-chain Backup"
                    description="Wallet helpers on the wallets program let you back up your encrypted password and burner private key as private records on-chain. Only you can read them back."
                />
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">The Main Wallet</h3>
                <div className="space-y-3 text-sm leading-relaxed text-gray-400">
                    <p>
                        The Main Wallet is your primary Aleo address, managed through the <span className="font-semibold text-white">NullPay Shield extension</span>. It is the wallet that:
                    </p>
                    <ul className="list-inside list-disc space-y-2 pl-2">
                        <li>Gets registered as a merchant on the backend</li>
                        <li>Signs invoice creation transactions on-chain</li>
                        <li>Receives settled payments from buyers</li>
                        <li>Controls the Profile QR payment link for inbound payments</li>
                        <li>Is associated with your merchant secret key (<code className="rounded bg-white/5 px-1.5 py-0.5 text-orange-300">sk_</code>)</li>
                    </ul>
                    <p className="mt-3 text-gray-500">
                        The Shield extension is required for the desktop platform. It handles private key storage, transaction signing, and proving request generation entirely on your machine. Your private key never leaves your browser.
                    </p>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">The Burner Wallet</h3>
                <div className="space-y-3 text-sm leading-relaxed text-gray-400">
                    <p>
                        The Burner Wallet is a <span className="font-semibold text-white">disposable keypair</span> generated directly inside the NullPay platform. Its purpose is to give payers a payment identity that is completely disconnected from their main Aleo address.
                    </p>
                    <ul className="list-inside list-disc space-y-2 pl-2">
                        <li>Generated on-demand with no blockchain footprint until it sends a transaction</li>
                        <li>Operates independently from the Shield extension</li>
                        <li>Can be used to pay invoices from the hosted checkout</li>
                        <li>Has its own Profile QR for receiving burner-wallet payments</li>
                        <li>Can be backed up on-chain as an encrypted private record</li>
                    </ul>
                    <p className="mt-3 text-orange-300/80 text-xs font-semibold uppercase tracking-widest">
                        Important: The burner wallet is not the same as a "throwaway" with no backup. NullPay lets you restore it from an on-chain record if you lose it.
                    </p>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Fee Handling</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    Every Aleo transaction requires a fee in Credits. NullPay exposes two fee modes that you can toggle directly from the navigation header:
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-1 text-sm font-bold text-white">Estimation Mode</p>
                        <p className="text-xs leading-relaxed text-gray-400">
                            Dynamically queries the Aleo network for current fee conditions and applies a safety buffer. Recommended for most users. The fee will match live network demand.
                        </p>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-1 text-sm font-bold text-white">Fixed Fee Mode</p>
                        <p className="text-xs leading-relaxed text-gray-400">
                            Uses a hardcoded constant of <code className="rounded bg-white/5 px-1 py-0.5 text-orange-300">0.02 Credits</code> per transaction. Good for predictable cost modeling. May fail in extreme network congestion.
                        </p>
                    </div>
                </div>
            </GlassCard>

            <CodeBlock title="Wallet program helpers" language="text" code={walletOperationsExample} />

            <CodeBlock title="MCP wallet configuration" language="json" code={burnerSetupExample} />

            <Callout title="Never expose private keys to the model" tone="orange">
                When using NullPay MCP with AI clients, configure <code className="rounded bg-white/10 px-1.5 py-0.5">NULLPAY_MAIN_PRIVATE_KEY</code> as an environment variable in the MCP server config, not in the conversation prompt. The MCP server reads it from env without surfacing the value back to the AI model.
            </Callout>
        </div>
    ),
};
