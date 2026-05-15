import { ShoppingCart, Link, Search, Webhook } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const checkoutEndpoints = `// ─── Checkout API ──────────────────────────────────────────────
// Base: /api/checkout
// Source: backend/src/routes/checkout.routes.js
// Auth: Bearer token (secret key) required for POST

// POST /api/checkout/sessions — Create checkout session
// Header: Authorization: Bearer sk_test_...
// Body: {
//   amount?: number,
//   currency?: 'CREDITS'|'USDCX'|'USAD'|'ANY',
//   type?: 'standard'|'donation'|'multipay',
//   success_url?: string,
//   cancel_url?: string,
//   invoice_hash?: string,
//   salt?: string,
//   nullpay_invoice_name?: string,
//   nullpay_invoice_index?: number
// }
// Response: { id, checkout_url, status, invoice_hash, salt }

// GET /api/checkout/sessions/:id — Retrieve session
// Response: CheckoutSession

// PATCH /api/checkout/sessions/:id — Update session
// Body: { status, tx_id, metadata, ... }
// Response: Updated CheckoutSession`;

const createSessionExample = `// Example: POST /api/checkout/sessions
// Request:
{
  "amount": 50,
  "currency": "USDCX",
  "type": "standard",
  "success_url": "https://example.com/success?session_id={CHECKOUT_SESSION_ID}",
  "cancel_url": "https://example.com/cancel"
}

// Response (201 Created):
{
  "id": "cs_abc123xyz",
  "checkout_url": "https://nullpay.app/checkout/cs_abc123xyz",
  "status": "PENDING",
  "invoice_hash": "172487...194field",
  "salt": "189135...168field"
}`;

const retrieveSessionExample = `// Example: GET /api/checkout/sessions/cs_abc123xyz
// Response:
{
  "id": "cs_abc123xyz",
  "status": "SETTLED",
  "invoice_hash": "172487...194field",
  "salt": "189135...168field",
  "amount": 50,
  "currency": "USDCX",
  "type": "standard",
  "tx_id": "at1r42l7dn57zczx5s4kxq4ut68g65c5d0r35jg5g9k8mx4k2j5qypsjk2xth",
  "success_url": "https://example.com/success?session_id=cs_abc123xyz",
  "cancel_url": "https://example.com/cancel",
  "created_at": "2026-03-21T09:10:24.522Z",
  "updated_at": "2026-03-21T09:12:15.000Z"
}`;

export const checkoutApiSection: DocsSection = {
    id: 'api-checkout',
    group: 'Endpoints',
    label: 'Checkout',
    eyebrow: 'API Reference',
    title: 'Checkout API — Hosted checkout session management',
    summary: 'Create, retrieve, and update hosted checkout sessions. All POST operations require merchant authentication via Bearer token.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard icon={ShoppingCart} title="POST /api/checkout/sessions" description="Create a hosted checkout session. Returns checkout URL for buyer redirect." />
                <MetricCard icon={Search} title="GET /api/checkout/sessions/:id" description="Retrieve session status. Use for verifying settlement after buyer redirects back." />
                <MetricCard icon={Link} title="PATCH /api/checkout/sessions/:id" description="Update session metadata or status after payment events are processed." />
                <MetricCard icon={Webhook} title="Session → Webhook" description="Once settled, webhooks fire to your configured endpoint with the session ID." />
            </div>

            <CodeBlock title="Checkout API endpoints" language="text" code={checkoutEndpoints} />
            <CodeBlock title="Create session — Request/Response" language="json" code={createSessionExample} />
            <CodeBlock title="Retrieve session — Response" language="json" code={retrieveSessionExample} />

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Endpoint details</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.08]">
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Method</th>
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Path</th>
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Auth</th>
                                <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500">Description</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-300">
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-yellow-300">POST</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/checkout/sessions</td><td className="px-4 py-3 font-mono text-xs text-red-300">Bearer sk_</td><td className="px-4 py-3 text-sm text-gray-400">Create new checkout session</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-emerald-300">GET</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/checkout/sessions/:id</td><td className="px-4 py-3 text-sm">Public</td><td className="px-4 py-3 text-sm text-gray-400">Retrieve session by ID</td></tr>
                            <tr><td className="px-4 py-3 font-mono text-xs text-blue-300">PATCH</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/checkout/sessions/:id</td><td className="px-4 py-3 text-sm">Public</td><td className="px-4 py-3 text-sm text-gray-400">Update session metadata</td></tr>
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            <Callout title="Auth required for creation" tone="orange">
                Session creation (<code className="rounded bg-white/10 px-1.5 py-0.5">POST /api/checkout/sessions</code>) requires the
                <code className="rounded bg-white/10 px-1.5 py-0.5">Authorization: Bearer sk_test_...</code> header with your merchant secret key.
                GET and PATCH are public — use the SDK client's <code className="rounded bg-white/10 px-1.5 py-0.5">constructEvent()</code> for webhook verification.
            </Callout>
        </div>
    ),
};
