import { Network, Shield } from 'lucide-react';
import type { DocsSection } from '../types';
import { webhookExample } from '../examples';
import { CodeBlock, MetricCard } from '../ui';

export const webhooksSection: DocsSection = {
    id: 'sdk-webhooks',
    group: 'Runtime',
    label: 'Webhooks',
    eyebrow: 'SDK',
    title: 'Webhook verification and fulfillment',
    summary:
        'Settlement can be verified either by explicitly retrieving the session after redirect or by verifying the webhook signature and fulfilling server-side.',
    content: (
        <div className="space-y-6">
            <CodeBlock title="Webhook verification example" language="js" code={webhookExample} />
            <div className="grid gap-5 md:grid-cols-2">
                <MetricCard
                    icon={Shield}
                    title="Verify before fulfillment"
                    description="Always treat the webhook as a signed event, not a blind trust signal. Verify the signature and confirm the event status before delivering value."
                />
                <MetricCard
                    icon={Network}
                    title="Use it with hosted checkout"
                    description="The webhook path fits naturally with hosted checkout because your backend receives the settled event even if the buyer never returns to the browser success page."
                />
            </div>
        </div>
    ),
};
