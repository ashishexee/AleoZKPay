import { GitBranch, Wallet } from 'lucide-react';
import type { DocsSection } from '../types';
import { MetricCard } from '../ui';

export const usadSection: DocsSection = {
    id: 'sc-usad',
    group: 'Token Support',
    label: 'USAD',
    eyebrow: 'Token Support',
    title: 'USAD payment path',
    summary:
        'USAD mirrors the USDCx design but targets the test USAD token program. The contract maintains a distinct token_type and proof path for settlement.',
    content: (
        <div className="grid gap-5 md:grid-cols-2">
            <MetricCard
                icon={Wallet}
                title="Creation path"
                description="create_invoice_usad stores token_type 2 and keeps the same invoice metadata layout used by the other token-specific creation functions."
            />
            <MetricCard
                icon={GitBranch}
                title="Payment path"
                description="pay_invoice_usad and pay_donation_usad execute through test_usad_stablecoin.aleo::transfer_private and only allow open, unexpired invoices."
            />
        </div>
    ),
};
