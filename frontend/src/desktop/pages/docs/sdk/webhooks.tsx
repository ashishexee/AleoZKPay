import { AlertTriangle, Shield, Server, Database, Globe } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const webhookEventTypeExample = `// Webhook event sent to your backend when payment status changes
// Verify this with nullpay.webhooks.constructEvent()

interface WebhookEvent {
    /** Unique UUID for the checkout session (use as idempotency key) */
    id:         string;
    /** The crypto amount paid (e.g., 1.00) */
    amount:     number;
    /** Token type: 'CREDITS' | 'USDCX' | 'USAD' */
    token_type: string;
    /** Payment status: SETTLED | FAILED | PROCESSING | PENDING */
    status:     'SETTLED' | 'FAILED' | 'PROCESSING' | 'PENDING';
    /** Aleo transaction ID (at1...). Null if payment not yet submitted. */
    tx_id:      string | null;
    /** Invoice name from your nullpay.json (e.g., 'basic-credits') */
    nullpay_invoice_name?: string;
    /** ISO 8601 timestamp */
    timestamp:  string;
}`;

const step1Setup = `/**
 * STEP 1: Initialize NullPay with your Secret Key
 *
 * Get your secret key from the NullPay Developer Portal:
 * https://nullpay.app/developer
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { NullPay } = require('@nullpay/node');

const app = express();
app.use(cors());

const nullpay = new NullPay({
    secretKey: process.env.NULLPAY_SECRET_KEY,
    baseURL: process.env.NULLPAY_BASE_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api',
    projectRoot: __dirname,
    configPath: path.join(__dirname, 'nullpay.json')
});`;

const step2Webhook = `/**
 * STEP 2: Webhook Endpoint - Receive payment notifications
 *
 * IMPORTANT: Use express.raw() for the webhook route!
 * This preserves the raw body for HMAC signature verification.
 *
 * Register this endpoint in NullPay Developer Portal:
 * https://nullpay.app/developer
 * Endpoint URL: https://your-backend.com/api/webhook
 */

// In-memory store for demo (use Redis/DB in production)
const orderStatusStore = new Map();

app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const signature = req.headers['x-nullpay-signature'];

    try {
        const event = nullpay.webhooks.constructEvent(req.body.toString(), signature);
        console.log('[Webhook] Event received:', event.id, event.status);

        if (event.status === 'SETTLED') {
            orderStatusStore.set(event.id, {
                status: 'SETTLED',
                txId: event.tx_id,
                amount: event.amount,
                tokenType: event.token_type,
                invoiceName: event.nullpay_invoice_name || null,
                timestamp: Date.now()
            });
            console.log('[Webhook] Order SETTLED! TX:', event.tx_id);
        }

        res.status(200).json({ received: true });
    } catch (err) {
        console.error('[Webhook] Verification failed:', err.message);
        res.status(400).send('Webhook Error: ' + err.message);
    }
});`;

const step3OrderStatus = `/**
 * STEP 3: Order Status Endpoint - For frontend polling
 *
 * Your frontend polls this endpoint to check payment status.
 */

app.get('/api/order-status/:sessionId', (req, res) => {
    const { sessionId } = req.params;

    const stored = orderStatusStore.get(sessionId);
    if (stored) {
        return res.json({
            status: stored.status,
            txId: stored.txId,
            amount: stored.amount,
            tokenType: stored.tokenType,
            invoiceName: stored.invoiceName
        });
    }

    nullpay.checkout.sessions.retrieve(sessionId)
        .then(session => {
            return res.json({
                status: session.status,
                txId: session.tx_id || null,
                amount: session.amount || null,
                tokenType: session.currency || null,
                invoiceName: session.nullpay_invoice_name || null
            });
        })
        .catch(err => {
            res.status(500).json({ error: err.message });
        });
});`;

const step4Frontend = `/**
 * STEP 4: Frontend - Success Page with Polling
 */

const API_BASE = '/api';

function SuccessPage() {
    const [status, setStatus] = useState('PENDING');
    const [txId, setTxId] = useState(null);

    useEffect(() => {
        const sessionId = new URLSearchParams(window.location.search).get('session_id');
        if (!sessionId) return;

        let isPolling = true;
        const checkStatus = async () => {
            if (!isPolling) return;
            try {
                const res = await fetch(\`\${API_BASE}/order-status/\${sessionId}\`);
                const data = await res.json();
                if (data.status === 'SETTLED') {
                    isPolling = false;
                    setStatus('SETTLED');
                    setTxId(data.txId);
                }
            } catch (err) { console.error('Error:', err); }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 3000);
        return () => { isPolling = false; clearInterval(interval); };
    }, []);

    return status === 'SETTLED'
        ? <div><h1>Payment Confirmed!</h1><p>TX: {txId}</p></div>
        : <div><h1>Verifying Payment...</h1></div>;
}`;

