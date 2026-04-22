import {
    Layers3,
    FileCode2,
    ShieldCheck,
    Database,
    Network,
    Smartphone,
    Terminal,
    Cpu as Chip,
    Zap,
    Lock,
    Globe,
    Workflow,
} from 'lucide-react';
import type { DocsSection } from '../types';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';
import { Callout } from '../ui';

export const architectureOverviewSection: DocsSection = {
    id: 'arch-overview',
    group: 'System Architecture',
    label: 'Overview',
    eyebrow: 'System Design',
    title: 'Architectural Hierarchy',
    summary:
        'NullPay is built on a modular four-layer architecture that separates sensitive ZK-proof generation from high-performance orchestration and on-chain settlement.',
    content: (
        <div className="space-y-6">
            {/* Layer 1: Core Protocol */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-white/[0.05] pb-4">
                    <Chip className="h-5 w-5 text-orange-400" />
                    <h2 className="text-lg font-medium text-white tracking-tight">
                        <span className="text-orange-400/80 mr-2">L1:</span> Core Protocol (ZK-Circuits)
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                        <p className="text-sm text-gray-400 leading-relaxed">
                            The foundation layer consists of optimized Leo circuits defining rules for payment validity, invoice settlement, and encrypted receipt generation. Two programs handle this:
                        </p>
                        <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-orange-500/5 border border-orange-500/10 text-[10px] font-mono text-orange-300/70 uppercase tracking-wider">zk_pay_proofs_privacy_v29.aleo</span>
                            </div>
                            <p className="text-xs text-gray-500">Core payment program: invoice creation, payments, settlement</p>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-orange-500/5 border border-orange-500/10 text-[10px] font-mono text-orange-300/70 uppercase tracking-wider">zk_pay_proofs_privacy_wallet_v6.aleo</span>
                            </div>
                            <p className="text-xs text-gray-500">Wallet helper: burner backup, card profiles, gift cards</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                            <FileCode2 className="w-3.5 h-3.5 text-orange-400/40" />
                            <span>Invoice, PayerReceipt, MerchantReceipt</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                            <Lock className="w-3.5 h-3.5 text-orange-400/40" />
                            <span>BHP256 deterministic hashes</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-300">
                            <Layers3 className="w-3.5 h-3.5 text-orange-400/40" />
                            <span>credits, usdcx, usad tokens</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Layer 2: Infrastructure */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-white/[0.05] pb-4">
                    <Database className="h-5 w-5 text-orange-400" />
                    <h2 className="text-lg font-medium text-white tracking-tight">
                        <span className="text-orange-400/80 mr-2">L2:</span> Infrastructure (Secure Backend)
                    </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <GlassCard className="p-6 border-white/[0.05] bg-white/[0.01] border-l-2 border-l-orange-500/10" hoverEffect={false}>
                        <h3 className="text-white text-sm font-semibold mb-2 flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5 text-orange-400/70" /> Relayer Network
                        </h3>
                        <p className="text-xs text-gray-500 leading-relaxed font-light">
                            Node.js nodes managing session lifecycles, gas sponsorship for gasless UX, and proof propagation to the Aleo L1 network.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[9px] text-gray-500">checkout.controller</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[9px] text-gray-500">invoices.controller</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[9px] text-gray-500">sdk.controller</span>
                        </div>
                    </GlassCard>
                    <GlassCard className="p-6 border-white/[0.05] bg-white/[0.01] border-l-2 border-l-orange-500/10" hoverEffect={false}>
                        <h3 className="text-white text-sm font-semibold mb-2 flex items-center gap-2">
                            <ShieldCheck className="h-3.5 w-3.5 text-orange-400/70" /> Blind Database Model
                        </h3>
                        <p className="text-xs text-gray-500 leading-relaxed font-light">
                            Private orchestration using Supabase. Minimal metadata storage; sensitive credentials remain isolated in secure local user sessions.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[9px] text-gray-500">supabase</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[9px] text-gray-500">users.controller</span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.03] text-[9px] text-gray-500">merchants.controller</span>
                        </div>
                    </GlassCard>
                </div>
            </section>

            {/* Layer 3: Integration Layer */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-white/[0.05] pb-4">
                    <Workflow className="h-5 w-5 text-orange-400" />
                    <h2 className="text-lg font-medium text-white tracking-tight">
                        <span className="text-orange-400/80 mr-2">L3:</span> Integration (SDKs & bridges)
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-5">
                        <div className="flex gap-4 group">
                            <Terminal className="h-4 w-4 text-orange-400/40 mt-0.5" />
                            <div>
                                <h4 className="text-white text-sm font-medium">Node.js SDK</h4>
                                <p className="text-xs text-gray-500 mt-1 font-light leading-relaxed">Merchant-side library for automated invoice creation and settlement hooks.</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded bg-white/[0.03] text-[9px] text-gray-500">@nullpay/node</span>
                                    <span className="px-1.5 py-0.5 rounded bg-white/[0.03] text-[9px] text-gray-500">webhooks</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4 group">
                            <Layers3 className="h-4 w-4 text-orange-400/40 mt-0.5" />
                            <div>
                                <h4 className="text-white text-sm font-medium">MCP Protocol</h4>
                                <p className="text-xs text-gray-500 mt-1 font-light leading-relaxed">Local stdio bridge for AI assistants to generate ZK-proofs on client hardware.</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 rounded-3xl border border-dashed border-orange-500/10 bg-orange-500/[0.01] flex flex-col items-center text-center space-y-3">
                        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-orange-500/60 mb-1">Guiding Principle</div>
                        <h4 className="text-white text-base font-light tracking-tight italic">"Local Proofing, Global Settlement"</h4>
                        <p className="text-[10px] text-gray-500 font-light max-w-[200px]">Ensures private keys remain in the local environment, never reaching the relayer.</p>
                    </div>
                </div>
            </section>

            {/* Layer 4: Presentation Layer */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-white/[0.05] pb-4">
                    <Globe className="h-5 w-5 text-orange-400" />
                    <h2 className="text-lg font-medium text-white tracking-tight">
                        <span className="text-orange-400/80 mr-2">L4:</span> Presentation (Consumer UI)
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2 group hover:border-orange-500/20 transition-colors">
                        <Smartphone className="h-4 w-4 text-orange-400/30 mb-2 group-hover:text-orange-400 transition-colors" />
                        <h4 className="text-white text-xs font-semibold">Vite + React</h4>
                        <p className="text-[10px] text-gray-500 leading-relaxed font-light">Optimized builds for sub-second mobile load times and session persistence.</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2 group hover:border-orange-500/20 transition-colors">
                        <Layers3 className="h-4 w-4 text-orange-400/30 mb-2 group-hover:text-orange-400 transition-colors" />
                        <h4 className="text-white text-xs font-semibold">Framer Motion</h4>
                        <p className="text-[10px] text-gray-500 leading-relaxed font-light">Subtle interaction states that communicate proof-generation progress non-invasively.</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2 group hover:border-orange-500/20 transition-colors">
                        <Network className="h-4 w-4 text-orange-400/30 mb-2 group-hover:text-orange-400 transition-colors" />
                        <h4 className="text-white text-xs font-semibold">Standard UI</h4>
                        <p className="text-[10px] text-gray-500 leading-relaxed font-light">Modern visual language built on backdrop filters and minimalist typography.</p>
                    </div>
                </div>
            </section>

            <Callout title="Privacy Model" tone="blue">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                        <p className="text-xs font-semibold text-white mb-2">On-Chain (Private)</p>
                        <ul className="text-xs text-gray-400 space-y-1">
                            <li>• Invoice record (hashed details)</li>
                            <li>• PayerReceipt (encrypted amount)</li>
                            <li>• MerchantReceipt (encrypted amount)</li>
                            <li>• Gift card records</li>
                            <li>• Card profile records</li>
                        </ul>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-white mb-2">On-Chain (Public)</p>
                        <ul className="text-xs text-gray-400 space-y-1">
                            <li>• InvoiceData mapping (status, expiry)</li>
                            <li>• salt_to_invoice (salt → hash)</li>
                            <li>• oracle_address</li>
                            <li>• Function signatures & fees</li>
                        </ul>
                    </div>
                </div>
            </Callout>

            <div className="pt-8 flex items-center justify-between border-t border-white/[0.05]">
                <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                    By decoupling proof generation from network propagation, NullPay maintains Web2 performance with ZK privacy.
                </p>
                <div className="flex items-center gap-3 text-[10px] font-mono text-gray-600">
                    NETWORK STATUS
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500/80">
                        <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                        OPERATIONAL
                    </div>
                </div>
            </div>
        </div>
    ),
};