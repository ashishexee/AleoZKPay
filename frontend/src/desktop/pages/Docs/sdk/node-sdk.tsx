import { Code2, Key, Package, Settings } from 'lucide-react';
import type { DocsSection } from '../types';
import { installNodeCommand } from '../examples';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const installExample = `# Install the official NullPay Node.js SDK
npm install @nullpay/node@latest

# Or with yarn:
yarn add @nullpay/node@latest`;

const configExample = `// The SDK is used via the NullPay class. Initialize it once per server process.
// Typically in a file like: lib/nullpay.ts or utils/nullpay.ts

const path = require('path');
const { NullPay } = require('@nullpay/node');

const nullpay = new NullPay({
    // REQUIRED: your merchant secret key
    // ⚠️ Never expose this in frontend code or commit to git
    secretKey: process.env.NULLPAY_SECRET_KEY,

    // OPTIONAL: override the API base URL (defaults to production backend)
    baseURL: process.env.NULLPAY_BASE_URL
          || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api',

    // OPTIONAL: directory where nullpay.json lives (defaults to process.cwd())
    // Used by nullpay.invoices.getAll(), getByName(), getByType()
    projectRoot: __dirname,

    // OPTIONAL: override the exact path to nullpay.json
    // Takes precedence over projectRoot if provided
    configPath: path.join(__dirname, 'nullpay.json'),
});`;

const configInterfaceExample = `// TypeScript interface — the full NullPayConfig type:

export interface NullPayConfig {
    secretKey: string;      // Required. Merchant API secret key.
    baseURL?: string;       // Optional. Override API backend URL.
    projectRoot?: string;   // Optional. Root dir for nullpay.json resolution.
    configPath?: string;    // Optional. Absolute path to nullpay.json.
}

// The SDK throws immediately if secretKey is missing:
//   "NullPay API Key is required."`;

const sdkApiSurfaceExample = `// Top-level API surface of the NullPay class:
// (All methods shown — nothing omitted)

const nullpay = new NullPay(config);

// ── Invoice helpers (reads nullpay.json) ─────────────────────────────────
nullpay.invoices.getAll()                   // → NullPayInvoice[]
nullpay.invoices.getByIndex(i)              // → NullPayInvoice
nullpay.invoices.getByName(name)            // → NullPayInvoice
nullpay.invoices.getByType(type)            // → NullPayInvoice[]

// ── Checkout sessions ──────────────────────────────────────────────────────
nullpay.checkout.sessions.create(params)    // → Promise<CheckoutSession>
nullpay.checkout.sessions.retrieve(id)      // → Promise<CheckoutSession>

// ── Webhook verification ──────────────────────────────────────────────────
nullpay.webhooks.verifySignature(payload, sig) // → boolean
nullpay.webhooks.constructEvent(payload, sig)  // → WebhookEvent (throws if invalid)`;

export const nodeSdkSection: DocsSection = {
    id: 'sdk-node',
    group: 'Overview',
    label: 'Node.js SDK',
    eyebrow: 'SDK',
    title: 'Node.js SDK — installation, config, and full API surface',
    summary:
        'The @nullpay/node SDK is the primary integration point for merchant backends. It wraps the NullPay REST API, handles nullpay.json resolution, manages the DPS relayer flow for dynamic invoice creation, and provides HMAC-SHA256 webhook verification.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Package}
                    title="@nullpay/node"
                    description="The official Node.js SDK. Works in any Node.js 16+ runtime. CommonJS and ESM compatible."
                />
                <MetricCard
                    icon={Key}
                    title="secretKey required"
                    description="The SDK requires a merchant secret key (NULLPAY_SECRET_KEY). It is used for API authentication and HMAC webhook signing. Backend-only."
                />
                <MetricCard
                    icon={Settings}
                    title="nullpay.json aware"
                    description="The SDK reads your nullpay.json manifest at runtime. Use invoices.getByName() to create sessions from pre-generated invoice hashes."
                />
                <MetricCard
                    icon={Code2}
                    title="3 namespaces"
                    description="invoices.*, checkout.sessions.*, and webhooks.* — the full API surface available on the NullPay class instance."
                />
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Installation</h3>
                <CodeBlock title="npm install" language="bash" code={installExample} />
                <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="mb-1 text-sm font-bold text-white">What gets installed</p>
                    <ul className="mt-2 space-y-1 text-xs text-gray-400">
                        <li>• <code className="rounded bg-white/5 px-1 py-0.5">NullPay</code> class with full TypeScript typings</li>
                        <li>• <code className="rounded bg-white/5 px-1 py-0.5">NullPayConfig</code>, <code className="rounded bg-white/5 px-1 py-0.5">NullPayInvoice</code>, <code className="rounded bg-white/5 px-1 py-0.5">NullPayJson</code>, <code className="rounded bg-white/5 px-1 py-0.5">CreateCheckoutSessionParams</code>, <code className="rounded bg-white/5 px-1 py-0.5">CheckoutSession</code>, <code className="rounded bg-white/5 px-1 py-0.5">WebhookEvent</code> types</li>
                        <li>• <code className="rounded bg-white/5 px-1 py-0.5">loadNullPayConfig()</code> utility for standalone config loading</li>
                    </ul>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Constructor config — all options</h3>
                <CodeBlock title="new NullPay(config)" language="js" code={configExample} />
                <CodeBlock title="NullPayConfig TypeScript interface" language="ts" code={configInterfaceExample} />
                <Callout title="secretKey must never reach the browser" tone="orange">
                    The <code className="rounded bg-white/10 px-1.5 py-0.5">secretKey</code> is used for API Bearer token auth and HMAC webhook signing. It should only exist in server-side environment variables. Never import <code className="rounded bg-white/10 px-1.5 py-0.5">@nullpay/node</code> in frontend code.
                </Callout>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Full SDK API surface</h3>
                <CodeBlock title="All methods on the NullPay instance" language="js" code={sdkApiSurfaceExample} />
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-2 text-xs font-black uppercase tracking-widest text-orange-300">invoices.*</p>
                        <p className="text-xs leading-relaxed text-gray-400">Synchronous helpers. Reads <code className="rounded bg-white/5 px-1 py-0.5">nullpay.json</code> from disk. Throws with descriptive errors if the file is missing or the invoice name doesn't exist.</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-2 text-xs font-black uppercase tracking-widest text-blue-300">checkout.sessions.*</p>
                        <p className="text-xs leading-relaxed text-gray-400">Async methods. <code className="rounded bg-white/5 px-1 py-0.5">create()</code> handles DPS relayer flow automatically when no hash/salt is pre-generated. <code className="rounded bg-white/5 px-1 py-0.5">retrieve()</code> polls session status.</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="mb-2 text-xs font-black uppercase tracking-widest text-emerald-300">webhooks.*</p>
                        <p className="text-xs leading-relaxed text-gray-400">HMAC-SHA256 signature verification using <code className="rounded bg-white/5 px-1 py-0.5">crypto.timingSafeEqual</code> for constant-time comparison. Throws on invalid signature.</p>
                    </div>
                </div>
            </GlassCard>
        </div>
    ),
};
