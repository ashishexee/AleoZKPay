import { AlertTriangle, Lock, Shield, Zap } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const webhookEventTypeExample = `// TypeScript type for a verified webhook event

export interface WebhookEvent {
    id:         string;                                    // Session UUID
    amount:     number;                                    // Amount paid
    token_type: string;                                    // 'CREDITS' | 'USDCX' | 'USAD'
    status:     'SETTLED' | 'FAILED' | 'PROCESSING' | 'PENDING';
    tx_id:      string | null;                             // Aleo tx ID ('at1...') or null
    timestamp:  string;                                    // ISO 8601 string
}`;

const hmacVerificationExample = `// ─── How HMAC-SHA256 signature is computed by NullPay ────────────────────
//
// The NullPay backend signs the webhook payload using HMAC-SHA256:
//   signature = HMAC-SHA256(rawBody, NULLPAY_SECRET_KEY)
//
// The signature is attached as the header:
//   x-nullpay-signature: <hex string>
//
// ─── How the SDK verifies it ──────────────────────────────────────────────
//
// From the SDK source (webhooks.verifySignature):
//
//   const expectedSignature = crypto
//       .createHmac('sha256', this.secretKey)
//       .update(payload)   // payload = raw request body as string
//       .digest('hex');
//
//   return crypto.timingSafeEqual(
//       Buffer.from(signature, 'utf8'),        // received signature
//       Buffer.from(expectedSignature, 'utf8') // computed signature
//   );
//
// timingSafeEqual prevents timing-attack-based signature forgery.
// An early-exit string comparison would leak info about how many
// characters match — timingSafeEqual always takes constant time.
//
// Note: length check is done first (fast path):
//   if (expectedSignature.length !== signature.length) return false;`;

const webhookFullExample = `// ─── Complete webhook handler (Express) ─────────────────────────────────
// CRITICAL: Use raw body parser — do NOT parse as JSON before verification.

const express = require('express');
const app = express();

// Raw body parser for webhook route:
app.post('/api/webhook', 
    express.raw({ type: 'application/json' }),  // ← raw string, not parsed JSON
    (req, res) => {
        const signature = req.headers['x-nullpay-signature'];
        const rawBody = req.body.toString('utf8');

        let event;
        try {
            // verifies HMAC + parses JSON in one call
            event = nullpay.webhooks.constructEvent(rawBody, signature);
        } catch (err) {
            // Invalid signature — reject the request
            return res.status(400).send(\`Webhook Error: \${err.message}\`);
        }

        // ── Process event ────────────────────────────────────────────────
        switch (event.status) {
            case 'SETTLED':
                console.log('Payment confirmed:', event.id, event.tx_id);
                await fulfillOrder(event.id);
                break;
            case 'FAILED':
                console.warn('Payment failed:', event.id);
                await cancelOrder(event.id);
                break;
            case 'PROCESSING':
                // On-chain, but not yet finalized
                break;
        }

        // Always respond 200 to prevent retries
        res.status(200).json({ received: true });
    }
);`;

const verifySignatureExample = `// ─── Low-level: verifySignature (separate from constructEvent) ───────────
// Use when you want to verify first and parse separately.

const isValid = nullpay.webhooks.verifySignature(
    req.body.toString('utf8'),              // raw payload string
    req.headers['x-nullpay-signature']      // header value
);

if (!isValid) {
    return res.status(400).send('Invalid signature');
}

const event = JSON.parse(req.body.toString('utf8'));

// vs. constructEvent (does both atomically):
const event = nullpay.webhooks.constructEvent(
    req.body.toString('utf8'),
    req.headers['x-nullpay-signature']
);
// Throws: "Invalid NullPay Webhook Signature. This request might be spoofed."`;

