import type { DocsSection } from '../types';
import { Callout, DiagramFigure } from '../ui';

export const architectureDiagramSection: DocsSection = {
    id: 'architecture-diagram',
    group: 'System Architecture',
    label: 'Architecture Diagram',
    eyebrow: 'Architecture',
    title: 'NullPay System Architecture Diagram',
    summary:
        'A visual map of the NullPay stack showing how the frontend, backend, integrations, and on-chain protocol layers fit together.',
    content: (
        <div className="space-y-6">
            <DiagramFigure
                src="/assets/NullPay System Design.svg"
                alt="NullPay system architecture diagram"
                caption="This diagram gives a single-view layout of the main NullPay components and how requests move between user interfaces, backend orchestration, integrations, and Aleo settlement."
            />

            <Callout title="Reading the Diagram" tone="blue">
                Use this view as the high-level reference before diving into the architecture overview, trust boundaries, or detailed data-flow sections.
            </Callout>
        </div>
    ),
};
