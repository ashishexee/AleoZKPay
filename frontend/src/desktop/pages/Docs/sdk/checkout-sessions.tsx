import { ArrowRight, Clock, Globe, Zap, Shield, Search } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const sessionTypesExample = `// TypeScript types for checkout sessions
// These types are exported from @nullpay/node

export interface CreateCheckoutSessionParams {
    /** 
     * The fiat-equivalent amount in major units (e.g. 1.00 instead of 1000000).
     * Required for non-donation invoices.
     */
    amount?:    number;                           

    /**
     * The token ticker. If not provided, defaults to CREDITS.
     * ANY allows the buyer to choose between Credits, USDCx, and USAD.
     */
    currency?:  'CREDITS' | 'USDCX' | 'USAD' | 'ANY';  

    /**
     * Standard (one-time), Multipay (recurring/reusable), or Donation (variable).
     */
    type?:      'standard' | 'donation' | 'multipay';   

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
    /** Unique UUID for the checkout session. */
    id:            string;   
    
    /** The URL where you should redirect your user to complete payment. */
    checkout_url:  string;   
    
    /** current state: PENDING, PROCESSING, SETTLED, or FAILED. */
    status:        string;   
    
    /** The resolved invoice hash used for this session. */
    invoice_hash?: string;   
    
    /** The resolved salt used for this session. */
    salt?:         string;   
}`;

const createWithNameExample = `// ─── Pattern 1: Pre-generated (Ultra Fast) ────────────────────────────────
// Recommended for 90% of use cases. Uses pre-configured invoices from nullpay.json.

const session = await nullpay.checkout.sessions.create({
    nullpay_invoice_name: 'basic-monthly',
    success_url: 'https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url:  'https://yourapp.com/cancel',
});

// Implementation details:
// 1. SDK reads 'basic-monthly' from your local nullpay.json file.
// 2. Extracts merchant_address, hash, salt, and amount.
// 3. Submits to NullPay Cloud APIs immediately.
// 4. Response is near-instant (< 200ms).

// Redirecting the user:
res.redirect(303, session.checkout_url);`;

const createDynamicExample = `// ─── Pattern 2: Dynamic (Complete Blockchain Flow) ────────────────────────
// Use this for variable-price checkouts or dynamic service fees.

const session = await nullpay.checkout.sessions.create({
    amount:      42.50,          // User-defined or dynamic amount
    currency:    'USDCX',
    type:        'standard',
    success_url: 'https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url:  'https://yourapp.com/cancel',
});

/**
 * UNDER THE HOOD: The Automatic Relayer Proxy
 * 
 * When 'invoice_hash' or 'salt' are missing, the SDK executes:
 * 1. Salt Generation: A cryptographically secure 128-bit 'field' salt is created.
 * 2. Relayer Request: Calls the NullPay Relayer to sponsor the transaction.
 * 3. Gas Coverage: NullPay pays the gas fee to create the invoice on Aleo.
 * 4. Polling Lifecycle:
 *    - The SDK enters a polling loop (2s intervals).
 *    - It queries the Aleo Mapping: salt_to_invoice[your_salt].
 *    - Waiting for block confirmation (avg 30-90s).
 * 5. Dashboard Sync: Once confirmed, it notifies the dashboard of the new invoice.
 * 6. Session Finalization: Finally, the checkout session is created.
 */`;

const retrieveExample = `// ─── sessions.retrieve(id) ───────────────────────────────────────────────
// Critical for fulfillment. Never trust frontend redirects alone.

const session = await nullpay.checkout.sessions.retrieve(sessionId);

switch (session.status) {
    case 'SETTLED':
        // ✅ Fulfillment logic here.
        // Payment is confirmed on the Aleo blockchain.
        break;
    case 'PROCESSING':
        // 🔄 Payment found, but block inclusion is pending.
        break;
    case 'PENDING':
        // ⏳ Waiting for user to complete the wallet signature.
        break;
    case 'FAILED':
        // ❌ Transaction failed or was manually cancelled.
        break;
}`;

