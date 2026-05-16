import { Globe, Shield, Key, Server, Terminal } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';

const backendBaseExample = `// NullPay Backend API
// Base URL: https://api.nullpay.xyz
// All endpoints return JSON. Auth via secret key or wallet address.

// Authentication methods:
// 1. Merchant routes: Bearer token (sk_test_... or sk_live_...)
// 2. User routes: wallet address verification
// 3. MCP routes: wallet credentials in request body
// 4. Public routes: no auth required`;

const commonResponseExample = `// Standard success response
{ "id": "cs_abc123", "status": "PENDING", "checkout_url": "..." }

// Standard error response
{ "error": "Invalid signature", "detail": "HMAC verification failed" }

// HTTP Status codes:
// 200: Success
// 201: Created
// 400: Bad Request (invalid input)
// 401: Unauthorized (missing/invalid auth)
// 404: Not Found
// 500: Internal Server Error`;

export const apiOverviewSection: DocsSection = {
    id: 'api-overview',
    group: 'Overview',
    label: 'API Overview',
    eyebrow: 'API Reference',
    title: 'Backend API Reference',
    summary: 'Complete reference for the NullPay backend REST API. Covers all endpoints across invoices, checkout, DPS (Delegated Proving Service), Oracle conversion, merchants, users, MCP, and scanner proxies.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-5">
                <MetricCard icon={Key} title="Invoices" description="Create, retrieve, update, and delete invoices. List by merchant or fetch recent." />
                <MetricCard icon={Globe} title="Checkout" description="Create hosted checkout sessions, retrieve session status, update session metadata." />
                <MetricCard icon={Shield} title="DPS" description="JWT tokens, ephemeral pubkeys, delegated proving, relayer invoice creation, sponsor-sweep." />
                <MetricCard icon={Server} title="Oracle" description="Fetch signed conversion quotes for cross-token payments with block-height expiry." />
                <MetricCard icon={Terminal} title="Merchants & Users" description="Merchant registration, SDK onboarding, MCP relay routes, Telegram bot, support." />
            </div>

            <CodeBlock title="Base URL and Auth" language="text" code={backendBaseExample} />
            <CodeBlock title="Response format" language="text" code={commonResponseExample} />

            <Callout title="Production URL" tone="blue">
                The production backend is hosted at <code className="rounded bg-white/10 px-1.5 py-0.5">https://api.nullpay.xyz</code>.
                All API routes are unversioned (no <code className="rounded bg-white/10 px-1.5 py-0.5">/v1</code> prefix) for stability.
            </Callout>
        </div>
    ),
};
