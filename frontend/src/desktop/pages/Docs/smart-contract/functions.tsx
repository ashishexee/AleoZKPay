import type { DocsSection } from '../types';
import { contractFunctionSummary } from '../examples';
import { Callout, CodeBlock } from '../ui';

export const functionsSection: DocsSection = {
    id: 'sc-functions',
    group: 'Contract Layout',
    label: 'Functions',
    eyebrow: 'Smart Contract',
    title: 'Function groups in main.leo',
    summary:
        'The core Leo program is organized around invoice creation, payments, settlement, and batch-credit experiments, while wallet helpers live in the separate wallets program.',
    content: (
        <div className="space-y-6">
            <Callout title="Program name" tone="blue">
                The current core contract file defines <code className="rounded bg-white/10 px-1.5 py-0.5">zk_pay_proofs_privacy_v27.aleo</code>.
                Wallet artifacts now live in <code className="rounded bg-white/10 px-1.5 py-0.5">zk_pay_proofs_privacy_wallet_v3.aleo</code>.
            </Callout>
            <CodeBlock title="Transition summary" language="text" code={contractFunctionSummary} />
        </div>
    ),
};
