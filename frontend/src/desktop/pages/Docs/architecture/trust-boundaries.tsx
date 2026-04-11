import { Shield, Lock, Zap, UserCheck, EyeOff, Globe } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

export const trustBoundariesSection: DocsSection = {
    id: 'arch-boundaries',
    group: 'System Architecture',
    label: 'Trust Boundaries',
    eyebrow: 'Architecture',
    title: 'Trust Boundaries — The Security Model',
    summary:
        'NullPay is built on a "Least Privilege" architecture. Each layer of the stack—from the local CLI to the on-chain contract—operates within a strictly defined boundary to minimize the blast radius of any potential compromise.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-3">
                <MetricCard
                    icon={Lock}
                    title="Key Isolation"
                    description="Private keys are kept in isolated environments: CLI locally, MCP in the tool process, and Relayer in HSMs."
                />
                <MetricCard
                    icon={EyeOff}
                    title="Zero Exposure"
                    description="The main merchant backend never sees the buyer's private wallet keys or seed phrases."
                />
                <MetricCard
                    icon={UserCheck}
                    title="Permissioned Ops"
                    description="On-chain actions like settling or creating invoices require cryptographic proof of ownership."
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-4 text-orange-400">
                        <Globe className="h-5 w-5" />
                        <h3 className="text-xl font-bold">The Public/Private Boundary</h3>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed mb-4">
                        While the Aleo blockchain is the ultimate source of truth, <b>99% of NullPay data is never stored publicly</b>. We use on-chain mappings only as "Commitment Anchors".
                    </p>
                    <ul className="space-y-2 text-xs text-gray-500">
                        <li className="flex items-center gap-2">
                            <div className="h-1 w-1 rounded-full bg-orange-500" />
                            <span>Public: Invoice Hash, Fulfillment Status, Expiry Height.</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <div className="h-1 w-1 rounded-full bg-emerald-500" />
                            <span>Private: Merchant Address, Salt, Payer Notes, Product Details.</span>
                        </li>
                    </ul>
                </GlassCard>

                <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-4 text-blue-400">
                        <Zap className="h-5 w-5" />
                        <h3 className="text-xl font-bold">Relayer Trust Model</h3>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed mb-4">
                        The relayer is a <b>semi-trusted</b> component. It sponsors gas for invoice creation but cannot deviate from the merchant's signed intent.
                    </p>
                    <div className="rounded-md bg-white/5 p-3 text-xs border border-white/10">
                        <p className="text-blue-300 font-mono italic">"The relayer can front the money for your transaction, but it cannot change where the payout goes."</p>
                    </div>
                </GlassCard>
            </div>

            <GlassCard className="p-6">
                <h3 className="text-xl font-bold text-white mb-6">Security Layer Breakdown</h3>
                <div className="space-y-4">
                    {[
                        {
                            layer: 'Merchant Backend',
                            trust: 'NULLPAY_SECRET_KEY',
                            scope: 'Responsible for creating checkout sessions and verifying webhooks. Must NEVER leak the secret key to the frontend client.',
                            status: 'High Trust'
                        },
                        {
                            layer: 'AI Assistant (MCP)',
                            trust: 'Main Wallet Key',
                            scope: 'The bridge between the user and the protocol. Operates as a local orchestrator. Never sends keys to the LLM/Model.',
                            status: 'Critical Trust'
                        },
                        {
                            layer: 'Burner Wallet',
                            trust: 'Ephemeral Key',
                            scope: 'Short-lived wallet used for individual checkouts. Limits losses in case of a device-level compromise.',
                            status: 'Low Trust'
                        },
                        {
                            layer: 'Smart Contract',
                            trust: 'Protocol Rules',
                            scope: 'Enforces the atomicity of payments and the immutability of invoice commitments.',
                            status: 'Trustless'
                        }
                    ].map((item, i) => (
                        <div key={i} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-white/[0.02] border border-white/[0.08]">
                            <div className="flex-1">
                                <h4 className="text-white font-bold text-sm mb-1">{item.layer}</h4>
                                <p className="text-xs text-gray-500 max-w-xl">{item.scope}</p>
                            </div>
                            <div className="flex items-center gap-3 text-right">
                                <div className="hidden md:block">
                                    <p className="text-[10px] text-gray-600 uppercase font-black">Credential</p>
                                    <code className="text-[10px] text-emerald-400">{item.trust}</code>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                    item.status === 'High Trust' ? 'bg-orange-500/20 text-orange-400' :
                                    item.status === 'Critical Trust' ? 'bg-red-500/20 text-red-400' :
                                    item.status === 'Trustless' ? 'bg-emerald-500/20 text-emerald-400' :
                                    'bg-blue-500/20 text-blue-400'
                                }`}>
                                    {item.status}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <Callout title="The Relayer Rule" tone="orange">
                Merchant secret keys belong in the backend only. The NullPay SDK is designed so that the client (buyer's browser) never receives merchant credentials or sees the original salt used for the invoice commitment.
            </Callout>
        </div>
    ),
};
