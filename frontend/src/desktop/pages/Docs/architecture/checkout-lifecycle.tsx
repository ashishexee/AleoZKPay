import type { DocsSection } from '../types';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

export const checkoutLifecycleSection: DocsSection = {
    id: 'arch-lifecycle',
    group: 'System',
    label: 'Checkout Lifecycle',
    eyebrow: 'Architecture',
    title: 'Checkout lifecycle',
    summary:
        'A standard merchant flow starts in the backend, passes through hosted checkout, executes on Aleo, and ends with either redirect-based verification or webhook-based fulfillment.',
    content: (
        <div className="space-y-5">
            <GlassCard className="p-6">
                <h3 className="mb-2 text-xl font-bold text-white">1. Merchant config</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                    The merchant backend installs the SDK, loads a secret key, and optionally reads named invoices from
                    nullpay.json.
                </p>
            </GlassCard>
            <GlassCard className="p-6">
                <h3 className="mb-2 text-xl font-bold text-white">2. Session creation</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                    The backend creates a checkout session using either direct amount and currency or a named invoice reference.
                </p>
            </GlassCard>
            <GlassCard className="p-6">
                <h3 className="mb-2 text-xl font-bold text-white">3. Payment execution</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                    The buyer completes hosted checkout, the appropriate token program runs privately, and receipts plus invoice
                    state are produced.
                </p>
            </GlassCard>
            <GlassCard className="p-6">
                <h3 className="mb-2 text-xl font-bold text-white">4. Fulfillment</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                    The merchant backend verifies the settled event through session retrieval or signed webhook handling, then
                    delivers the purchased product or access.
                </p>
            </GlassCard>
        </div>
    ),
};