const webhookVsRedirectExample = `// ─── Webhook vs. session retrieve — when to use which ───────────────────

// Option A: Session retrieve on redirect return
//   - User returns to success_url with ?session_id=...
//   - Your backend calls sessions.retrieve(id) and checks status
//   - ✓ Simple to implement
//   - ✗ Fails if user closes the browser before redirect
//   - ✗ Fails if redirect page is closed mid-load

// Option B: Webhook (event-driven, server-side)
//   - NullPay backend POSTs to your registered webhook URL on settlement
//   - Your backend verifies signature and fulfills
//   - ✓ Reliable — works even if buyer never returns
//   - ✓ Decoupled from browser state
//   - ✗ Requires a public HTTPS endpoint

// Recommendation: Use BOTH
//   1. Webhook as the primary fulfillment path (reliable)
//   2. Session retrieve as the fallback check on redirect return
//   3. Make fulfillment idempotent (safe to call twice with the same session_id)`;

export const webhooksSection: DocsSection = {
    id: 'sdk-webhooks',
    group: 'SDK Reference',
    label: 'Webhooks',
    eyebrow: 'SDK',
    title: 'nullpay.webhooks.* — HMAC verification and event handling',
    summary:
        'The webhooks namespace provides two methods: verifySignature() (returns boolean) and constructEvent() (verifies and parses in one call, throws on invalid signature). Both use HMAC-SHA256 with crypto.timingSafeEqual to prevent timing attacks. Always verify before processing.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Shield}
                    title="HMAC-SHA256"
                    description="Webhooks are signed using HMAC-SHA256 with your NULLPAY_SECRET_KEY. The signature is in the x-nullpay-signature header."
                />
                <MetricCard
                    icon={Lock}
                    title="timingSafeEqual"
                    description="The SDK uses Node's crypto.timingSafeEqual for constant-time comparison — preventing timing-attack-based signature forgery."
                />
                <MetricCard
                    icon={Zap}
                    title="Raw body required"
                    description="Verification must happen on the raw string body before JSON parsing. Use express.raw() or the equivalent raw body middleware."
                />
                <MetricCard
                    icon={AlertTriangle}
                    title="Always return 200"
                    description="Even for events you don't handle, return 200. Otherwise NullPay retries the event delivery and you get duplicates."
                />
            </div>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">WebhookEvent type</h3>
                <CodeBlock title="WebhookEvent TypeScript interface" language="ts" code={webhookEventTypeExample} />
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                    {[
                        { field: 'status = SETTLED', desc: 'Payment confirmed on-chain. Safe to fulfill.' },
                        { field: 'status = FAILED', desc: 'Payment failed or expired. Cancel/refund if needed.' },
                        { field: 'status = PROCESSING', desc: 'Transaction submitted, not yet finalized on-chain.' },
                        { field: 'tx_id', desc: 'Aleo transaction ID (at1...). Null until on-chain confirmation.' },
                    ].map(({ field, desc }) => (
                        <div key={field} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                            <code className="mb-1 block text-[11px] font-bold text-orange-300">{field}</code>
                            <p className="text-[11px] leading-relaxed text-gray-400">{desc}</p>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">HMAC-SHA256 — how it works</h3>
                <CodeBlock title="Signature algorithm (from SDK source)" language="js" code={hmacVerificationExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Complete webhook handler</h3>
                <CodeBlock title="Full webhook route (Express)" language="js" code={webhookFullExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">verifySignature vs. constructEvent</h3>
                <CodeBlock title="Two verification methods compared" language="js" code={verifySignatureExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Webhook vs. session retrieve</h3>
                <CodeBlock title="Which approach to use when" language="js" code={webhookVsRedirectExample} />
                <Callout title="Make fulfillment idempotent" tone="blue">
                    It's possible for both the redirect and the webhook to trigger fulfillment. Design your <code className="rounded bg-white/10 px-1.5 py-0.5">fulfillOrder(sessionId)</code> to be idempotent — check if the order is already fulfilled before acting. Using the <code className="rounded bg-white/10 px-1.5 py-0.5">session.id</code> as a unique key in your database prevents double-fulfillment.
                </Callout>
            </GlassCard>
        </div>
    ),
};
