import { Activity, Bot, Gift, GitBranch, Package, QrCode, Shield, Sparkles, Wallet } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, MetricCard } from '../ui';

export const featuresSection: DocsSection = {
    id: 'gs-features',
    group: 'Overview',
    label: 'Features',
    eyebrow: 'Features',
    title: 'Core product features',
    summary:
        'NullPay spans far beyond a single invoice contract. The codebase includes private payment primitives, multi-token support, merchant infrastructure, SDK and CLI tooling, hosted checkout, MCP integrations, Oracle price feeds, gift cards, batch payments, and merchant-facing operational features.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <MetricCard
                    icon={Shield}
                    title="Zero-Knowledge Invoices"
                    description="Merchant addresses and amounts are hashed on-chain using BHP256, preserving privacy. Only the invoice hash appears publicly; the actual commercial details stay off-chain or encrypted."
                />
                <MetricCard
                    icon={Wallet}
                    title="Credits, USDCx, and USAD"
                    description="Full support for three private token types with dedicated contract transitions. ANY-token donation support lets payers pick their preferred asset at checkout."
                />
                <MetricCard
                    icon={GitBranch}
                    title="Standard, Multipay, and Donation"
                    description="Single-settlement invoices for one-time payments, multi-contributor campaigns for crowdfunding, and open-ended donation flows where amount and token can be flexible."
                />
                <MetricCard
                    icon={Package}
                    title="Node &amp; Python SDKs"
                    description="Backend SDKs for Node.js and Python create hosted checkout sessions, retrieve sessions, verify webhooks, and read local invoice manifests so merchant apps stay server-first."
                />
                <MetricCard
                    icon={Sparkles}
                    title="CLI Onboarding Wizard"
                    description="Interactive onboarding handles invoice generation, salt creation, relayer-assisted setup, and writing nullpay.json so merchants don't hand-roll salts and manifest files."
                />
                <MetricCard
                    icon={Bot}
                    title="MCP Server for AI Clients"
                    description="NullPay MCP makes invoice creation, payment, and transaction inspection available in clients like Claude, Codex, OpenClaw, Cursor, and Antigravity."
                />
                <MetricCard
                    icon={Activity}
                    title="Oracle-Backed Conversions"
                    description="Pay invoices in any supported token regardless of the invoice's base currency. Signed quotes, verified on-chain by the smart contract, ensure price integrity."
                />
                <MetricCard
                    icon={QrCode}
                    title="Profile QR &amp; Payment Links"
                    description="Persistent payment links tied to merchant wallet. Shareable QR codes and copy-link buttons for fast buyer handoff without backend integration."
                />
                <MetricCard
                    icon={Gift}
                    title="Gift Cards &amp; Batch Payments"
                    description="On-chain gift card records with private ownership. Batch payment UIs for payroll, disbursements, and multi-recipient transfers from a single interface."
                />
            </div>

            <Callout title="Feature takeaway" tone="emerald">
                The biggest thing to understand is that NullPay is already opinionated about the whole merchant lifecycle:
                invoice definition, checkout session creation, buyer payment UX, backend fulfillment, realtime status, Oracle
                conversion integrity, and AI-assisted operations all share one underlying payment model backed by Aleo ZK proofs.
            </Callout>
        </div>
    ),
};
