import { Bot, GitBranch, Package, Shield, TerminalSquare, Wallet } from 'lucide-react';
import type { DocsSection } from '../types';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';
import { Callout, MetricCard } from '../ui';

export const overviewSection: DocsSection = {
    id: 'gs-overview',
    group: 'Overview',
    label: 'Overview',
    eyebrow: 'Overview',
    title: 'What NullPay is',
    summary:
        'NullPay is a privacy-first payment protocol built on Aleo for merchants who want modern checkout tooling without giving up transaction privacy. In this repository, NullPay is not just a contract: it includes a hosted checkout flow, a merchant backend, a Node SDK, a CLI onboarding path, an MCP server for AI clients, and merchant-facing tools such as dashboards, receipts, and live payment monitoring.',
    content: (
        <div className="space-y-6">
            <GlassCard className="overflow-hidden border-white/[0.08] bg-white/[0.02] p-0">
                <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="flex items-center justify-center border-b border-white/[0.08] bg-black/30 p-8 lg:border-b-0 lg:border-r">
                        <img src="/assets/nullpay_logo.png" alt="NullPay" className="h-28 w-28 object-contain" />
                    </div>
                    <div className="space-y-5 p-8">
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-300">Privacy-First Payments on Aleo</p>
                        <p className="text-2xl font-bold leading-snug text-white">
                            Private checkout infrastructure for merchants, apps, and AI-native products.
                        </p>
                        <p className="text-base leading-relaxed text-gray-300">
                            NullPay lets merchants create invoices and accept payments without exposing the sensitive parts of
                            the commercial flow on-chain. Invoice details are hashed, payments run through private transfer
                            paths, and both merchant and payer receive private receipts tied to the same settlement.
                        </p>
                        <p className="text-base leading-relaxed text-gray-400">
                            The product surface in this repo spans the full stack: frontend payment routes, a merchant
                            backend, an installable Node SDK, CLI-generated invoice manifests, a hosted checkout page, and an
                            MCP server so the same payment model can be used inside AI clients.
                        </p>
                    </div>
                </div>
            </GlassCard>

            <div className="grid gap-5 md:grid-cols-3">
                <MetricCard
                    icon={Shield}
                    title="Privacy first"
                    description="Merchant address, invoice amount, and settlement context do not need to live as a plain public ledger trace. Hash-based invoice validation and private receipts are core to the design."
                />
                <MetricCard
                    icon={TerminalSquare}
                    title="Server-first developer flow"
                    description="Merchants can integrate through backend routes, hosted checkout, SDK calls, nullpay.json manifests, and webhooks instead of piecing together low-level chain logic themselves."
                />
                <MetricCard
                    icon={Bot}
                    title="Agent ready"
                    description="NullPay MCP exposes invoice and payment actions to AI clients while keeping the private key local to the MCP process rather than in the model."
                />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                <GlassCard className="p-6">
                    <h3 className="mb-4 text-xl font-bold text-white">What ships in this repository</h3>
                    <div className="space-y-4 text-sm leading-relaxed text-gray-400">
                        <div className="flex items-start gap-3">
                            <Package className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
                            <p><span className="font-semibold text-white">@nullpay/node</span> for backend checkout session creation, session retrieval, and webhook verification.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <TerminalSquare className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
                            <p><span className="font-semibold text-white">@nullpay/cli</span> for onboarding merchants, generating salts, and writing <code className="rounded bg-white/5 px-1.5 py-0.5">nullpay.json</code>.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
                            <p><span className="font-semibold text-white">Hosted checkout + payment pages</span> for buyer-side payment completion and post-payment verification.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
                            <p><span className="font-semibold text-white">Burner and merchant wallet flows</span> for privacy-preserving settlement and optional identity separation.</p>
                        </div>
                    </div>
                </GlassCard>

                <Callout title="Mental model" tone="blue">
                    Think of NullPay as a merchant payment operating layer. The contract enforces invoice and payment rules, the
                    backend and SDK make integration usable for normal apps, the hosted checkout handles buyer UX, and MCP extends
                    the same system into conversational clients.
                </Callout>
            </div>
        </div>
    ),
};
