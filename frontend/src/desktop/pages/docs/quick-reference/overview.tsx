import { Zap, BookOpen, Target, Clock } from 'lucide-react';
import type { DocsSection } from '../types';
import { MetricCard, Callout } from '../ui';

export const quickOverviewSection: DocsSection = {
    id: 'qr-overview',
    group: 'Overview',
    label: 'Quick Reference',
    eyebrow: 'Quick Reference',
    title: 'NullPay Cheat Sheet',
    summary: 'One-page reference for the most critical NullPay facts: contract addresses, token types, transition names, API endpoints, SDK methods, and status codes. Designed for quick lookup during development.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard icon={Zap} title="2 Contracts" description="zk_pay v29 (core) + wallet v6 (oracle/cards) on Aleo Testnet" />
                <MetricCard icon={BookOpen} title="3 Tokens" description="CREDITS (native), USDCx (stablecoin), USAD (stablecoin)" />
                <MetricCard icon={Target} title="12+ Transitions" description="Invoice creation, payment, settlement, cross-token oracle payments" />
                <MetricCard icon={Clock} title="~10s Block" description="Aleo Testnet block time. 360 blocks = ~1 hour expiry" />
            </div>

            <Callout title="How to use this reference" tone="blue">
                This page is optimized for Ctrl+F search. Every table is self-contained. Use the sidebar to jump between 
                contract transitions, API endpoints, SDK methods, and error codes. Each entry includes the exact name, 
                parameters, and return types you need for implementation.
            </Callout>
        </div>
    ),
};
