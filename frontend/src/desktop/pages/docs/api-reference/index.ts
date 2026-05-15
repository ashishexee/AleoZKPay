import type { DocsSection } from '../types';
import { apiOverviewSection } from './overview';
import { invoicesApiSection } from './invoices-api';
import { checkoutApiSection } from './checkout-api';
import { dpsApiSection } from './dps-api';
import { oracleApiSection } from './oracle-api';
import { merchantsApiSection } from './merchants-api';

export const apiReferenceSections: DocsSection[] = [
    apiOverviewSection,
    invoicesApiSection,
    checkoutApiSection,
    dpsApiSection,
    oracleApiSection,
    merchantsApiSection,
];
