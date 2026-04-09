import type { DocsSection } from '../types';
import { featuresSection } from './features';
import { gettingStartedSection } from './getting-started';
import { overviewSection } from './overview';
import { problemSection } from './problem';
import { walletsSection } from './wallets';
import { invoiceTypesSection } from './invoice-types';
import { checkoutLifecycleSection } from './checkout-lifecycle';
import { cliOnboardingSection } from './cli-onboarding';
import { mcpIntegrationSection } from './mcp-integration';
import { platformFeaturesSection } from './platform-features';
import { securityBoundariesSection } from './security';

export const gettingStartedSections: DocsSection[] = [
    overviewSection,
    problemSection,
    featuresSection,
    walletsSection,
    invoiceTypesSection,
    checkoutLifecycleSection,
    gettingStartedSection,
    cliOnboardingSection,
    mcpIntegrationSection,
    platformFeaturesSection,
    securityBoundariesSection,
];
