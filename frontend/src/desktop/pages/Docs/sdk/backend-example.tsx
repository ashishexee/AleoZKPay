import { Code2, FileCode, Terminal, Server, ShieldCheck, Zap } from 'lucide-react';
import type { DocsSection } from '../types';
import { testingWebsiteBackendExample } from '../examples';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const productionBoilerplateExample = `/**
 * PRODUCTION-READY BACKEND BOILERPLATE
 * 
 * Features:
 * 1. SDK Singleton Initialization
 * 2. Environment Variable Validation
 * 3. Structured Error Handling
 * 4. Idempotent Order Fulfillment
 */

const express = require('express');
const { NullPay } = require('@nullpay/node');

// 1. Initialization with Validation
if (!process.env.NULLPAY_SECRET_KEY) {
    throw new Error('FATAL: NULLPAY_SECRET_KEY is missing from environment.');
}

const nullpay = new NullPay({
    secretKey: process.env.NULLPAY_SECRET_KEY,
    projectRoot: __dirname // Ensures nullpay.json is found in the same folder
});

const app = express();

// 2. Checkout Endpoint
app.post('/api/create-session', express.json(), async (req, res) => {
    try {
        const { planId } = req.body;
        
        const session = await nullpay.checkout.sessions.create({
            nullpay_invoice_name: planId,
            success_url: \`\${process.env.FRONTEND_URL}/success?id={CHECKOUT_SESSION_ID}\`,
            cancel_url:  \`\${process.env.FRONTEND_URL}/pricing\`,
        });

        res.json({ url: session.checkout_url });
    } catch (err) {
        console.error('❌ Failed to create session:', err.message);
        res.status(500).json({ error: 'Payment gateway unavailable' });
    }
});

// 3. Status Verification (Redirect Fallback)
app.get('/api/verify-payment', async (req, res) => {
    const { id } = req.query;
    
    try {
        const session = await nullpay.checkout.sessions.retrieve(id);
        
        if (session.status === 'SETTLED') {
            await fulfillOrder(id); // Your business logic
            return res.json({ success: true });
        }
        
        res.json({ success: false, status: session.status });
    } catch (err) {
        res.status(404).json({ error: 'Session not found' });
    }
});`;

export const backendExampleSection: DocsSection = {
    id: 'sdk-backend-example',
    group: 'Reference',
    label: 'Backend Reference',
    eyebrow: 'SDK',
    title: 'Reference Implementation — The Reference Backend',
    summary:
        'The reference backend serves as the blueprint for production-grade NullPay integrations. It covers initialization, routing, and verification patterns using modern Express.js practices.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Server}
                    title="Stateless Ops"
                    description="The SDK is designed to be stateless, making it compatible with horizontal scaling and serverless functions."
                />
                <MetricCard
                    icon={ShieldCheck}
                    title="Safe Defaults"
                    description="Internal logging is kept minimal to prevent leaking sensitive API keys into your application logs."
                />
                <MetricCard
                    icon={Zap}
                    title="Retry Resilient"
                    description="The SDK handles temporary Aleo network timeouts automatically with an internal exponential backoff."
                />
                <MetricCard
                    icon={FileCode}
                    title="Ecosystem Ready"
                    description="Compatible with Express, Fastify, Next.js, and Koa. Zero vendor lock-in on routing libraries."
                />
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Full Reference Implementation</h3>
                <p className="mb-4 text-sm text-gray-400">
                    This boilerplate provides a battle-tested structure for handling checkouts and status verifications.
                </p>
                <CodeBlock title="Node.js Reference Server" language="js" code={productionBoilerplateExample} />
            </GlassCard>

            <GlassCard className="p-6 border-blue-500/20 bg-blue-500/5">
                <h3 className="mb-4 text-xl font-bold text-white">Common Integration Gotchas</h3>
                <ul className="space-y-3 text-sm text-gray-400">
                    <li className="flex gap-2">
                        <span className="text-blue-400 font-bold">•</span>
                        <span><b>CORS Setup:</b> Ensure your backend allows requests from your frontend domain.</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-blue-400 font-bold">•</span>
                        <span><b>Memory Leaks:</b> Always instantiate the <code className="text-white/80">NullPay</code> class once as a singleton. Do not create a new instance inside every request handler.</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-blue-400 font-bold">•</span>
                        <span><b>Z-Index Issues:</b> If using a modal for checkout redirects, ensure the window opening logic is initiated by a user gesture to prevent browser popup blockers.</span>
                    </li>
                </ul>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Condensed reference — original file from testing-website</h3>
                <CodeBlock title="testing-website/backend/index.js (condensed)" language="js" code={testingWebsiteBackendExample} />
            </GlassCard>

            <Callout title="Security Checklist" tone="blue">
                Before deploying to production, verify that:
                1. <code className="text-blue-200">NULLPAY_SECRET_KEY</code> is not hardcoded.
                2. Your webhook endpoints are publicly accessible via HTTPS.
                3. You have implemented idempotency checks (using <code className="text-blue-200">session_id</code> as a unique DB key).
            </Callout>
        </div>
    ),
};
