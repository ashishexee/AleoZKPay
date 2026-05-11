import type { DocsSection } from '../types';
import { Callout, DiagramFigure } from '../ui';

export const userflowSection: DocsSection = {
    id: 'userflow',
    group: 'Operations',
    label: 'User Flow',
    eyebrow: 'User Journey',
    title: 'NullPay User Flow Diagram',
    summary:
        'The end-to-end buyer and merchant flow from invoice creation through checkout, settlement, and confirmation.',
    content: (
        <div className="space-y-6">
            <DiagramFigure
                src="/assets/userflow nullpay.svg"
                alt="NullPay user flow diagram"
                caption="This flow shows how a payment moves through the product from merchant setup to buyer interaction, proof-backed payment execution, and final settlement visibility."
            />

            <Callout title="When to Use This" tone="emerald">
                This page is the fastest way to understand the practical product journey without reading each implementation-focused section individually.
            </Callout>
        </div>
    ),
};
