import type { DocsSection } from '../types';
import { nullpayJsonExample } from '../examples';
import { Callout, CodeBlock } from '../ui';

export const nullpayJsonSection: DocsSection = {
    id: 'sdk-nullpay-json',
    group: 'Config',
    label: 'nullpay.json',
    eyebrow: 'SDK',
    title: 'The role of nullpay.json',
    summary:
        'nullpay.json is the merchant manifest used for pre-generated invoices. It is optional, but it becomes very useful when you want named products, donation campaigns, or a stable backend-to-invoice mapping.',
    content: (
        <div className="space-y-6">
            <CodeBlock title="Example nullpay.json" language="json" code={nullpayJsonExample} />
            <Callout title="What the SDK reads" tone="blue">
                The SDK can load <code className="rounded bg-white/10 px-1.5 py-0.5">merchant</code>,
                <code className="rounded bg-white/10 px-1.5 py-0.5"> generated_at</code>, and each named invoice with its
                type, amount, currency, hash, and salt.
            </Callout>
        </div>
    ),
};
