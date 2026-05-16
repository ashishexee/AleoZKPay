import { Package, Settings, ShieldCheck, Zap } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const installExample = `# Install the official NullPay Node.js SDK
npm install @nullpay/node@latest

# Or with yarn:
yarn add @nullpay/node@latest

# For Python environments (FastAPI/Flask/Django):
pip install nullpay-python`;

const configExample = `// The SDK is used via the NullPay class. Initialize it once per server process.
// Typically in a file like: lib/nullpay.ts or utils/nullpay.ts

const path = require('path');
const { NullPay } = require('@nullpay/node');

const nullpay = new NullPay({
    // REQUIRED: your merchant secret key (sk_test_... or sk_live_...)
    // This key is used for both REST API auth and HMAC signature generation.
    // ⚠️ Never expose this in frontend code or commit to git.
    secretKey: process.env.NULLPAY_SECRET_KEY,

    // OPTIONAL: override the API base URL (defaults to production backend)
    // Useful for local development when proxying through a different tunnel.
    baseURL: process.env.NULLPAY_BASE_URL
          || 'https://api.nullpay.xyz',

    // OPTIONAL: directory where nullpay.json lives (defaults to process.cwd())
    // Essential for Vercel/Next.js where process.cwd() might point to a root
    // directory instead of your function's directory.
    projectRoot: __dirname,

    // OPTIONAL: override the exact path to nullpay.json
    // Takes precedence over projectRoot if provided. Useful for non-standard file names.
    configPath: path.join(__dirname, 'nullpay.json'),
});`;

const sdkApiSurfaceExample = `// Top-level API surface of the NullPay class:
// The class is structured into logical namespaces for clarity.

const nullpay = new NullPay(config);

/**
 * ── Invoice Helpers (Local & Synchronous) ──
 * These methods read from the local nullpay.json manifest.
 * They are extremely fast as they do not perform network requests.
 */
nullpay.invoices.getAll()                   // → NullPayInvoice[] (full list)
nullpay.invoices.getByIndex(0)              // → NullPayInvoice (by array position)
nullpay.invoices.getByName('pro-plan')      // → NullPayInvoice (by dev-assigned name)
nullpay.invoices.getByType('multipay')      // → NullPayInvoice[] (filtered by type)

/**
 * ── Checkout Sessions (Remote & Asynchronous) ──
 * These methods interact with the NullPay REST API and the Aleo network.
 */
nullpay.checkout.sessions.create(params)    // → Promise<CheckoutSession>
nullpay.checkout.sessions.retrieve(id)      // → Promise<CheckoutSession>

/**
 * ── Webhook Security (Cryptographic) ──
 * Verification helpers for fulfillment endpoints.
 */
nullpay.webhooks.verifySignature(payload, sig) // → boolean (Timing-safe HMAC check)
nullpay.webhooks.constructEvent(payload, sig)  // → WebhookEvent (Verified & Parsed)`;

