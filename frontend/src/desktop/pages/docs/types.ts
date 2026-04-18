import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type DocsTabId =
    | 'getting-started'
    | 'smart-contract'
    | 'sdk'
    | 'integrations'
    | 'architecture';

export type DocsTab = {
    id: DocsTabId;
    label: string;
    icon: LucideIcon;
    blurb: string;
};

export type DocsSection = {
    id: string;
    group: string;
    label: string;
    eyebrow: string;
    title: string;
    summary: string;
    content: ReactNode;
};
