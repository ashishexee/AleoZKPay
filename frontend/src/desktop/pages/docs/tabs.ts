import { Blocks, BookOpen, Bot, FileCode2, Globe, Package, Rocket } from 'lucide-react';
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
        blurb: 'Records, mappings, token-specific payment paths, Oracle conversion, and transition groups from the Leo contract.',
    },
    {
        id: 'sdk',
        label: 'SDK',
        icon: Package,
        blurb: 'Node.js SDK, Python SDK, CLI, nullpay.json, checkout sessions, webhooks, and the testing-website integration flow.',
    },
    {
        id: 'api-reference',
        label: 'API Reference',
        icon: Globe,
        blurb: 'Complete backend REST API reference: invoices, checkout, DPS, Oracle, merchants, users, MCP, and scanner endpoints.',
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
        blurb: 'How the UI, backend, relayer, MCP, smart contracts, and Aleo network fit together.',
    },
    {
        id: 'quick-reference',
        label: 'Quick Ref',
        icon: BookOpen,
        blurb: 'Dense cheat sheets: transitions, API endpoints, SDK methods, and error codes for rapid lookup.',
    },
];