export const nodeSdkSection: DocsSection = {
    id: 'sdk-node',
    group: 'Overview',
    label: 'Node.js SDK',
    eyebrow: 'SDK',
    title: 'Node.js SDK — Core integration and technical deep-dive',
    summary:
        'The @nullpay/node SDK is the industrial-grade bridge between your backend and the Aleo blockchain. It abstracts the complexity of ZK-proof generation, relayer sponsorship, and blockchain polling into a clean, developer-friendly interface.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Package}
                    title="Dual Compatibility"
                    description="Supports CommonJS and ESM. Optimized for Node.js 16+ runtimes with zero external C++ dependencies."
                />
                <MetricCard
                    icon={ShieldCheck}
                    title="Security Built-in"
                    description="Internal usage of crypto.timingSafeEqual protects your webhooks from timing-attacks during verification."
                />
                <MetricCard
                    icon={Zap}
                    title="Relayer Aware"
                    description="Automatically triggers the DPS Relayer flow if on-chain invoices are missing, covering gas fees for the merchant."
                />
                <MetricCard
                    icon={Settings}
                    title="Serverless First"
                    description="Deterministic file resolution logic ensures nullpay.json loads correctly in Vercel, Netlify, and AWS Lambda."
                />
            </div>

            <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">Installation</h3>
                    <div className="flex items-center gap-2">
                        <a
                            href="https://www.npmjs.com/package/@nullpay/node"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                        >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M0 7.334v8h6.666v2.666H12v-2.666h12v-8H0zm6.666 5.332H4V10h2.666v2.666zm5.334 0h-2.666V10h2.666v2.666zm8 0h-2.666V10h2.666v2.666z" /></svg>
                            npm
                        </a>
                    </div>
                </div>
                <CodeBlock title="Package Manager" language="bash" code={installExample} />
                <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="mb-1 text-sm font-bold text-white">Technical Manifest</p>
                    <ul className="mt-2 space-y-2 text-xs text-gray-400">
                        <li>• <code className="rounded bg-white/5 px-1 py-0.5">NullPay</code>: The primary controller class for all operations.</li>
                        <li>• <b>Full Type Safety</b>: Exported TypeScript interfaces for every request, response, and event object.</li>
                        <li>• <b>Auto-Dependency</b>: Includes <code className="rounded bg-white/5 px-1 py-0.5">node-fetch</code> (embedded) for universal HTTP support.</li>
                    </ul>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-2 text-xl font-bold text-white">Architecture Deep Dive: Serverless Config</h3>
                <p className="mb-4 text-sm text-gray-400">
                    Traditional \`process.cwd()\` resolution often fails in serverless environments because the working directory varies. The NullPay SDK provides two explicit controls to solve this:
                </p>
                <CodeBlock title="lib/nullpay.ts" language="js" code={configExample} />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                        <p className="mb-1 text-xs font-bold text-blue-300 uppercase">When to use projectRoot</p>
                        <p className="text-xs text-gray-400">Set this to <code className="text-gray-300">__dirname</code> when your <code className="text-gray-300">nullpay.json</code> is in the same folder as your SDK initialization script.</p>
                    </div>
                    <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
                        <p className="mb-1 text-xs font-bold text-purple-300 uppercase">When to use configPath</p>
                        <p className="text-xs text-gray-400">Use this for absolute precision, such as when reading from a shared <code className="text-gray-300">/config</code> directory in a containerized environment.</p>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">The SDK Controller Surface</h3>
                <div className="mb-4 text-sm text-gray-400">
                    The SDK is divided into three functional domains. Each domain is optimized for specific stages of the checkout lifecycle.
                </div>
                <CodeBlock title="Full API Reference" language="js" code={sdkApiSurfaceExample} />
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04]">
                        <div className="mb-2 flex items-center gap-2">
                            <Settings className="h-4 w-4 text-orange-300" />
                            <p className="text-xs font-black uppercase tracking-widest text-orange-300">invoices.*</p>
                        </div>
                        <p className="text-xs leading-relaxed text-gray-400">Handles local manifest reading. It validates that your <code className="text-white/80">nullpay.json</code> is syntactically correct and prevents hard-to-debug "invoice not found" runtime errors.</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04]">
                        <div className="mb-2 flex items-center gap-2">
                            <Zap className="h-4 w-4 text-blue-300" />
                            <p className="text-xs font-black uppercase tracking-widest text-blue-300">checkout.*</p>
                        </div>
                        <p className="text-xs leading-relaxed text-gray-400">The core engine. It manages session creation, polls the Aleo blockchain for mapping resolution (up to 2 minutes with exponential backoff), and returns secure payment URLs.</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04]">
                        <div className="mb-2 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-300" />
                            <p className="text-xs font-black uppercase tracking-widest text-emerald-300">webhooks.*</p>
                        </div>
                        <p className="text-xs leading-relaxed text-gray-400">The gatekeeper. It performs bitwise comparison of signatures to prevent side-channel attacks and ensures that only legitimate NullPay events trigger your fulfillment logic.</p>
                    </div>
                </div>
            </GlassCard>

            <Callout title="Production Best Practice: Environment Variables" tone="blue">
                Always store your <code className="rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-200">NULLPAY_SECRET_KEY</code> in a secure environment variable. In your backend, ensure you are reading it correctly using <code className="text-blue-200">process.env.NULLPAY_SECRET_KEY</code> before passing it to the constructor.
            </Callout>
        </div>
    ),
};
