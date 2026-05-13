import type { DocsSection } from '../types';
import { nodeSdkSection } from './node-sdk';
import { pythonSdkSection } from './python-sdk';
import { invoiceHelpersSection } from './invoice-helpers';
import { checkoutSessionsSection } from './checkout-sessions';
import { webhooksSection } from './webhooks';
import { nullpayJsonSection } from './nullpay-json';
import { cliSection } from './cli';
import { backendExampleSection } from './backend-example';

export const sdkSections: DocsSection[] = [
    nodeSdkSection,
    pythonSdkSection,
    invoiceHelpersSection,
    checkoutSessionsSection,
    webhooksSection,
    nullpayJsonSection,
    cliSection,
    backendExampleSection,
];
