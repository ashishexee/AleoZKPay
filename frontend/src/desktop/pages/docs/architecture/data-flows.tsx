import { Database, Zap, Activity, Bot, ArrowRight } from 'lucide-react';
import type { DocsSection } from '../types';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';
import { Callout } from '../ui';

export const dataFlowsSection: DocsSection = {
    id: 'arch-data-flows',
    group: 'Operations',
    label: 'Data Flows',
    eyebrow: 'Architecture',
    title: 'System Planes — The Protocol Highway',
    summary:
        'NullPay architecture is divided into four distinct "Planes". Each plane handles a specific type of data with its own latency, security, and persistence requirements.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 lg:grid-cols-2">
                <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-4 text-orange-400">
                        <Database className="h-5 w-5" />
                        <h3 className="text-xl font-bold">The Config Plane</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-400">
                        Defines the environment and business rules <b>before</b> any transaction occurs. This includes the <code className="text-white/80">nullpay.json</code> manifest, merchant dashboard settings, and environment variables like <code className="text-white/80">NULLPAY_SECRET_KEY</code>.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-600 font-mono">
                        <span>STATIC</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>MERCHANT OWNED</span>
                    </div>
                </GlassCard>

                <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-4 text-blue-400">
                        <Zap className="h-5 w-5" />
                        <h3 className="text-xl font-bold">The Execution Plane</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-400">
                        The real-time path of a transaction. Includes the creation of Checkout Sessions via the SDK, redirecting the buyer to the Hosted UI, and the generation of ZK proofs on the client side.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-600 font-mono">
                        <span>EPHEMERAL</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>BUYER INITIATED</span>
                    </div>
                </GlassCard>

                <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-4 text-emerald-400">
                        <Activity className="h-5 w-5" />
                        <h3 className="text-xl font-bold">The Event Plane</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-400">
                        The asynchronous feedback loop. Webhook notifications and polling services monitor the Aleo ledger for "Settled" events and trigger fulfillment logic in the merchant's backend.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-600 font-mono">
                        <span>ASYNC</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>PROTOCOL PROXY</span>
                    </div>
                </GlassCard>

                <GlassCard className="p-6">
                    <div className="flex items-center gap-3 mb-4 text-purple-400">
                        <Bot className="h-5 w-5" />
                        <h3 className="text-xl font-bold">The Agent Plane</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-400">
                        The integration bridge for AI assistants. MCP (Model Context Protocol) tool calls allow AI agents to view invoice history and initiate payments without ever having access to the user's private keys.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-600 font-mono">
                        <span>SECURE PROXY</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>LOCAL MACHINE</span>
                    </div>
                </GlassCard>
            </div>

            <GlassCard className="p-6">
                <h3 className="text-xl font-bold text-white mb-6">Cross-Plane Synchronization</h3>
                <div className="relative border-l-2 border-white/10 ml-4 py-2 space-y-8">
                    {[
                        { plane: 'Config', action: 'Merchant runs CLI onboard', result: 'Invoice hash committed to mapping & nullpay.json.' },
                        { plane: 'Execution', action: 'SDK calls sessions.create()', result: 'Relayer verifies hash in mapping and returns UI URL.' },
                        { plane: 'Contract', action: 'Buyer submits pay_invoice', result: 'Ledger state updates to "Settled" (0 -> 1).' },
                        { plane: 'Event', action: 'Webhook hits backend', result: 'Order fulfilled using the validated session_id.' }
                    ].map((step, i) => (
                        <div key={i} className="relative pl-8">
                            <div className="absolute left-[-9px] top-1 h-4 w-4 rounded-full bg-black border-2 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                            <div>
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{step.plane} Plane</span>
                                <h4 className="text-sm font-bold text-white mt-1">{step.action}</h4>
                                <p className="text-xs text-gray-500 mt-1">{step.result}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <Callout title="Data Privacy" tone="blue">
                Crucially, the <b>private keys</b> never leave the local environment in any plane. The Execution plane only sends signed transactions (or intents) to the relayer, ensuring the protocol remains trustless at every step of the data highway.
            </Callout>
        </div>
    ),
};
