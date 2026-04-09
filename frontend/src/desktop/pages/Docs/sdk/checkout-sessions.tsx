import { ArrowRight, Clock, Globe, Zap } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const sessionTypesExample = `// TypeScript types for checkout sessions

export interface CreateCheckoutSessionParams {
    // ─── Amount and token ───────────────────────────────────────────────
    amount?:    number;                           // Required for non-donation invoices
    currency?:  'CREDITS' | 'USDCX' | 'USAD' | 'ANY';  // Token type
    type?:      'standard' | 'donation' | 'multipay';   // Invoice type

    // ─── Redirect URLs ──────────────────────────────────────────────────
    success_url?: string;  // {CHECKOUT_SESSION_ID} template placeholder supported
    cancel_url?:  string;

    // ─── Pre-generated invoice (advanced) ───────────────────────────────
    invoice_hash?: string;  // Raw BHP256 hash (field element string)
    salt?:         string;  // Raw salt (field element string)

    // ─── Shorthand (recommended for nullpay.json workflows) ─────────────
    nullpay_invoice_name?:  string;  // Read from nullpay.json by name
    nullpay_invoice_index?: number;  // Read from nullpay.json by array index
}

export interface CheckoutSession {
    id:            string;   // Session UUID — use this for retrieve() and webhook reconciliation
    checkout_url:  string;   // Hosted checkout page URL — redirect buyer here
    status:        string;   // 'PENDING' | 'SETTLED' | 'FAILED' | 'PROCESSING'
    invoice_hash?: string;   // The resolved invoice hash used for this session
    salt?:         string;   // The resolved salt used for this session
}`;

const createWithNameExample = `// ─── Pattern 1: Pre-generated invoice (recommended) ─────────────────────
// Uses nullpay.json. SDK reads hash, salt, type, amount, currency from disk.

const session = await nullpay.checkout.sessions.create({
    nullpay_invoice_name: 'pro-plan',
    success_url: 'https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url:  'https://yourapp.com/cancel',
});

// What happens inside create():
//   1. Finds invoice in nullpay.json by name
//   2. Resolves: hash, salt, type, amount, currency from the manifest entry
//   3. POSTs to /checkout/sessions with the resolved values
//   4. Returns { id, checkout_url, status, invoice_hash, salt }

// redirect buyer:
res.redirect(303, session.checkout_url);

// The success_url supports {CHECKOUT_SESSION_ID} substitution:
//   → becomes: https://yourapp.com/success?session_id=sess_abc123...`;

const createDynamicExample = `// ─── Pattern 2: Dynamic session (no pre-generated invoice) ───────────────
// When no invoice_hash/salt is provided, the SDK calls the DPS relayer
// to create the invoice on-chain first, then creates the session.
//
// ⚠️ This is slower than Pattern 1 (up to 120 seconds for aleo confirmation)
//    Use Pattern 1 for any fixed-price product.
//    Use Pattern 2 for variable-price checkouts.

const session = await nullpay.checkout.sessions.create({
    amount:      99.99,          // Variable price
    currency:    'USDCX',
    type:        'standard',     // 'standard' | 'multipay' | 'donation'
    success_url: 'https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url:  'https://yourapp.com/cancel',
});

// What happens inside create() with no hash/salt:
//   1. Generates a random 128-bit salt (crypto.randomBytes(16))
//   2. POSTs to /dps/relayer/create-invoice to create on-chain
//   3. Polls https://api.provable.com/v2/testnet/program/.../mapping/salt_to_invoice/{salt}
//      every 2 seconds, up to 60 retries (120 seconds max)
//   4. Once hash is available: syncs invoice to dashboard (POST /invoices)
//   5. Creates the checkout session with the confirmed hash
//
// Amount validation:
//   Non-donation sessions with amount <= 0 throw immediately:
//   "Amount is required and must be greater than 0 for standard invoices."`;

const retrieveExample = `// ─── sessions.retrieve(sessionId) ────────────────────────────────────────
// Use after buyer returns to your success_url to confirm settlement.

app.get('/api/verify', async (req, res) => {
    const { session_id } = req.query;

    const session = await nullpay.checkout.sessions.retrieve(session_id);
    // → CheckoutSession { id, status, checkout_url, invoice_hash, salt }

    if (session.status === 'SETTLED') {
        // Safe to fulfill — settlement confirmed server-side
        await fulfillOrder(session_id);
        res.json({ success: true });
    } else {
        res.status(402).json({ error: 'Payment not yet confirmed', status: session.status });
    }
});

// Possible statuses:
//   PENDING    → Invoice created, waiting for buyer payment
//   PROCESSING → Payment submitted, waiting for Aleo confirmation
//   SETTLED    → Payment confirmed on-chain — safe to fulfill
//   FAILED     → Payment failed or expired`;

