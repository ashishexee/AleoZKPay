import { Lock, Shield, Wallet } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const walletOperationsExample = `// The NullPay platform uses two wallet programs:
// 1. zk_pay_proofs_privacy_v29.aleo — Core invoice/payment
// 2. zk_pay_proofs_privacy_wallet_v6.aleo — Wallet artifacts & oracle

// Wallet program helpers available:
//   backup_password           → store encrypted password backup on-chain
//   backup_burner_wallet      → store encrypted burner key on-chain (10 pk parts)
//   create_card_profile       → initialize a CardProfileRecord for gift cards
//   delete_card_profile       → remove an existing card profile
//   create_gift_card_record   → mint a redeemable gift card record
//   set_oracle_address        → admin-only: update trusted oracle address

// BurnerWallet record stores (all field-encoded):
//   owner             → main wallet address
//   burner_address    → burner wallet address
//   password_part     → encrypted password fragment
//   pk_part_1..10     → encrypted private key split across 10 fields`;

export const walletsSection: DocsSection = {
    id: 'gs-wallets',
    group: 'Core Concepts',
    label: 'Wallets & Identity',
    eyebrow: 'Core Concepts',
    title: 'Wallets and identity on NullPay',
    summary:
        'NullPay supports two distinct wallet identities: a Main Wallet connected via the Shield browser extension, and an optional Burner Wallet for anonymous payment identities. Cards extend this with PIN + secret-based checkout flows that don\'t require a wallet at all.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-3">
                <MetricCard
                    icon={Shield}
                    title="Main Wallet (Shield)"
                    description="Your primary Aleo wallet connected via Shield browser extension. Used for merchant registration, invoice creation, receiving settlements, and dashboard analytics."
                />
                <MetricCard
                    icon={Wallet}
                    title="Burner Wallet"
                    description="An ephemeral Aleo keypair generated inside the platform. Sends payments without linking to your main identity. Can be backed up on-chain as encrypted private records."
                />
                <MetricCard
                    icon={Lock}
                    title="NullPay Card"
                    description="A wallet-free checkout method using a Card PIN and Card Secret. Card holders get their own balance and can pay without connecting any wallet extension."
                />
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">The Main Wallet</h3>
                <div className="space-y-4 text-sm leading-relaxed text-gray-400">
                    <p>
                        The Main Wallet is your primary Aleo address, managed through the <span className="font-semibold text-white">Shield browser extension</span> (available on Play Store for mobile).
                        It is the wallet that:
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                            <p className="text-xs leading-relaxed">
                                <span className="font-semibold text-white">Merchant Registration</span><br />
                                Gets registered on the backend, receives a secret key (<code className="rounded bg-white/5 px-1 py-0.5 text-orange-300">sk_</code>) for API access.
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                            <p className="text-xs leading-relaxed">
                                <span className="font-semibold text-white">Transaction Signing</span><br />
                                Signs invoice creation and payment transactions. The private key never leaves the Shield extension.
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                            <p className="text-xs leading-relaxed">
                                <span className="font-semibold text-white">Settlement Receipt</span><br />
                                Receives settled payments from buyers. Only the merchant can decrypt the incoming funds record.
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                            <p className="text-xs leading-relaxed">
                                <span className="font-semibold text-white">Profile QR Control</span><br />
                                Controls the permanent Profile QR payment link used for inbound payments without integration.
                            </p>
                        </div>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">The Burner Wallet</h3>
                <div className="space-y-4 text-sm leading-relaxed text-gray-400">
                    <p>
                        The Burner Wallet is a <span className="font-semibold text-white">disposable keypair</span> generated directly inside the NullPay platform.
                        Its purpose is to give payers a payment identity that is completely disconnected from their main Aleo address.
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                            <p className="text-xs leading-relaxed">
                                <span className="font-semibold text-white">Local Generation</span><br />
                                Created on-demand in your browser. No blockchain footprint until it sends its first transaction.
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                            <p className="text-xs leading-relaxed">
                                <span className="font-semibold text-white">Independent Operation</span><br />
                                Operates independently from the Shield extension. No link between main wallet and burner wallet on-chain.
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                            <p className="text-xs leading-relaxed">
                                <span className="font-semibold text-white">Own QR Code</span><br />
                                Has its own Profile QR for receiving burner-wallet payments. Separate from the main wallet QR.
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                            <p className="text-xs leading-relaxed">
                                <span className="font-semibold text-white">On-Chain Backup</span><br />
                                Encrypted burner private key is split across 10 fields and stored as a private record via <code className="rounded bg-white/5 px-1 py-0.5 text-orange-300">backup_burner_wallet</code>.
                            </p>
                        </div>
                    </div>
                    <p className="mt-3 text-orange-300/80 text-xs font-semibold uppercase tracking-widest">
                        The burner wallet is recoverable from an on-chain record if lost. It is not a "throwaway" — NullPay gives it proper backup semantics.
                    </p>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">The NullPay Card</h3>
                <div className="space-y-3 text-sm leading-relaxed text-gray-400">
                    <p>
                        The <span className="font-semibold text-white">NullPay Card</span> is a wallet-free checkout flow that lets buyers pay using just a Card Number, PIN, and Card Secret — no browser extension or Aleo wallet required.
                    </p>
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                            <p className="text-xs leading-relaxed">
                                <span className="font-semibold text-white">Card Profile</span><br />
                                Created on-chain via <code className="rounded bg-white/5 px-1 py-0.5 text-orange-300">create_card_profile</code>. Stores encrypted card metadata as private records.
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                            <p className="text-xs leading-relaxed">
                                <span className="font-semibold text-white">Balance Management</span><br />
                                Cards hold their own balance. Top-ups transfer funds from the main wallet to the card address.
                            </p>
                        </div>
                        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                            <p className="text-xs leading-relaxed">
                                <span className="font-semibold text-white">Checkout Flow</span><br />
                                At hosted checkout, buyers enter their Card Number, PIN, and Secret to authenticate and pay — no wallet connection needed.
                            </p>
                        </div>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Fee Modes</h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    Every Aleo transaction requires a fee in Credits. NullPay exposes two fee modes toggleable from the navigation header:
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-1 text-sm font-bold text-white">Estimation Mode</p>
                        <p className="text-xs leading-relaxed text-gray-400">
                            Dynamically queries the Aleo network for current fee conditions and applies a safety buffer.
                            Recommended for most users. The fee matches live network demand but the Shield popup can take longer to appear.
                        </p>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-1 text-sm font-bold text-white">Fixed Fee Mode (Default)</p>
                        <p className="text-xs leading-relaxed text-gray-400">
                            Uses a hardcoded constant of <code className="rounded bg-white/5 px-1 py-0.5 text-orange-300">0.02 Credits</code> per transaction.
                            Faster Shield popup response. Good for predictable cost modeling. May fail under extreme network congestion.
                        </p>
                    </div>
                </div>
            </GlassCard>

            <CodeBlock title="Wallet program helpers" language="text" code={walletOperationsExample} />

            <Callout title="Never expose private keys to the model" tone="orange">
                When using NullPay MCP with AI clients, configure <code className="rounded bg-white/10 px-1.5 py-0.5">NULLPAY_MAIN_PRIVATE_KEY</code> as
                an environment variable in the MCP server config — not in the chat prompt. The MCP server reads it from env without
                surfacing the value to the AI model. Private-key operations happen inside the local MCP process only.
            </Callout>
        </div>
    ),
};
