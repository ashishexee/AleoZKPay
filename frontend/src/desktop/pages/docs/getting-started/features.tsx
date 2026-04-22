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
        'NullPay already spans far beyond a single invoice contract. The codebase includes private payment primitives, merchant infrastructure, SDK and CLI tooling, hosted checkout, MCP integrations, and merchant-facing operational features.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <MetricCard
                    icon={Shield}
                    title="Private checkout sessions"
                    description="Hosted checkout gives merchants a clean buyer flow while the underlying settlement path still relies on private transfer logic and contract-backed invoice validation."
                />
                <MetricCard
                    icon={Wallet}
                    title="Credits, USDCx, and USAD"
                    description="The smart contract contains separate token-aware invoice creation and payment paths for the supported private assets, plus ANY-token donation support."
                />
                <MetricCard
                    icon={GitBranch}
                    title="Standard, multipay, and donation flows"
                    description="NullPay supports single-settlement invoices, campaign-style multi-contributor payments, and donation flows where amount and token can be flexible."
                />
                <MetricCard
                    icon={Package}
                    title="Node SDK"
                    description="The backend SDK creates hosted checkout sessions, retrieves sessions, verifies webhooks, and reads local invoice manifests so merchant apps stay server-first."
                />
                <MetricCard
                    icon={Sparkles}
                    title="CLI onboarding"
                    description="The CLI handles onboarding, invoice generation, relayer-assisted setup, and writing nullpay.json so merchants do not need to hand-roll salts and manifest files."
                />
                <MetricCard
                    icon={Bot}
                    title="MCP integrations"
                    description="NullPay MCP makes invoice creation, payment, and transaction inspection available in clients like Claude, Codex, OpenClaw, and other MCP-capable tools."
                />
                <MetricCard
                    icon={Activity}
                    title="Realtime merchant monitoring"
                    description="The platform includes merchant dashboards, status tracking, and live payment feedback so operators can follow settlement without writing a custom monitor."
                />
                <MetricCard
                    icon={QrCode}
                    title="Profile QR and payment links"
                    description="The product includes payment-link and QR-driven flows for easier buyer handoff, especially for donation and recurring merchant scenarios."
                />
                <MetricCard
                    icon={Gift}
                    title="Extended payment infrastructure"
                    description="Gift cards, burner wallet support, and receipt-centric verification push the system beyond a narrow checkout-only implementation."
                />
            </div>

            <Callout title="Feature takeaway" tone="emerald">
                The biggest thing to understand is that NullPay is already opinionated about the whole merchant lifecycle:
                invoice definition, checkout session creation, buyer payment UX, backend fulfillment, realtime status, and
                AI-assisted operations all share one underlying payment model.
            </Callout>
        </div>
    ),
};