const mergeRulesExample = `// ─── nullpay_invoice_name resolution — merge rules ───────────────────────
// When nullpay_invoice_name is provided, the SDK reads the manifest and merges:

// From nullpay.json manifest entry:
//   inv.hash    → resolvedParams.invoice_hash (if invoice_hash not explicitly passed)
//   inv.salt    → resolvedParams.salt
//   inv.type    → resolvedParams.type
//   inv.amount  → resolvedParams.amount (if amount not explicitly passed)
//   inv.currency → resolvedParams.currency

// Explicit params ALWAYS take precedence over manifest values.
// After merging, nullpay_invoice_name and nullpay_invoice_index are
// deleted before the payload is sent to the API.

// Example: override amount for a custom price on a multipay invoice:
const session = await nullpay.checkout.sessions.create({
    nullpay_invoice_name: 'basic-plan',
    amount: 149.99,  // ← overrides the amount in nullpay.json
    success_url: '...',
    cancel_url:  '...',
});`;

export const checkoutSessionsSection: DocsSection = {
    id: 'sdk-checkout-sessions',
    group: 'SDK Reference',
    label: 'Checkout Sessions',
    eyebrow: 'SDK',
    title: 'nullpay.checkout.sessions.* — create and retrieve sessions',
    summary:
        'The checkout sessions namespace has two methods: create() for starting a payment flow and retrieve() for confirming settlement. The create() method supports two patterns: pre-generated (from nullpay.json) and fully dynamic with automatic on-chain invoice creation via the DPS relayer.',
    content: (
        <div className="space-y-6">
            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">TypeScript interfaces</h3>
                <CodeBlock title="CreateCheckoutSessionParams and CheckoutSession types" language="ts" code={sessionTypesExample} />
            </GlassCard>

            <div className="grid gap-4 md:grid-cols-3">
                {[
                    {
                        icon: Globe,
                        title: 'Pre-generated (fast)',
                        desc: 'Uses nullpay_invoice_name. Reads hash and salt from nullpay.json. No blockchain wait. Recommended for fixed-price products.',
                        color: 'text-emerald-300',
                    },
                    {
                        icon: Zap,
                        title: 'Dynamic (slower)',
                        desc: 'No nullpay_invoice_name. SDK calls DPS relayer and waits for on-chain confirmation (up to 120s). Required for variable-price checkouts.',
                        color: 'text-orange-300',
                    },
                    {
                        icon: Clock,
                        title: 'retrieve() — verify settlement',
                        desc: 'Call with the session_id from your success_url query param. Returns current status. SETTLED = safe to fulfill.',
                        color: 'text-blue-300',
                    },
                ].map(({ icon: Icon, title, desc, color }) => (
                    <div key={title} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <Icon className={`mb-3 h-5 w-5 ${color}`} />
                        <p className="mb-2 text-sm font-bold text-white">{title}</p>
                        <p className="text-xs leading-relaxed text-gray-400">{desc}</p>
                    </div>
                ))}
            </div>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Pattern 1 — Fast</span>
                        <ArrowRight className="h-3 w-3 text-gray-500" />
                        <span className="text-[10px] text-gray-500">nullpay_invoice_name</span>
                    </div>
                    <h3 className="mt-1 text-xl font-bold text-white">sessions.create — pre-generated invoice</h3>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="Create session with named invoice" language="js" code={createWithNameExample} />
                    <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-2 text-sm font-bold text-white">Merge order diagram</p>
                        <CodeBlock title="nullpay_invoice_name merge rules" language="js" code={mergeRulesExample} />
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-300">Pattern 2 — Dynamic</span>
                        <ArrowRight className="h-3 w-3 text-gray-500" />
                        <span className="text-[10px] text-gray-500">DPS relayer + Aleo polling</span>
                    </div>
                    <h3 className="mt-1 text-xl font-bold text-white">sessions.create — dynamic invoice creation</h3>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="Dynamic session with inline amount" language="js" code={createDynamicExample} />
                    <Callout title="Dynamic creation can take up to 120 seconds" tone="orange">
                        The SDK polls the Aleo network every 2 seconds for up to 60 retries (120 seconds total) waiting for the invoice hash to appear at <code className="rounded bg-white/10 px-1.5 py-0.5">salt_to_invoice[salt]</code>. If the hash is not found within that window, the SDK throws a timeout error. For time-sensitive flows, prefer pre-generated invoices.
                    </Callout>
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <h3 className="mt-1 text-xl font-bold text-white">sessions.retrieve — confirm settlement</h3>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="Verify payment on redirect return" language="js" code={retrieveExample} />
                    <Callout title="Always verify server-side on the success URL return" tone="blue">
                        The <code className="rounded bg-white/10 px-1.5 py-0.5">session_id</code> in the success_url is not a proof of payment — it is just an identifier. Always call <code className="rounded bg-white/10 px-1.5 py-0.5">sessions.retrieve(id)</code> server-side and check that <code className="rounded bg-white/10 px-1.5 py-0.5">status === 'SETTLED'</code> before fulfilling orders.
                    </Callout>
                </div>
            </GlassCard>
        </div>
    ),
};
