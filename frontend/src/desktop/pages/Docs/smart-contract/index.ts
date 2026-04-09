import type { DocsSection } from '../types';
import { programOverviewSection } from './program-overview';
import { structsSection } from './structs';
import { recordsSection } from './records';
import { mappingsSection } from './mappings';
import { cryptographySection } from './cryptography';
import { creationFunctionsSection } from './creation-functions';
import { paymentFunctionsSection } from './payment-functions';
import { settlementFunctionsSection } from './settlement-functions';
import { functionsSection } from './functions';
import { creditsSection } from './credits';
import { usdcxSection } from './usdcx';
import { usadSection } from './usad';

export const smartContractSections: DocsSection[] = [
    programOverviewSection,
    structsSection,
    recordsSection,
    mappingsSection,
    cryptographySection,
    creationFunctionsSection,
    paymentFunctionsSection,
    settlementFunctionsSection,
    functionsSection,
    creditsSection,
    usdcxSection,
    usadSection,
];
