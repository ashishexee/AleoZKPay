import type { DocsSection } from '../types';
import { installNodeCommand, nodeInitExample } from '../examples';
import { Callout, CodeBlock } from '../ui';

export const nodeSdkSection: DocsSection = {
    id: 'sdk-node',
    group: 'Packages',
    label: 'Node SDK',
    eyebrow: 'SDK',
    title: 'Node SDK for merchant backends',
    summary:
        'The Node SDK is the server-side integration point. It should sit in the backend that owns your secret key, session creation, verification, and webhook handling.',
    content: (
        <div className="space-y-6">
            <CodeBlock title="Install @nullpay/node" language="bash" code={installNodeCommand} />
            <CodeBlock title="Initialize the client" language="js" code={nodeInitExample} />
            <Callout title="Why server-side only" tone="orange">
                Keep <code className="rounded bg-white/10 px-1.5 py-0.5">NULLPAY_SECRET_KEY</code> in the backend only. The
                frontend should never instantiate the merchant SDK directly.
            </Callout>
        </div>
    ),
};
