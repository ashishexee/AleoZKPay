import type { DocsSection } from '../types';
import { Callout, DiagramFigure } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';
import {
    Store,
    ShoppingCart,
    CreditCard,
    FileCheck,
    Receipt,
    PackageCheck,
    ArrowRight,
    Clock,
    AlertTriangle,
    RotateCcw,
} from 'lucide-react';

export const userflowSection: DocsSection = {
    id: 'userflow',
    group: 'Operations',
    label: 'User Flow',
    eyebrow: 'User Journey',
    title: 'NullPay User Flow Diagram',
    summary:
        'The end-to-end buyer and merchant flow from invoice creation through checkout, settlement, and confirmation.',
    content: (
        <div className="space-y-8">
            <DiagramFigure
                src="/assets/userflow nullpay.svg"
                alt="NullPay user flow diagram"
                caption="How a payment moves through the product from merchant setup to buyer interaction, proof-backed payment execution, and final settlement visibility."
            />

            <Callout title="When to Use This" tone="emerald">
                This page is the fastest way to understand the practical product journey without reading each implementation-focused section individually.
            </Callout>

            {/* Merchant Journey */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <Store className="h-5 w-5 text-orange-400" />
                    <h2 className="text-xl font-bold text-white tracking-tight">Merchant Journey</h2>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                    The merchant flow begins with onboarding and ends with fulfilled orders and analytics. Each step is designed to require minimal blockchain knowledge.
                </p>

                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    <GlassCard className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-sm">01</div>
                            <h3 className="text-sm font-bold text-white">Onboard & Configure</h3>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Merchant runs <code className="text-orange-300/80">nullpay onboard</code> via CLI. This generates <code className="text-orange-300/80">nullpay.json</code>, registers the merchant account, and sets up the wallet adaptor.
                        </p>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-sm">02</div>
                            <h3 className="text-sm font-bold text-white">Create Invoice</h3>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Backend calls <code className="text-orange-300/80">POST /api/v1/invoices</code> with amount, token, and expiry. A BHP256 hash is computed and committed to the Aleo mapping via the relayer.
                        </p>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-sm">03</div>
                            <h3 className="text-sm font-bold text-white">Generate Checkout</h3>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            SDK creates a checkout session. The buyer receives a Hosted UI URL or a QR code containing the invoice hash and preferred token.
                        </p>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black text-sm">04</div>
                            <h3 className="text-sm font-bold text-white">Monitor Webhook</h3>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Merchant backend listens for <code className="text-blue-300/80">invoice.settled</code> events. On receipt, the order is marked paid and fulfillment logic (shipping, digital delivery) triggers.
                        </p>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black text-sm">05</div>
                            <h3 className="text-sm font-bold text-white">Sweep Earnings</h3>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Merchant decrypts private MerchantReceipt records with their view key and sweeps settled balances to cold storage using <code className="text-blue-300/80">sweep_funds</code> via MCP or CLI.
                        </p>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-sm">06</div>
                            <h3 className="text-sm font-bold text-white">Analytics & Reporting</h3>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Dashboard aggregates settled invoice data, DPS utilization, and cross-token volume. Exports to CSV/PDF for accounting.
                        </p>
                    </GlassCard>
                </div>
            </section>

            {/* Buyer Journey */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <ShoppingCart className="h-5 w-5 text-emerald-400" />
                    <h2 className="text-xl font-bold text-white tracking-tight">Buyer Journey</h2>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                    The buyer experience is designed to feel like a standard Web2 checkout, with the added assurance of cryptographic privacy.
                </p>

                <GlassCard className="p-6">
                    <div className="space-y-6">
                        {[
                            {
                                step: '1',
                                title: 'Scan QR or click payment link',
                                detail: 'Buyer receives an invoice via messaging, email, or in-app notification. The link contains the invoice hash and optional token preference.',
                                icon: CreditCard,
                                color: 'text-orange-400',
                                badge: 'Discovery',
                            },
                            {
                                step: '2',
                                title: 'Connect wallet or use Guest Mode',
                                detail: 'Buyer connects their main Aleo wallet (Puzzle, Fox, Leo, Soter, or Shield) or selects Guest Mode to generate a one-time burner wallet.',
                                icon: Store,
                                color: 'text-blue-400',
                                badge: 'Identity',
                            },
                            {
                                step: '3',
                                title: 'Review invoice & select token',
                                detail: 'Hosted UI displays itemized invoice details, amount in the requested token, Oracle conversion rate (if cross-token), and fee mode toggle (Native / DPS / Gift Card).',
                                icon: FileCheck,
                                color: 'text-purple-400',
                                badge: 'Validation',
                            },
                            {
                                step: '4',
                                title: 'Generate ZK proof locally',
                                detail: 'The wallet adaptor generates a zero-knowledge proof that the buyer owns sufficient balance and that the invoice hash matches the on-chain commitment. Private keys never leave the device.',
                                icon: Receipt,
                                color: 'text-emerald-400',
                                badge: 'Proofing',
                            },
                            {
                                step: '5',
                                title: 'Submit & await settlement',
                                detail: 'Proof is broadcast via relayer (or DPS if merchant-sponsored). The UI shows a progress indicator while the transaction lands on the Aleo ledger.',
                                icon: PackageCheck,
                                color: 'text-orange-400',
                                badge: 'Settlement',
                            },
                            {
                                step: '6',
                                title: 'Receive encrypted receipt',
                                detail: 'Buyer receives a private PayerReceipt record containing the encrypted amount and merchant address. They can view it in their wallet or export a PDF invoice.',
                                icon: Receipt,
                                color: 'text-pink-400',
                                badge: 'Confirmation',
                            },
                        ].map((item) => (
                            <div key={item.step} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] ${item.color}`}>
                                        <item.icon className="h-4 w-4" />
                                    </div>
                                    {item.step !== '6' && <div className="w-px flex-1 bg-white/[0.06] mt-2" />}
                                </div>
                                <div className="flex-1 pb-6">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[10px] font-black uppercase tracking-widest text-gray-500">{item.badge}</span>
                                        <ArrowRight className="h-3 w-3 text-gray-600" />
                                        <span className="text-[10px] font-mono text-gray-600">Step {item.step}</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed">{item.detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </section>

            {/* Edge Cases & Recovery */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-400" />
                    <h2 className="text-xl font-bold text-white tracking-tight">Edge Cases & Recovery</h2>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <GlassCard className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <Clock className="h-5 w-5 text-yellow-400" />
                            <h3 className="text-sm font-bold text-white">Invoice Expiry</h3>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Invoices have a configurable expiry measured in Aleo block heights. Once expired, the on-chain mapping status remains <code className="text-gray-300">0</code> but the Hosted UI will reject payment attempts. Merchants can re-create the invoice with a new hash if needed.
                        </p>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <RotateCcw className="h-5 w-5 text-blue-400" />
                            <h3 className="text-sm font-bold text-white">Double-Spend Protection</h3>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            The smart contract enforces strict <code className="text-blue-300/80">status == 0u8</code> checks before settlement. A second <code className="text-blue-300/80">pay_invoice</code> call on an already-settled hash will fail at the circuit level, preventing double-spending by design.
                        </p>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                            <h3 className="text-sm font-bold text-white">Failed DPS Authorization</h3>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            If a merchant\'s DPS spendable limit is exhausted, the backend returns <code className="text-red-300/80">402 Payment Required</code>. The buyer is prompted to switch to Native fee mode or wait for the merchant to top up their DPS allocation.
                        </p>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <PackageCheck className="h-5 w-5 text-emerald-400" />
                            <h3 className="text-sm font-bold text-white">Webhook Replay</h3>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            If the merchant backend is offline during settlement, the NullPay backend queues the webhook and retries with exponential backoff (max 5 attempts over 15 minutes). Merchants can also poll <code className="text-emerald-300/80">GET /api/v1/invoices/:id</code> for idempotency.
                        </p>
                    </GlassCard>
                </div>
            </section>

            <Callout title="Key Insight" tone="blue">
                The entire buyer journey can complete in <strong>under 30 seconds</strong> from QR scan to receipt confirmation, assuming the buyer already has a connected wallet. Guest Mode adds an additional 10–15 seconds for burner wallet creation.
            </Callout>
        </div>
    ),
};
