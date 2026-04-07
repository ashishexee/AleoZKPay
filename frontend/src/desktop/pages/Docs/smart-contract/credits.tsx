import { GitBranch, Wallet } from 'lucide-react';
import type { DocsSection } from '../types';
import { MetricCard } from '../ui';

export const creditsSection: DocsSection = {
    id: 'sc-credits',
    group: 'Token Support',
    label: 'Credits',
    eyebrow: 'Token Support',
    title: 'Credits payment path',
    summary:
        'Credits uses the native Aleo credits program and the simplest payment path. It is the baseline reference for invoice creation, standard payments, and donation flows.',
    content: (
        <div className="grid gap-5 md:grid-cols-2">
            <MetricCard
                icon={Wallet}
                title="Creation path"
                description="create_invoice writes token_type 0 into InvoiceData and records the hash and salt mapping for credits-denominated flows."
            />
            <MetricCard
                icon={GitBranch}
                title="Payment path"
                description="pay_invoice and pay_donation call credits.aleo::transfer_private and create payer plus merchant receipts after invoice validation."
            />
        </div>
    ),
};
