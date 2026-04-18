import type { DocsSection } from '../types';
import { checkoutLifecycleSection } from './checkout-lifecycle';
import { dataFlowsSection } from './data-flows';
import { architectureOverviewSection } from './overview';
import { trustBoundariesSection } from './trust-boundaries';

export const architectureSections: DocsSection[] = [
    architectureOverviewSection,
    checkoutLifecycleSection,
    trustBoundariesSection,
    dataFlowsSection,
];