export const checkoutSessionsSection: DocsSection = {
    id: 'sdk-checkout-sessions',
    group: 'SDK Reference',
    label: 'Checkout Sessions',
    eyebrow: 'SDK',
    title: 'Checkout Sessions — The Merchant Portal Entryway',
    summary:
        'Checkout Sessions are the fundamental unit of commerce in NullPay. They represent a single "Hosted Checkout" intent, linking a merchant invoice (on-chain) to a specific payment request (off-chain).',
    content: (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <GlassCard className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-emerald-400" />
                        <h3 className="text-lg font-bold text-white">Security Model</h3>
                    </div>
                    <p className="text-sm text-gray-400">
                        Sessions are linked to your <code className="text-white/80">invoice_hash</code>. This hash is a commitment on the Aleo blockchain that ensures nobody can modify the amount or recipient address once the session is created. The SDK verifies this commitment before generating the checkout URL.
                    </p>
                </GlassCard>
                <GlassCard className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <Search className="h-5 w-5 text-blue-400" />
                        <h3 className="text-lg font-bold text-white">Transparency</h3>
                    </div>
                    <p className="text-sm text-gray-400">
                        The SDK uses the <code className="text-white/80">salt_to_invoice</code> mapping to verify that the invoice exists on-chain. This mapping is public, allowing the buyer to verify the authenticity of the payment request using the Aleo Explorer.
                    </p>
                </GlassCard>
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Creation Parameters</h3>
                <CodeBlock title="CreateCheckoutSessionParams" language="ts" code={sessionTypesExample} />
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-emerald-300" />
                        <h3 className="text-xl font-bold text-white">1. Pre-generated Workflow</h3>
                    </div>
                </div>
                <div className="px-6 py-5">
                    <p className="mb-4 text-sm text-gray-400">
                        This is the high-performance path. By using <code className="text-emerald-300">nullpay_invoice_name</code>, the SDK skips all blockchain interaction. It assumes the invoice already exists on-chain (created via CLI) and generates the session immediately.
                    </p>
                    <CodeBlock title="Instant Checkout" language="js" code={createWithNameExample} />
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-orange-300" />
                        <h3 className="text-xl font-bold text-white">2. Automatic Relayer Proxy (Sponsored)</h3>
                    </div>
                </div>
                <div className="px-6 py-5">
                    <Callout title="NullPay Sponsors the Gas" tone="orange">
                        In the dynamic flow, NullPay covers the transaction fees for creating the invoice on-chain. 
                        This means your merchant wallet does not need to hold Credits to create new invoices.
                    </Callout>
                    <p className="my-4 text-sm text-gray-400">
                        The SDK will enter a complex polling loop, waiting for the Aleo network to reach consensus on your new invoice. 
                        The <code className="text-white/80">create()</code> promise will only resolve once the invoice is physically confirmed on-chain.
                    </p>
                    <CodeBlock title="Relayer-backed Dynamic Creation" language="js" code={createDynamicExample} />
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Verification & Settlement</h3>
                <p className="mb-4 text-sm text-gray-400">
                    Once the user is redirected back to your <code className="text-white/80">success_url</code>, you must verify the session status. 
                    The SDK provides a deterministic way to poll current state via <code className="text-blue-300">sessions.retrieve()</code>.
                </p>
                <CodeBlock title="Retrieving Session State" language="js" code={retrieveExample} />
                <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="mb-2 text-xs font-black uppercase tracking-widest text-gray-500">Status Lifecycle</p>
                    <ul className="space-y-2 text-xs text-gray-400">
                        <li>• <b className="text-white">PENDING</b>: The initial state. No payment attempt detected.</li>
                        <li>• <b className="text-white">PROCESSING</b>: The buyer has submitted the transaction. Waiting for Aleo confirmations.</li>
                        <li>• <b className="text-white">SETTLED</b>: The funds have arrived in the merchant's sub-pool. Safe to fulfill.</li>
                        <li>• <b className="text-white">FAILED</b>: The transaction was rejected by the network or the session expired.</li>
                    </ul>
                </div>
            </GlassCard>
        </div>
    ),
};
