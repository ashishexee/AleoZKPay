import type { DocsSection } from '../types';
import { Callout, DiagramFigure } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';
import {
    Globe,
    Server,
    Database,
    Cpu,
    ShieldCheck,
    Network,
    Layers,
    ArrowRight,
    Lock,
    Zap,
} from 'lucide-react';

export const architectureDiagramSection: DocsSection = {
    id: 'architecture-diagram',
    group: 'System Architecture',
    label: 'Architecture Diagram',
    eyebrow: 'Architecture',
    title: 'NullPay System Architecture Diagram',
    summary:
        'A visual map of the NullPay stack showing how the frontend, backend, integrations, and on-chain protocol layers fit together.',
    content: (
        <div className="space-y-8">
            <DiagramFigure
                src="/assets/NullPay System Design.svg"
                alt="NullPay system architecture diagram"
                caption="High-level layout of NullPay components and how requests move between user interfaces, backend orchestration, integrations, and Aleo settlement."
            />

            <Callout title="Reading the Diagram" tone="blue">
                Use this view as the high-level reference before diving into the architecture overview, trust boundaries, or detailed data-flow sections.
            </Callout>

            {/* Component Breakdown */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <Layers className="h-5 w-5 text-orange-400" />
                    <h2 className="text-xl font-bold text-white tracking-tight">Component Breakdown</h2>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                    NullPay is organized into five independent layers. Each layer communicates with adjacent layers through well-defined APIs, ensuring that a failure in one layer cannot cascade into others.
                </p>

                <div className="grid gap-5 lg:grid-cols-2">
                    <GlassCard className="p-6">
                        <div className="flex items-center gap-3 mb-4 text-orange-400">
                            <Globe className="h-5 w-5" />
                            <h3 className="text-lg font-bold">L4 — Presentation Layer</h3>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-400 mb-4">
                            The buyer-facing interface built with Vite + React, Tailwind CSS, and Framer Motion. Handles wallet connection, checkout session rendering, QR code generation, and proof-generation status indicators.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">React 18</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">Vite 5</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">Framer Motion</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">lucide-react</span>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <div className="flex items-center gap-3 mb-4 text-blue-400">
                            <Server className="h-5 w-5" />
                            <h3 className="text-lg font-bold">L3 — Integration Layer</h3>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-400 mb-4">
                            SDKs and protocol bridges that connect external systems to NullPay. The Node.js SDK wraps REST calls, while the MCP server provides a local stdio bridge for AI assistants.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">@nullpay/node</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">@nullpay/mcp</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">@nullpay/cli</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">nullpay.json</span>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <div className="flex items-center gap-3 mb-4 text-emerald-400">
                            <Database className="h-5 w-5" />
                            <h3 className="text-lg font-bold">L2 — Infrastructure Layer</h3>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-400 mb-4">
                            The backend orchestration layer: Node.js/Express controllers manage checkout sessions, invoice CRUD, DPS relay, Oracle quotes, and webhook dispatch. Supabase stores minimal metadata while private keys remain local.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">checkout.controller</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">invoices.controller</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">dps.controller</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">sdk.controller</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">oracle.controller</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">Supabase</span>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <div className="flex items-center gap-3 mb-4 text-purple-400">
                            <Network className="h-5 w-5" />
                            <h3 className="text-lg font-bold">L1 — Relayer & DPS</h3>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-400 mb-4">
                            Gasless transaction relay and Delegated Payment Service (DPS). The relayer sponsors gas for invoice creation and payment broadcasts. DPS allows merchants to pre-authorize spendable limits so buyers never need native gas tokens.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">Relayer Node</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">DPS Controller</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">HSM Key Vault</span>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <div className="flex items-center gap-3 mb-4 text-orange-400">
                            <Cpu className="h-5 w-5" />
                            <h3 className="text-lg font-bold">L0 — Core Protocol</h3>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-400 mb-4">
                            The Aleo Leo programs that enforce payment rules on-chain. Two programs handle invoices, settlements, wallet helpers, and Oracle price anchoring. All state transitions are ZK-proven and immutable.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">zk_pay_proofs_privacy_v29.aleo</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">zk_pay_proofs_privacy_wallet_v6.aleo</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">Oracle Program</span>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                        <div className="flex items-center gap-3 mb-4 text-pink-400">
                            <ShieldCheck className="h-5 w-5" />
                            <h3 className="text-lg font-bold">L-1 — Trust & Identity</h3>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-400 mb-4">
                            The cryptographic foundation: BHP256 commitment hashes, Poseidon salts, AES-256-GCM encrypted local storage, and Aleo account identity (view key / private key / address triple). No seed phrase ever leaves the local device.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">BHP256</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">Poseidon</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">AES-256-GCM</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[10px] text-gray-500 font-mono">aleo-wallet-adaptor</span>
                        </div>
                    </GlassCard>
                </div>
            </section>

            {/* Request Flow */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-orange-400" />
                    <h2 className="text-xl font-bold text-white tracking-tight">Typical Request Flow</h2>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                    A single invoice payment crosses all six layers in roughly 300–800 ms (excluding Aleo block finality). Here is the exact path a request takes from buyer click to on-chain settlement.
                </p>

                <GlassCard className="p-6">
                    <div className="space-y-6">
                        {[
                            {
                                step: '1',
                                layer: 'Presentation',
                                title: 'Buyer clicks Pay on Hosted UI',
                                detail: 'React frontend loads checkout session from backend, displays invoice details, token selector, and fee mode toggle.',
                                icon: Globe,
                                color: 'text-orange-400',
                            },
                            {
                                step: '2',
                                layer: 'Integration',
                                title: 'SDK resolves session & prepares inputs',
                                detail: 'Node.js SDK (or MCP server) fetches the invoice hash, verifies it against the on-chain mapping, and constructs the transition inputs.',
                                icon: Server,
                                color: 'text-blue-400',
                            },
                            {
                                step: '3',
                                layer: 'Infrastructure',
                                title: 'Backend validates & authorizes DPS',
                                detail: 'If feeMode === DPS, the backend checks the merchant spendable limit, deducts the gas allocation, and signs the relay authorization.',
                                icon: Database,
                                color: 'text-emerald-400',
                            },
                            {
                                step: '4',
                                layer: 'Relayer',
                                title: 'Relayer sponsors gas & broadcasts',
                                detail: 'The relayer node assembles the transaction, pays the Aleo network fee from its own balance, and submits the proof to the mempool.',
                                icon: Network,
                                color: 'text-purple-400',
                            },
                            {
                                step: '5',
                                layer: 'Core Protocol',
                                title: 'Aleo ledger validates ZK proof',
                                detail: 'The Leo program executes pay_invoice, checks BHP256 hash equality, updates the InvoiceData mapping to status=1, and mints encrypted receipts.',
                                icon: Cpu,
                                color: 'text-orange-400',
                            },
                            {
                                step: '6',
                                layer: 'Trust & Identity',
                                title: 'Buyer receives encrypted receipt',
                                detail: 'A private PayerReceipt record is created with AES-encrypted amount. Only the buyer\'s view key can decrypt it.',
                                icon: Lock,
                                color: 'text-pink-400',
                            },
                        ].map((item) => (
                            <div key={item.step} className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] ${item.color} font-black text-sm`}>
                                        <item.icon className="h-4 w-4" />
                                    </div>
                                    {item.step !== '6' && (
                                        <div className="w-px flex-1 bg-white/[0.06] mt-2" />
                                    )}
                                </div>
                                <div className="flex-1 pb-6">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{item.layer} Layer</span>
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

            <Callout title="Design Principle" tone="emerald">
                Every layer is <strong>stateless</strong> with respect to the next. The Presentation layer never stores merchant secrets; the Relayer never sees invoice salts; the Protocol layer never reveals payer identity. This compartmentalization is what makes NullPay robust against single-point failures.
            </Callout>
        </div>
    ),
};
