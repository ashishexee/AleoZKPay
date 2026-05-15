import { Key, Hash, Trash2, Edit3 } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const invoicesEndpoints = `// ─── Invoices API ──────────────────────────────────────────────
// Base: /api/invoices
// Source: backend/src/routes/invoices.routes.js

// GET /api/invoices — List all invoices
// Query: ?merchant=aleo1... (optional filter)
// Response: Invoice[]

// POST /api/invoices — Create a new invoice
// Body: { merchant, amount, currency, salt, ... }
// Response: { id, hash, salt, status }

// GET /api/invoices/merchant/:hash — Get invoices by merchant
// Params: hash = Aleo address hash
// Response: Invoice[]

// GET /api/invoices/recent — Get recent invoices
// Response: Invoice[] (last 50, sorted by created_at DESC)

// GET /api/invoices/:hash — Get single invoice by hash
// Params: hash = invoice_hash field element
// Response: Invoice

// GET /api/invoice/:hash — Shortcut route (registered at /api/invoice/:hash)
// Same behavior as GET /api/invoices/:hash

// PATCH /api/invoices/:hash — Update invoice metadata
// Body: { status, metadata, ... }
// Response: Updated Invoice

// DELETE /api/invoices/:hash — Delete an invoice
// Response: { success: true }`;

const invoiceResponseExample = `// Example: GET /api/invoices/merchant/aleo1...
[
  {
    "id": "inv_abc123",
    "invoice_hash": "172487...194field",
    "salt": "189135...168field",
    "merchant": "encrypted_merchant_address",
    "amount": 50,
    "currency": "USDCX",
    "type": "standard",
    "status": "PENDING",
    "title": "Pro Plan - Monthly",
    "created_at": "2026-03-21T09:10:24.522Z"
  }
]`;

export const invoicesApiSection: DocsSection = {
    id: 'api-invoices',
    group: 'Endpoints',
    label: 'Invoices',
    eyebrow: 'API Reference',
    title: 'Invoices API — CRUD operations for payment invoices',
    summary: 'Full CRUD API for managing payment invoices. Supports creation with salt/hash validation, retrieval by merchant or hash, and status updates.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard icon={Key} title="GET /api/invoices" description="List all invoices with optional merchant address filter." />
                <MetricCard icon={Hash} title="GET /api/invoices/:hash" description="Retrieve a single invoice by its BHP256 hash identifier." />
                <MetricCard icon={Edit3} title="PATCH /api/invoices/:hash" description="Update invoice metadata: status, title, notes." />
                <MetricCard icon={Trash2} title="DELETE /api/invoices/:hash" description="Remove an invoice from the backend database." />
            </div>

            <CodeBlock title="Invoices API endpoints" language="text" code={invoicesEndpoints} />
            <CodeBlock title="Response shape (merchant invoices)" language="json" code={invoiceResponseExample} />

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
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-emerald-300">GET</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/invoices</td><td className="px-4 py-3 text-sm">Public</td><td className="px-4 py-3 text-sm text-gray-400">List invoices, optional filter by merchant</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-yellow-300">POST</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/invoices</td><td className="px-4 py-3 text-sm">None</td><td className="px-4 py-3 text-sm text-gray-400">Create invoice record in backend DB</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-emerald-300">GET</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/invoices/merchant/:hash</td><td className="px-4 py-3 text-sm">Public</td><td className="px-4 py-3 text-sm text-gray-400">Get all invoices for a merchant address</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-emerald-300">GET</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/invoices/recent</td><td className="px-4 py-3 text-sm">Public</td><td className="px-4 py-3 text-sm text-gray-400">Most recent 50 invoices</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-emerald-300">GET</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/invoices/:hash</td><td className="px-4 py-3 text-sm">Public</td><td className="px-4 py-3 text-sm text-gray-400">Get invoice by hash</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-emerald-300">GET</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/invoice/:hash</td><td className="px-4 py-3 text-sm">Public</td><td className="px-4 py-3 text-sm text-gray-400">Shortcut: same as above</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-4 py-3 font-mono text-xs text-blue-300">PATCH</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/invoices/:hash</td><td className="px-4 py-3 text-sm">None</td><td className="px-4 py-3 text-sm text-gray-400">Update invoice status/metadata</td></tr>
                            <tr><td className="px-4 py-3 font-mono text-xs text-red-300">DELETE</td><td className="px-4 py-3 font-mono text-xs text-orange-300">/api/invoices/:hash</td><td className="px-4 py-3 text-sm">None</td><td className="px-4 py-3 text-sm text-gray-400">Delete invoice</td></tr>
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            <Callout title="Shortcut route" tone="blue">
                The <code className="rounded bg-white/10 px-1.5 py-0.5">GET /api/invoice/:hash</code> route is registered at the root level
                as a convenience shortcut. It returns the same response as <code className="rounded bg-white/10 px-1.5 py-0.5">GET /api/invoices/:hash</code>.
            </Callout>
        </div>
    ),
};
