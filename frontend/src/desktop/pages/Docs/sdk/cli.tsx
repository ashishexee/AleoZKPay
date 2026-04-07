import { Package, Rocket, Sparkles } from 'lucide-react';
import type { DocsSection } from '../types';
import { installCliCommand } from '../examples';
import { CodeBlock, MetricCard } from '../ui';

export const cliSection: DocsSection = {
    id: 'sdk-cli',
    group: 'Packages',
    label: 'CLI',
    eyebrow: 'SDK',
    title: 'CLI onboarding for invoice setup',
    summary:
        'The CLI is the fastest way to prepare invoice definitions for a merchant project. It reduces manual salt generation and config writing, then leaves the backend ready to create sessions by invoice name.',
    content: (
        <div className="space-y-6">
            <CodeBlock title="Run CLI onboarding" language="bash" code={installCliCommand} />
            <div className="grid gap-5 md:grid-cols-3">
                <MetricCard
                    icon={Sparkles}
                    title="Generate invoice metadata"
                    description="The wizard prepares invoice names, invoice types, amounts, salts, and network-resolved hashes."
                />
                <MetricCard
                    icon={Package}
                    title="Write nullpay.json"
                    description="The resulting merchant manifest lands in the backend root and becomes addressable by invoice name."
                />
                <MetricCard
                    icon={Rocket}
                    title="Shorten backend code"
                    description="The backend can then create a session from nullpay_invoice_name instead of manually carrying every invoice field."
                />
            </div>
        </div>
    ),
};
