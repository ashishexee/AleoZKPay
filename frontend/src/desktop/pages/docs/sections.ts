import type { DocsSection, DocsTabId } from './types';
import { architectureSections } from './architecture';
import { gettingStartedSections } from './getting-started';
import { integrationSections } from './integrations';
import { sdkSections } from './sdk';
import { smartContractSections } from './smart-contract';
import { apiReferenceSections } from './api-reference';
import { quickReferenceSections } from './quick-reference';

export const sectionContentByTab: Record<DocsTabId, DocsSection[]> = {
    'getting-started': gettingStartedSections,
    'smart-contract': smartContractSections,
    sdk: sdkSections,
    'api-reference': apiReferenceSections,
    integrations: integrationSections,
    architecture: architectureSections,
    'quick-reference': quickReferenceSections,
};
