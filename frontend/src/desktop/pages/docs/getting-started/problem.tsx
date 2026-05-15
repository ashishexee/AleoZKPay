import type { DocsSection } from '../types';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';
import { Callout } from '../ui';

export const problemSection: DocsSection = {
    id: 'gs-problem',
    group: 'Overview',
    label: 'Problem',
    eyebrow: 'Problem',
    title: 'What NullPay is trying to fix',
    summary:
        'Moving value is easy to describe and hard to productize well. NullPay is solving for privacy leakage in payments, poor merchant ergonomics on ZK chains, broken checkout-to-fulfillment workflows, and the emerging challenge of letting AI clients participate in payment operations safely.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 lg:grid-cols-2">
                <GlassCard className="p-6">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-orange-500/10">
                        <span className="text-lg font-black text-orange-400">1</span>
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-white">Public chain leakage is bad for normal commerce</h3>
                    <p className="text-sm leading-relaxed text-gray-400">
                        In a naive on-chain payment system, invoice amounts, merchant revenue patterns, and repeat buyer behavior can
                        become legible to anyone watching the ledger. Competitors can analyze merchant volume. Customers' payment
                        histories become public record. This is a poor default for subscriptions, donations, services, and
                        merchant revenue operations that require commercial confidentiality.
                    </p>
                </GlassCard>
                <GlassCard className="p-6">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-orange-500/10">
                        <span className="text-lg font-black text-orange-400">2</span>
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-white">Most teams do not want to become ZK payment experts</h3>
                    <p className="text-sm leading-relaxed text-gray-400">
                        Merchants usually want a reliable backend integration — not a crash course in salt generation, BHP256 hash
                        derivation, relayer design, or private record handling. The gap between "I want to accept payments" and
                        "I understand Aleo's cryptographic primitives" is enormous. NullPay packages those concerns into developer
                        tooling so merchants focus on their product, not on ZK proof construction.
                    </p>
                </GlassCard>
                <GlassCard className="p-6">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-orange-500/10">
                        <span className="text-lg font-black text-orange-400">3</span>
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-white">Checkout is only half the problem</h3>
                    <p className="text-sm leading-relaxed text-gray-400">
                        Real merchant systems need a complete loop: create invoice, redirect customer, confirm settlement,
                        verify webhook signatures, correlate payment to order, and fulfill safely. Most crypto payment tools
                        stop at "here's a transaction hash, good luck." NullPay treats backend verification, webhook delivery,
                        and fulfillment state as first-class concerns — not afterthoughts.
                    </p>
                </GlassCard>
                <GlassCard className="p-6">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-orange-500/10">
                        <span className="text-lg font-black text-orange-400">4</span>
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-white">AI-native apps need a clean trust boundary for payments</h3>
                    <p className="text-sm leading-relaxed text-gray-400">
                        AI clients are useful for payment operations — creating invoices, checking payment status, managing
                        merchant accounts — but they should not directly own raw wallet secrets. Sending your Aleo private key
                        in a chat prompt is a catastrophic security practice. NullPay MCP creates a safer local boundary where
                        the client can trigger payment actions while the private key stays strictly in the MCP process.
                    </p>
                </GlassCard>
            </div>

            <Callout title="Why this matters" tone="orange">
                NullPay is trying to give developers something close to a modern payment platform experience (like Stripe or
                Lemon Squeezy), but for private payments on Aleo: cleaner integration, less operational glue code, much
                better privacy defaults than a normal transparent chain flow, and built-in support for the AI-operated
                future of commerce.
            </Callout>
        </div>
    ),
};
