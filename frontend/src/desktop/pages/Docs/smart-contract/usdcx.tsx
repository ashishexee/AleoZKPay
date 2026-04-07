import { GitBranch, Wallet } from 'lucide-react';
import type { DocsSection } from '../types';
import { MetricCard } from '../ui';

export const usdcxSection: DocsSection = {
    id: 'sc-usdcx',
    group: 'Token Support',
    label: 'USDCx',
    eyebrow: 'Token Support',
    title: 'USDCx payment path',
    summary:
        'USDCx follows the same invoice model but uses the stablecoin token program and carries the compliance record plus Merkle proofs required by the token contract.',
    content: (
        <div className="grid gap-5 md:grid-cols-2">
            <MetricCard
                icon={Wallet}
                title="Creation path"
                description="create_invoice_usdcx stores token_type 1 and converts the invoice amount into a u64 for record-level display consistency."
            />
            <MetricCard
                icon={GitBranch}
                title="Payment path"
                description="pay_invoice_usdcx and pay_donation_usdcx call test_usdcx_stablecoin.aleo::transfer_private and assert the invoice is either USDCx-only or ANY-token donation."
            />
        </div>
    ),
};
