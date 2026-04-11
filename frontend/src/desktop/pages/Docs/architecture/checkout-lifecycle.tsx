import { ShoppingCart, Settings, ShieldCheck, Truck, RefreshCw, Zap } from 'lucide-react';
import type { DocsSection } from '../types';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';
import { Callout, MetricCard } from '../ui';

export const checkoutLifecycleSection: DocsSection = {
    id: 'arch-lifecycle',
    group: 'System Architecture',
    label: 'Checkout Lifecycle',
    eyebrow: 'Architecture',
    title: 'The Checkout State Machine',
    summary:
        'A checkout in NullPay is a stateful journey. From the initial merchant handshake to the final on-chain settlement, every step is designed to preserve privacy while ensuring deterministic fulfillment.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Settings}
                    title="Initiation"
                    description="Merchant backend requests a session. The protocol commits to a specific price and currency."
                />
                <MetricCard
                    icon={ShoppingCart}
                    title="User Interaction"
                    description="Buyer selects tokens and generates ZK proofs in the Hosted Checkout UI."
                />
                <MetricCard
                    icon={ShieldCheck}
                    title="Settlement"
                    description="The Aleo network verifies the proof and moves funds privately to the merchant's pool."
                />
                <MetricCard
                    icon={Truck}
                    title="Fulfillment"
                    description="Merchant receives a signed webhook and grants access or ships the product."
                />
            </div>

            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-blue-500/50 before:to-transparent">
                {[
                    {
                        title: '1. Intent Generation',
                        icon: Settings,
                        color: 'text-orange-400',
                        desc: 'The merchant backend calls sessions.create(). If using a named invoice, the hash is pulled from the local manifest. If dynamic, the SDK generates a new salt and calls the Global Relayer to commit the hash on-chain.'
                    },
                    {
                        title: '2. Hosted UI Handoff',
                        icon: ShoppingCart,
                        color: 'text-blue-400',
                        desc: 'The buyer is redirected to https://nullpay.app/pay/{SESSION_ID}. Here, the NullPay client retrieves the invoice details from the Aleo mapping to show the price and currency to the buyer.'
                    },
                    {
                        title: '3. ZK Proof Generation',
                        icon: Zap,
                        color: 'text-yellow-400',
                        desc: 'The buyer approves the transaction. The NullPay wallet (or burner) generates a Zero-Knowledge proof locally. This proof hides the buyer\'s balance but proves they have enough funds to cover the invoice.'
                    },
                    {
                        title: '4. Chain Commitment',
                        icon: ShieldCheck,
                        color: 'text-emerald-400',
                        desc: 'The transaction is broadcast to the Aleo network. Once the block is finalized, the invoices mapping for that specific hash is updated from "Open" to "Settled" (for one-time invoices).'
                    },
                    {
                        title: '5. Webhook & Fulfillment',
                        icon: RefreshCw,
                        color: 'text-purple-400',
                        desc: 'The NullPay indexers detect the mapping change. A signed HMAC-SHA256 webhook is sent to the merchant\'s backend. The merchant verifies the signature and completes the order.'
                    }
                ].map((step, i) => (
                    <div key={i} className="relative pl-12">
                        <div className="absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-black border border-white/10 shadow-xl group-hover:border-blue-500/50 transition-colors">
                            <step.icon className={`h-5 w-5 ${step.color}`} />
                        </div>
                        <GlassCard className="p-5">
                            <h4 className="text-white font-bold text-lg mb-2">{step.title}</h4>
                            <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
                        </GlassCard>
                    </div>
                ))}
            </div>

            <Callout title="Relayer Flow in Full Depth" tone="blue">
                When a dynamic session is created, the relayer perform a "Sponsored Mint". It pays the gas fees to call <code className="text-white/80">create_invoice</code> on-chain. This ensures that the merchant experience is fast and "crypto-native" without requiring the merchant to manage gas for every single checkout request.
            </Callout>

            <GlassCard className="p-6 border-emerald-500/20 bg-emerald-500/5">
                <h3 className="text-xl font-bold text-white mb-4">Finality & Timing</h3>
                <div className="grid gap-4 md:grid-cols-3 text-xs text-gray-400">
                    <div className="space-y-1">
                        <p className="font-bold text-white uppercase">Step 1-2 (Latency)</p>
                        <p>~200ms for session creation. Instant handoff to UI.</p>
                    </div>
                    <div className="space-y-1">
                        <p className="font-bold text-white uppercase">Step 3 (ZK Generation)</p>
                        <p>5s - 15s depending on device CPU (Mobile vs Desktop).</p>
                    </div>
                    <div className="space-y-1">
                        <p className="font-bold text-white uppercase">Step 4-5 (Confirmation)</p>
                        <p>~10s for Aleo block finality. Webhook fired within 2s of block.</p>
                    </div>
                </div>
            </GlassCard>
        </div>
    ),
};
