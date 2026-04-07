import type { DocsSection } from '../types';
import { antigravitySection } from './antigravity';
import { claudeSection } from './claude';
import { codexSection } from './codex';
import { cursorSection } from './cursor';
import { mcpOverviewSection } from './mcp-overview';
import { openclawSection } from './openclaw';

export const integrationSections: DocsSection[] = [
    mcpOverviewSection,
    openclawSection,
    claudeSection,
    codexSection,
    cursorSection,
    antigravitySection,
];
