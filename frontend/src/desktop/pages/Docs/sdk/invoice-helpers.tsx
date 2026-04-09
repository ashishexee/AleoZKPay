import { CheckCircle, GitBranch, RefreshCw } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const invoiceTypesExample = `// ── TypeScript types for nullpay.json ────────────────────────────────────

export interface NullPayInvoice {
    name:      string;              // Developer-defined identifier (e.g. "pro-plan")
    type:      'multipay' | 'donation';  // The invoice type
    amount:    number | null;       // null = any amount (donation only)
    currency:  string;              // 'CREDITS' | 'USDCX' | 'USAD' | 'ANY'
    label?:    string;              // Optional display label
    hash:      string;              // BHP256 invoice hash (field element as string)
    salt:      string;              // Invoice salt (field element as string)
}

export interface NullPayJson {
    merchant:     string;          // Merchant's Aleo address
    generated_at: string;          // ISO 8601 timestamp of when the CLI ran
    invoices:     NullPayInvoice[]; // Array of pre-generated invoice entries
}

// Note: 'standard' invoices are not stored in nullpay.json.
// The CLI only generates multipay and donation entries —
// standard invoices are always created dynamically via sessions.create().`;

const invoiceMethodsExample = `// ── nullpay.invoices.* — all four methods ────────────────────────────────

// 1. getAll() — returns all invoices from nullpay.json
//    Throws if nullpay.json is not found.
const allInvoices = nullpay.invoices.getAll();
// → NullPayInvoice[]

// 2. getByName(name) — recommended for route handlers
//    Throws with descriptive message listing all available names if not found.
const plan = nullpay.invoices.getByName('pro-plan');
// → NullPayInvoice { name: 'pro-plan', hash: '...field', salt: '...field', ... }

// Error example if name not found:
//   Invoice "pro-plan" not found in nullpay.json. 
//   Available: "basic-usdcx", "support-any"

// 3. getByIndex(i) — fallback for index-based workflows
//    Throws if i is out of bounds.
const first = nullpay.invoices.getByIndex(0);

// 4. getByType(type) — filter by type
//    Returns empty array if none match (never throws).
const donations = nullpay.invoices.getByType('donation');
// → NullPayInvoice[] (all donation-type invoices)`;

const iterationPatternExample = `// ─── Common pattern: dynamically register routes for all invoices ──────────
// From the testing-website backend:

for (const invoice of nullpay.invoices.getAll()) {
    app.post(\`/api/\${invoice.name}\`, async (req, res) => {
        const session = await nullpay.checkout.sessions.create({
            // nullpay_invoice_name reads hash, salt, type, amount, currency
            // from nullpay.json automatically:
            nullpay_invoice_name: invoice.name,
            success_url: \`\${frontendUrl}?session_id={CHECKOUT_SESSION_ID}\`,
            cancel_url:  \`\${frontendUrl}?cancel=true\`,
        });

        res.json({ checkoutUrl: session.checkout_url });
    });
}
// This creates one POST handler per named invoice in nullpay.json.
// Adding a new invoice to nullpay.json (via the CLI) automatically
// creates a new route on the next server restart — no code changes needed.`;

const loadNullPayConfigExample = `// loadNullPayConfig is also exported as a standalone utility.
// Useful if you need to read nullpay.json without instantiating NullPay.

import { loadNullPayConfig } from '@nullpay/node';

const config = loadNullPayConfig(
    __dirname,                              // projectRoot
    path.join(__dirname, 'nullpay.json')    // configPath (optional override)
);

if (!config) {
    console.warn('nullpay.json not found — skipping invoice registration');
} else {
    console.log('Merchant:', config.merchant);
    console.log('Invoices:', config.invoices.length);
}

// Resolution priority:
// 1. configPath (if provided and exists)
// 2. path.join(projectRoot, 'nullpay.json')
// 3. path.join(process.cwd(), 'nullpay.json')`;

export const invoiceHelpersSection: DocsSection = {
    id: 'sdk-invoice-helpers',
    group: 'SDK Reference',
    label: 'Invoice Helpers',
    eyebrow: 'SDK',
    title: 'nullpay.invoices.* — reading and querying the manifest',
    summary:
        'The invoices namespace provides four synchronous methods for reading and querying your local nullpay.json manifest. These are helper utilities — they do not make any network requests. They throw descriptive errors if the file is missing or the requested invoice is not found.',
    content: (
        <div className="space-y-6">
            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">NullPayInvoice and NullPayJson types</h3>
                <CodeBlock title="Type definitions (from SDK source)" language="ts" code={invoiceTypesExample} />
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-1 text-sm font-bold text-white">Why nullpay.json only has multipay and donation</p>
                        <p className="text-xs leading-relaxed text-gray-400">
                            Standard invoices are one-time — they settle after a single payment and become invalid. Pre-generating them in <code className="rounded bg-white/5 px-1 py-0.5">nullpay.json</code> would require re-running the CLI after every purchase. Standard invoices are always created dynamically via <code className="rounded bg-white/5 px-1 py-0.5">sessions.create()</code> with inline amount and currency.
                        </p>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-1 text-sm font-bold text-white">hash and salt are field element strings</p>
                        <p className="text-xs leading-relaxed text-gray-400">
                            The <code className="rounded bg-white/5 px-1 py-0.5">hash</code> and <code className="rounded bg-white/5 px-1 py-0.5">salt</code> values are Aleo field element strings — 30–40 digit numbers followed by <code className="rounded bg-white/5 px-1 py-0.5">field</code>. These are passed directly to the backend API without modification.
                        </p>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <GitBranch className="h-5 w-5 text-orange-300" />
                    <h3 className="text-xl font-bold text-white">All four invoice methods</h3>
                </div>
                <CodeBlock title="nullpay.invoices.* — all methods" language="js" code={invoiceMethodsExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <RefreshCw className="h-5 w-5 text-orange-300" />
                    <h3 className="text-xl font-bold text-white">Route iteration pattern</h3>
                </div>
                <CodeBlock title="Register one route per invoice at startup" language="js" code={iterationPatternExample} />
                <Callout title="No code change needed when adding invoices" tone="blue">
                    Because routes are registered dynamically from <code className="rounded bg-white/10 px-1.5 py-0.5">nullpay.json</code>, running the CLI to add a new invoice and restarting the server is all it takes to expose a new payment endpoint. Your route-handling code stays constant.
                </Callout>
            </GlassCard>

            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="h-5 w-5 text-orange-300" />
                    <h3 className="text-xl font-bold text-white">Standalone loadNullPayConfig</h3>
                </div>
                <CodeBlock title="loadNullPayConfig utility" language="ts" code={loadNullPayConfigExample} />
            </GlassCard>
        </div>
    ),
};
