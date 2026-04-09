import { Code2, FileCode, Terminal } from 'lucide-react';
import type { DocsSection } from '../types';
import { testingWebsiteBackendExample } from '../examples';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const testingWebsiteStructureExample = `// testing-website/ — full structure of the reference backend

testing-website/
├── backend/
│   └── index.js          ← Express server — the reference integration
├── frontend/
│   └── ...               ← Static HTML/JS buyer-facing pages
└── nullpay.json          ← Pre-generated invoice manifest for this demo`;

const sdkInitInBackendExample = `// testing-website/backend/index.js — SDK initialization
const path    = require('path');
const express = require('express');
const { NullPay } = require('@nullpay/node');

const app = express();
app.use(express.json());

const nullpay = new NullPay({
    secretKey:   process.env.NULLPAY_SECRET_KEY,
    baseURL:     process.env.NULLPAY_BASE_URL,
    // projectRoot points to the backend directory.
    // nullpay.json is resolved as: __dirname + '/nullpay.json'
    projectRoot: __dirname,
    configPath:  path.join(__dirname, 'nullpay.json'),
});

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';`;

const routeRegistrationExample = `// ─── Dynamic route registration from nullpay.json ────────────────────────
// For every invoice in nullpay.json, register a POST handler.

for (const invoice of nullpay.invoices.getAll()) {
    app.post(\`/api/\${invoice.name}\`, async (req, res) => {
        try {
            const session = await nullpay.checkout.sessions.create({
                nullpay_invoice_name: invoice.name,
                success_url: \`\${frontendUrl}?session_id={CHECKOUT_SESSION_ID}&type=\${buildSuccessType(invoice)}\`,
                cancel_url:  \`\${frontendUrl}?cancel=true\`,
            });

            // Return the hosted checkout URL to the buyer's frontend
            res.json({ checkoutUrl: session.checkout_url });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
}

// For a nullpay.json with 2 invoices ("basic-usdcx", "support-any"),
// this creates:
//   POST /api/basic-usdcx   → creates a session for the multipay invoice
//   POST /api/support-any   → creates a session for the donation invoice`;

const variableRouteExample = `// ─── Variable-price checkout route ────────────────────────────────────────
// Buyer sends { currency, price, tokens } from frontend.
// No pre-generated invoice — SDK creates one dynamically via DPS relayer.

app.post('/api/checkout/variable', async (req, res) => {
    const { currency, price, tokens } = req.body;

    const session = await nullpay.checkout.sessions.create({
        amount:   price,     // buyer-specified price
        currency: currency,  // buyer-specified token
        type:     'standard', // single-use invoice
        success_url: \`\${frontendUrl}?session_id={CHECKOUT_SESSION_ID}&type=variable&tokens=\${tokens}\`,
        cancel_url:  \`\${frontendUrl}?cancel=true\`,
    });

    res.json({ checkoutUrl: session.checkout_url });
});

// ⚠️ This route uses the SDK's DPS relayer flow:
//   - Random salt generated client-side via crypto.randomBytes(16)
//   - Invoice created on-chain by the relayer (up to 120s wait)
//   - Polling the Aleo blockchain for hash confirmation
//   - Session created with confirmed hash
//
// For production, instrument this with a loading state on the frontend.`;

const verifyRouteExample = `// ─── Session verification route ───────────────────────────────────────────
// Called by the frontend after buyer returns from hosted checkout success URL.

app.get('/api/verify', async (req, res) => {
    const { session_id } = req.query;

    if (!session_id) {
        return res.status(400).json({ error: 'session_id is required' });
    }

    try {
        const session = await nullpay.checkout.sessions.retrieve(session_id);

        if (session.status === 'SETTLED') {
            // ─── Fulfill order server-side ───────────────────────────────
            // Example: grant access, send email, update DB, etc.
            res.json({  status: 'SETTLED',  session_id });
        } else {
            res.status(202).json({ status: session.status });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});`;

export const backendExampleSection: DocsSection = {
    id: 'sdk-backend-example',
    group: 'Config',
    label: 'Backend Example',
    eyebrow: 'SDK',
    title: 'testing-website backend — the complete reference integration',
    summary:
        'The testing-website/backend directory is the canonical reference for NullPay SDK integration. It demonstrates dynamic route registration from nullpay.json, variable-price checkout with the DPS relayer, named invoice sessions, and session status verification — all in a single Express server.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-3">
                <MetricCard
                    icon={FileCode}
                    title="testing-website/backend"
                    description="The canonical reference integration. One file — shows all SDK patterns in a production-like structure."
                />
                <MetricCard
                    icon={Terminal}
                    title="3 patterns covered"
                    description="Dynamic routes + nullpay.json, variable-price checkout with DPS relayer, session verification on redirect return."
                />
                <MetricCard
                    icon={Code2}
                    title="Zero boilerplate"
                    description="No custom hash derivation. No direct Aleo SDK calls. The @nullpay/node SDK handles everything."
                />
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Project structure</h3>
                <CodeBlock title="testing-website/ directory layout" language="text" code={testingWebsiteStructureExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">SDK initialization</h3>
                <CodeBlock title="backend/index.js — setup" language="js" code={sdkInitInBackendExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Dynamic route registration from nullpay.json</h3>
                <CodeBlock title="Automatic route creation per invoice" language="js" code={routeRegistrationExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Variable-price checkout route</h3>
                <CodeBlock title="Dynamic price session creation" language="js" code={variableRouteExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Session verification route</h3>
                <CodeBlock title="Status check on redirect return" language="js" code={verifyRouteExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Full reference — original file from testing-website</h3>
                <CodeBlock title="testing-website/backend/index.js (condensed)" language="js" code={testingWebsiteBackendExample} />
                <Callout title="Use this as your starting point" tone="orange">
                    Fork <code className="rounded bg-white/10 px-1.5 py-0.5">testing-website/backend/index.js</code> as the starting point for your integration. The file is deliberately minimal — it contains exactly the patterns you need and nothing else. Replace <code className="rounded bg-white/10 px-1.5 py-0.5">frontendUrl</code> with your own domain and add your order fulfillment logic after the <code className="rounded bg-white/10 px-1.5 py-0.5">SETTLED</code> check.
                </Callout>
            </GlassCard>
        </div>
    ),
};
