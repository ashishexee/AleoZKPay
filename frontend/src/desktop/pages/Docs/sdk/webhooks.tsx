import { AlertTriangle, Lock, Shield, RefreshCw, Key } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const webhookEventTypeExample = `// TypeScript type for a verified webhook event
// Exported from @nullpay/node

export interface WebhookEvent {
    /** Unique UUID for the checkout session */
    id:         string;                                    
    
    /** The fiat amount (e.g., 99.99) */
    amount:     number;                                    
    
    /** 'CREDITS' | 'USDCX' | 'USAD' */
    token_type: string;                                    
    
    /** Result: SETTLED | FAILED | PROCESSING | PENDING */
    status:     'SETTLED' | 'FAILED' | 'PROCESSING' | 'PENDING';
    
    /** Aleo transaction ID (at1...). Null if payment not yet submitted. */
    tx_id:      string | null;                             
    
    /** ISO 8601 timestamp of when NullPay cloud received the on-chain event. */
    timestamp:  string;                                    
}`;

const securityArchitectureExample = `/**
 * THE MATHEMATICS OF THE SIGNATURE
 * 
 * 1. Payload: The JSON body of the POST request sent to your endpoint.
 * 2. Secret: Your NULLPAY_SECRET_KEY as the HMAC key.
 * 3. Algorithm: HMAC-SHA256.
 * 
 * Signature = HMAC_SHA256(Raw_Body_String, Secret_Key)
 * 
 * WHY TIMING-SAFE EQUALITY?
 * Standard string comparison \`a === b\` returns 'false' immediately at the 
 * first mismatch. An attacker can measure this tiny timing difference to 
 * brute-force the signature character by character. 
 * 
 * crypto.timingSafeEqual() ensures the comparison always takes the same 
 * amount of time, regardless of how many characters match.
 */`;

const fullExpressExample = `/**
 * COMPLETE EXPRESS.JS WEBHOOK IMPLEMENTATION
 * 
 * This example demonstrates:
 * 1. Raw body parsing (Critical for signature verification)
 * 2. Signature verification using constructEvent
 * 3. Idempotent fulfillment logic
 */

const express = require('express');
const { NullPay } = require('@nullpay/node');

const app = express();
const nullpay = new NullPay({ secretKey: process.env.NULLPAY_SECRET_KEY });

// STEP 1: Route with raw body parser
app.post('/webhooks/nullpay', 
    express.raw({ type: 'application/json' }), 
    async (req, res) => {
        const sig = req.headers['x-nullpay-signature'];
        const body = req.body.toString('utf8');

        let event;
        try {
            // STEP 2: Verify and Parse
            event = nullpay.webhooks.constructEvent(body, sig);
        } catch (err) {
            console.error('⚠️ Invalid Webhook Signature:', err.message);
            return res.status(400).send('Webhook verification failed');
        }

        // STEP 3: Idempotent Fulfillment
        // We use the event.id (Session ID) as a unique constraint.
        if (event.status === 'SETTLED') {
            const alreadyProcessed = await db.orders.findUnique({ 
                where: { externalId: event.id } 
            });

            if (!alreadyProcessed) {
                await db.orders.update({
                    where: { externalId: event.id },
                    data: { status: 'PAID', txHash: event.tx_id }
                });
                console.log(\`✅ Order \${event.id} fulfilled.\`);
            }
        }

        // STEP 4: Always return 200 OK
        res.status(200).json({ received: true });
    }
);`;

const retryPolicyExample = `/**
 * DELIVERY RETRY POLICY
 * 
 * If your server returns anything other than 2xx (e.g., 500, 404, 503),
 * NullPay Cloud will retry the delivery following an exponential backoff:
 * 
 * 1. 5 minutes after first failure
 * 2. 30 minutes after second
 * 3. 2 hours after third
 * 4. 12 hours after fourth
 * 5. Discarded after 24 hours
 * 
 * NOTE: Events may arrive out of order (e.g., SETTLED before PROCESSING).
 * Always check session state before acting.
 */`;

export const webhooksSection: DocsSection = {
    id: 'sdk-webhooks',
    group: 'SDK Reference',
    label: 'Webhooks',
    eyebrow: 'SDK',
    title: 'Webhooks — Real-time Fulfillment Architecture',
    summary:
        'Webhooks are the heartbeat of asynchronous payment systems. They allow your backend to receive real-time, on-chain settlement notifications without the need for manual polling.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Shield}
                    title="Cryptographic Guard"
                    description="HMAC-SHA256 signatures ensure that every incoming request originated from the NullPay cloud infrastructure."
                />
                <MetricCard
                    icon={Lock}
                    title="Anti-Timing Protection"
                    description="Bitwise constant-time comparison prevents attackers from sniffing your secret key character-by-character."
                />
                <MetricCard
                    icon={RefreshCw}
                    title="Reliable Delivery"
                    description="Automatic exponential backoff retries ensure your system stays in sync even during server downtime."
                />
                <MetricCard
                    icon={Key}
                    title="Secret Key Bound"
                    description="Signatures are unique to your environment. Test keys and Live keys generate distinct signature chains."
                />
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Security Deep-Dive</h3>
                <p className="mb-4 text-sm text-gray-400">
                    Understanding why we use <code className="text-white/80">timingSafeEqual</code>. Verification is not just about checking equality; it's about checking equality without leaking information.
                </p>
                <CodeBlock title="Cryptographic Principles" language="js" code={securityArchitectureExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Event Object Schema</h3>
                <p className="mb-4 text-sm text-gray-400">
                    The webhook event contains the "Triple Proof": The Session ID, the On-chain Status, and the Aleo Transaction Hash.
                </p>
                <CodeBlock title="WebhookEvent Interface" language="ts" code={webhookEventTypeExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Production Implementation</h3>
                <Callout title="The 'Raw Body' Requirement" tone="orange">
                    Most web frameworks (Express, Fastify, NestJS) parse the incoming JSON by default. Once parsed, the exact spacing and character order of the original HTTP request is lost, making signature verification impossible. **You must access the RAW Buffer.**
                </Callout>
                <div className="my-4" />
                <CodeBlock title="Express.js boilerplate" language="js" code={fullExpressExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <div className="mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-400" />
                    <h3 className="text-xl font-bold text-white">Handling Failures & Retries</h3>
                </div>
                <p className="mb-4 text-sm text-gray-400">
                    Blockchain events are permanent, but your server might not be. NullPay handles volatility with a robust delivery queue.
                </p>
                <CodeBlock title="Retry Backoff Logic" language="js" code={retryPolicyExample} />
                <Callout title="Idempotency is Mandatory" tone="blue">
                    Since NullPay retries deliveries, your server might receive the same <code className="text-white/80">SETTLED</code> event twice. Always check your database to see if a session has already been fulfilled before granting access or shipping products.
                </Callout>
            </GlassCard>
        </div>
    ),
};
