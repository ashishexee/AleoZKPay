import type { DocsSection } from '../types';
import { creditsSection } from './credits';
import { functionsSection } from './functions';
import { mappingsSection } from './mappings';
import { recordsSection } from './records';
import { usadSection } from './usad';
import { usdcxSection } from './usdcx';

export const smartContractSections: DocsSection[] = [
    recordsSection,
    mappingsSection,
    functionsSection,
    creditsSection,
    usdcxSection,
    usadSection,
];
