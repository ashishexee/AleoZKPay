import { GitBranch, RefreshCw, Layers, ShieldCheck, AlertCircle } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const invoiceTypesExample = `// TypeScript Type Definitions
// Exported from @nullpay/node

export interface NullPayInvoice {
    /** The dev-defined string for SDK lookups */
    name:      string;              
    
    /** multipay | donation (Standard invoices are dynamic) */
    type:      'multipay' | 'donation';  
    
    /** Fixed amount (e.g. 19.99). Null for donation-type. */
    amount:    number | null;       
    
    /** The token ticker (CREDITS, USDCX, etc.) */
    currency:  string;              
    
    /** Display text for the payer */
    label?:    string;              
    
    /** BHP256 commitment of the invoice state */
    hash:      string;              
    
    /** Privacy-preserving 128-bit salt */
    salt:      string;              
}`;

const methodsWalkthroughExample = `/**
 * THE INVOICE NAMESPACE (Local Controller)
 * 
 * Unlike the 'checkout' namespace, the 'invoices' namespace is 
 * completely synchronous and makes ZERO network requests. 
 * It acts as a wrapper around the nullpay.json manifest.
 */

// 1. Precise Lookup
const plan = nullpay.invoices.getByName('premium-tier');

// 2. Collection Filters
const subscriptions = nullpay.invoices.getByType('multipay');

// 3. Batch Retrieval
const all = nullpay.invoices.getAll();

// ERROR HANDLING:
// If "premium-tier" is missing, getByName() throws an error:
// "Invoice 'premium-tier' not found in nullpay.json. Available: intro, middle, elite"
// This prevents silent failures in production.`;

const routeAutomationExample = `/**
 * PRODUCTION PATTERN: Zero-Touch Deployment
 * 
 * By iterating over the manifest during startup, you can add 
 * new products by simply running the CLI and restarting the app.
 */

nullpay.invoices.getAll().forEach(invoice => {
    app.post(\`/pay/\${invoice.name}\`, async (req, res) => {
        const session = await nullpay.checkout.sessions.create({
            nullpay_invoice_name: invoice.name,
            success_url: \`\${BASE}/done?id={CHECKOUT_SESSION_ID}\`,
            cancel_url:  \`\${BASE}/cancel\`,
        });
        
        res.json({ url: session.checkout_url });
    });
});`;

export const invoiceHelpersSection: DocsSection = {
    id: 'sdk-invoice-helpers',
    group: 'SDK Reference',
    label: 'Invoice Helpers',
    eyebrow: 'SDK',
    title: 'Invoice Helpers — Local Manifest Controllers',
    summary:
        'The invoices namespace provides high-performance, synchronous utilities for interacting with your local nullpay.json manifest. These methods are designed to simplify route handling and invoice lookups.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Layers}
                    title="0ms Latency"
                    description="Synchronous lookups from memory. No database I/O or network round-trips required."
                />
                <MetricCard
                    icon={ShieldCheck}
                    title="Type-Safe"
                    description="Full TypeScript interface support for all invoice properties including hashes and salts."
                />
                <MetricCard
                    icon={RefreshCw}
                    title="Dynamic Sync"
                    description="Automatically refreshes based on the content of nullpay.json on server startup."
                />
                <MetricCard
                    icon={AlertCircle}
                    title="Fail-Fast"
                    description="Throws descriptive errors if an invoice is referenced but missing from the manifest."
                />
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">The Invoice Interface</h3>
                <p className="mb-4 text-sm text-gray-400">
                    Each <code className="text-white/80">NullPayInvoice</code> object represents a unique, on-chain commitment that the merchant has pre-generated.
                </p>
                <CodeBlock title="SDK Type Definition" language="ts" code={invoiceTypesExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Full Method Suite</h3>
                <p className="mb-4 text-sm text-gray-400">
                    The <code className="text-white/80">nullpay.invoices</code> namespace maps your developer-friendly names to Aleo blockchain identifiers.
                </p>
                <CodeBlock title="API Surface Walkthrough" language="js" code={methodsWalkthroughExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <div className="mb-4 flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-blue-400" />
                    <h3 className="text-xl font-bold text-white">Pattern: Automatic Route Scaling</h3>
                </div>
                <p className="mb-4 text-sm text-gray-400">
                    For merchants with dynamic product lists, the best practice is to iterate the manifest during application startup. This turns your <code className="text-white/80">nullpay.json</code> into a configuration-driven routing table.
                </p>
                <CodeBlock title="Dynamic Express.js Registration" language="js" code={routeAutomationExample} />
                <Callout title="Why not use these for 'Standard' invoices?" tone="orange">
                    Standard (one-time) invoices are physically spent after a single payment. Storing them in a static JSON file would result in "Already Spent" errors for all subsequent users. **Standard invoices must always use Pattern 2 (Dynamic Session Creation).**
                </Callout>
            </GlassCard>

            <GlassCard className="p-6 border-blue-500/20 bg-blue-500/5">
                <div className="flex items-start gap-4">
                    <div className="rounded-full bg-blue-500/20 p-2">
                        <ShieldCheck className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-lg">Integrity Validation</h4>
                        <p className="mt-1 text-sm text-gray-400 leading-relaxed">
                            Every time the SDK loads an invoice from the manifest, it validates the structure of the <code className="text-white/80">hash</code> and <code className="text-white/80">salt</code>. If a field element string is malformed or missing the <code className="text-emerald-400">"field"</code> suffix, the SDK will throw an immediate descriptive error, preventing invalid payment requests from being displayed to your customers.
                        </p>
                    </div>
                </div>
            </GlassCard>
        </div>
    ),
};
