import type { DocsSection, DocsTabId } from './types';
import { architectureSections } from './architecture';
import { gettingStartedSections } from './getting-started';
import { integrationSections } from './integrations';
import { sdkSections } from './sdk';
import { smartContractSections } from './smart-contract';

export const sectionContentByTab: Record<DocsTabId, DocsSection[]> = {
    'getting-started': gettingStartedSections,
    'smart-contract': smartContractSections,
    sdk: sdkSections,
    integrations: integrationSections,
    architecture: architectureSections,
};
