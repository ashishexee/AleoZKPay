import type { DocsSection } from '../types';
import { backendExampleSection } from './backend-example';
import { cliSection } from './cli';
import { nodeSdkSection } from './node-sdk';
import { nullpayJsonSection } from './nullpay-json';
import { webhooksSection } from './webhooks';

export const sdkSections: DocsSection[] = [
    nodeSdkSection,
    cliSection,
    nullpayJsonSection,
    backendExampleSection,
    webhooksSection,
];
