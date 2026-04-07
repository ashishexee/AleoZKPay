import type { DocsSection } from '../types';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

export const dataFlowsSection: DocsSection = {
    id: 'arch-data-flows',
    group: 'Operations',
    label: 'Data Flows',
    eyebrow: 'Architecture',
    title: 'Main data flows in the product',
    summary:
        'Thinking in data planes helps when debugging: merchant config data, runtime checkout data, webhook event data, and agent interaction data all move through different paths.',
    content: (
        <div className="grid gap-5 lg:grid-cols-2">
            <GlassCard className="p-6">
                <h3 className="mb-3 text-xl font-bold text-white">Config plane</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                    nullpay.json, environment variables, MCP config files, and merchant dashboard settings define how the
                    runtime should behave before checkout starts.
                </p>
            </GlassCard>
            <GlassCard className="p-6">
                <h3 className="mb-3 text-xl font-bold text-white">Execution plane</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                    Checkout sessions, redirects, invoice hashes, and token-program transitions form the actual payment path.
                </p>
            </GlassCard>
            <GlassCard className="p-6">
                <h3 className="mb-3 text-xl font-bold text-white">Event plane</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                    Webhooks and session retrieval give the merchant backend an auditable settlement signal for fulfillment.
                </p>
            </GlassCard>
            <GlassCard className="p-6">
                <h3 className="mb-3 text-xl font-bold text-white">Agent plane</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                    MCP tool calls expose invoice and payment actions inside AI clients without collapsing the wallet boundary.
                </p>
            </GlassCard>
        </div>
    ),
};
