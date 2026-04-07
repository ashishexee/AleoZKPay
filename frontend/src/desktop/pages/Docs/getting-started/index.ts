import type { DocsSection } from '../types';
import { featuresSection } from './features';
import { gettingStartedSection } from './getting-started';
import { overviewSection } from './overview';
import { problemSection } from './problem';

export const gettingStartedSections: DocsSection[] = [
    overviewSection,
    featuresSection,
    problemSection,
    gettingStartedSection,
];