const step5NullpayJson = `/**
 * STEP 5: nullpay.json - Define your products/invoices
 */

{
  "merchant": "aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0",
  "invoices": [
    {
      "name": "basic-credits",
      "type": "multipay",
      "amount": 1,
      "currency": "CREDITS",
      "title": "basic credits"
    },
    {
      "name": "support-donation",
      "type": "donation",
      "amount": null,
      "currency": "ANY",
      "title": "Support the project"
    }
  ]
}`;

const retryPolicyExample = `/**
 * RETRY POLICY
 *
 * If your server returns non-2xx, NullPay retries:
 * Attempt 1: Immediate
 * Attempt 2: 5 minutes
 * Attempt 3: 30 minutes
 * Attempt 4: 2 hours
 * Attempt 5: 12 hours
 * Then: Discarded after 24 hours
 */`;

export const webhooksSection: DocsSection = {
    id: 'sdk-webhooks',
    group: 'SDK Reference',
    label: 'Webhooks',
    eyebrow: 'SDK',
    title: 'Webhooks — Complete Implementation',
    summary:
        'A step-by-step guide to integrating NullPay webhooks. Includes real working code from the testing website.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Server}
                    title="4-Step Setup"
                    description="Initialize SDK, create webhook endpoint, add status polling, integrate frontend."
                />
                <MetricCard
                    icon={Database}
                    title="Any Storage Works"
                    description="Use in-memory Map for demos, Redis for production. Your webhook fills the store."
                />
                <MetricCard
                    icon={Globe}
                    title="Survives Tab Close"
                    description="Store pending checkout in localStorage. Webhook confirms payment even after browser closes."
                />
                <MetricCard
                    icon={Shield}
                    title="HMAC Secured"
                    description="Every webhook is signed with your secret key. Verify before processing."
                />
            </div>

            <GlassCard className="p-6">
                <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold">1</span>
                    <h3 className="text-xl font-bold text-white">Initialize NullPay SDK</h3>
                </div>
                <p className="mb-4 text-sm text-gray-400">
                    Set up Express with CORS and initialize NullPay with your secret key from the developer portal.
                </p>
                <CodeBlock title="backend/index.js - Setup" language="js" code={step1Setup} />
            </GlassCard>

            <GlassCard className="p-6">
                <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold">2</span>
                    <h3 className="text-xl font-bold text-white">Webhook Endpoint</h3>
                </div>
                <p className="mb-4 text-sm text-gray-400">
                    This endpoint receives signed notifications when payments settle on-chain.
                </p>
                <Callout title="Critical: Use express.raw()" tone="orange">
                    Do NOT use <code className="text-white/80">express.json()</code> for the webhook route.
                    The raw body is required for HMAC signature verification.
                </Callout>
                <div className="my-4" />
                <CodeBlock title="backend/index.js - Webhook Handler" language="js" code={step2Webhook} />
            </GlassCard>

            <GlassCard className="p-6">
                <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold">3</span>
                    <h3 className="text-xl font-bold text-white">Order Status Endpoint</h3>
                </div>
                <p className="mb-4 text-sm text-gray-400">
                    Your frontend polls this endpoint to get payment status.
                </p>
                <CodeBlock title="backend/index.js - Order Status" language="js" code={step3OrderStatus} />
            </GlassCard>

            <GlassCard className="p-6">
                <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold">4</span>
                    <h3 className="text-xl font-bold text-white">Frontend Success Page</h3>
                </div>
                <p className="mb-4 text-sm text-gray-400">
                    Poll the order status endpoint every 3 seconds.
                </p>
                <CodeBlock title="frontend/src/Success.tsx" language="tsx" code={step4Frontend} />
            </GlassCard>

            <GlassCard className="p-6">
                <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold">5</span>
                    <h3 className="text-xl font-bold text-white">Define Your Invoices</h3>
                </div>
                <p className="mb-4 text-sm text-gray-400">
                    Create invoice definitions in nullpay.json.
                </p>
                <CodeBlock title="backend/nullpay.json" language="json" code={step5NullpayJson} />
            </GlassCard>

            <GlassCard className="p-6">
                <div className="mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-400" />
                    <h3 className="text-xl font-bold text-white">Handling Failures & Retries</h3>
                </div>
                <CodeBlock title="Retry Policy" language="js" code={retryPolicyExample} />
                <Callout title="Idempotency is Mandatory" tone="blue">
                    Since NullPay retries deliveries, your server might receive the same SETTLED event twice.
                    Always check if a session has already been fulfilled.
                </Callout>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Webhook Event Schema</h3>
                <CodeBlock title="TypeScript Interface" language="ts" code={webhookEventTypeExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Security: HMAC Verification</h3>
                <p className="mb-4 text-sm text-gray-400">
                    Every webhook is signed with HMAC-SHA256 using your secret key.
                    The signature is in the <code className="text-white/80">x-nullpay-signature</code> header.
                </p>
                <Callout title="Never skip verification" tone="orange">
                    Always verify the signature before processing a webhook.
                    This prevents attackers from spoofing payment notifications.
                </Callout>
            </GlassCard>
        </div>
    ),
};