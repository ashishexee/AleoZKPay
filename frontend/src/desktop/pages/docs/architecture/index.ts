import type { DocsSection } from '../types';
import { architectureDiagramSection } from './architecture-diagram';
import { checkoutLifecycleSection } from './checkout-lifecycle';
import { dataFlowsSection } from './data-flows';
import { architectureOverviewSection } from './overview';
import { trustBoundariesSection } from './trust-boundaries';
import { userflowSection } from './userflow';

export const architectureSections: DocsSection[] = [
    architectureDiagramSection,
    architectureOverviewSection,
    userflowSection,
    checkoutLifecycleSection,
    trustBoundariesSection,
    dataFlowsSection,
];
