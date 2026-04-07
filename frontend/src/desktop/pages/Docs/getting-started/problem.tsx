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
        'Moving value is easy to describe and hard to productize well. NullPay is solving for privacy leakage, poor merchant ergonomics, broken checkout-to-fulfillment workflows, and the new challenge of letting AI clients participate in payment operations safely.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 lg:grid-cols-2">
                <GlassCard className="p-6">
                    <h3 className="mb-3 text-xl font-bold text-white">1. Public chain leakage is bad for normal commerce</h3>
                    <p className="text-sm leading-relaxed text-gray-400">
                        In a naive on-chain payment system, invoice amounts, merchant patterns, and repeat buyer behavior can
                        become legible to anyone watching. That is a poor default for subscriptions, donations, services, and
                        merchant revenue operations.
                    </p>
                </GlassCard>
                <GlassCard className="p-6">
                    <h3 className="mb-3 text-xl font-bold text-white">2. Most teams do not want to become ZK payment experts</h3>
                    <p className="text-sm leading-relaxed text-gray-400">
                        Merchants usually want a reliable backend integration, not a crash course in salt generation, hash
                        derivation, relayer design, or record handling. NullPay packages those concerns into developer tooling.
                    </p>
                </GlassCard>
                <GlassCard className="p-6">
                    <h3 className="mb-3 text-xl font-bold text-white">3. Checkout is only half the problem</h3>
                    <p className="text-sm leading-relaxed text-gray-400">
                        Real merchant systems need a complete loop: create invoice, redirect customer, confirm settlement,
                        verify signatures, and fulfill safely. NullPay treats backend verification and webhooks as first-class.
                    </p>
                </GlassCard>
                <GlassCard className="p-6">
                    <h3 className="mb-3 text-xl font-bold text-white">4. AI-native apps need a clean trust boundary</h3>
                    <p className="text-sm leading-relaxed text-gray-400">
                        AI clients are useful for payment operations, but they should not directly own raw wallet secrets.
                        NullPay MCP creates a safer local boundary where the client can trigger actions while the private key
                        stays in the MCP process.
                    </p>
                </GlassCard>
            </div>

            <Callout title="Why this matters" tone="orange">
                NullPay is trying to give developers something close to a modern payment platform experience, but for private
                payments on Aleo: cleaner integration, less operational glue code, and much better privacy defaults than a
                normal transparent chain flow.
            </Callout>
        </div>
    ),
};
