import type { DocsSection } from '../types';
import { quickOverviewSection } from './overview';
import { transitionReferenceSection } from './transitions';
import { apiCheatSheetSection } from './api-cheatsheet';
import { sdkQuickRefSection } from './sdk-quickref';
import { errorCodesSection } from './error-codes';

export const quickReferenceSections: DocsSection[] = [
    quickOverviewSection,
    transitionReferenceSection,
    apiCheatSheetSection,
    sdkQuickRefSection,
    errorCodesSection,
];
