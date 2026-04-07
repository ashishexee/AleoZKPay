import { Bot, FileCode2, Layers3, Package } from 'lucide-react';
import type { DocsSection } from '../types';
import { MetricCard } from '../ui';

export const architectureOverviewSection: DocsSection = {
    id: 'arch-overview',
    group: 'System',
    label: 'Overview',
    eyebrow: 'Architecture',
    title: 'System overview',
    summary:
        'NullPay is a layered system: product surfaces drive checkout creation, the backend owns merchant auth, the relayer and MCP package support automation, and the contract enforces invoice and payment rules on Aleo.',
    content: (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
                icon={Layers3}
                title="UI layer"
                description="Hosted checkout, merchant console, and docs live in the frontend and focus on user interaction plus display."
            />
            <MetricCard
                icon={Package}
                title="Backend layer"
                description="Merchant servers use @nullpay/node to create sessions, verify signatures, and map named invoices to checkout flows."
            />
            <MetricCard
                icon={Bot}
                title="Agent layer"
                description="The MCP server exposes NullPay actions to AI clients while keeping wallet secrets local to the client machine."
            />
            <MetricCard
                icon={FileCode2}
                title="Chain layer"
                description="The Leo contract enforces invoice status, token routing, donation behavior, and receipt creation."
            />
        </div>
    ),
};
