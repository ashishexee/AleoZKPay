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
        'The Leo program is organized around four concerns: invoice creation, payments, settlement or reads, and auxiliary wallet or profile helpers.',
    content: (
        <div className="space-y-6">
            <Callout title="Program name" tone="blue">
                The current contract file defines <code className="rounded bg-white/10 px-1.5 py-0.5">zk_pay_proofs_privacy_v24.aleo</code>
                and imports token programs for Credits, test USDCx, and test USAD.
            </Callout>
            <CodeBlock title="Transition summary" language="text" code={contractFunctionSummary} />
        </div>
    ),
};
