import { Blocks, Bot, FileCode2, Package, Rocket } from 'lucide-react';
import type { DocsTab } from './types';

export const docsTabs: DocsTab[] = [
    {
        id: 'getting-started',
        label: 'Getting Started',
        icon: Rocket,
        blurb: 'What NullPay is, what problem it solves, and how to get live quickly.',
    },
    {
        id: 'smart-contract',
        label: 'Smart Contract',
        icon: FileCode2,
        blurb: 'Records, mappings, token-specific payment paths, and transition groups from the Leo contract.',
    },
    {
        id: 'sdk',
        label: 'SDK',
        icon: Package,
        blurb: 'Node SDK, CLI, nullpay.json, and the testing-website backend integration flow.',
    },
    {
        id: 'integrations',
        label: 'Integrations',
        icon: Bot,
        blurb: 'MCP setup plus client-specific notes for OpenClaw, Claude, Codex, Cursor, and Antigravity.',
    },
    {
        id: 'architecture',
        label: 'Architecture',
        icon: Blocks,
        blurb: 'How the UI, backend, relayer, MCP, and Aleo contract fit together.',
    },
];
