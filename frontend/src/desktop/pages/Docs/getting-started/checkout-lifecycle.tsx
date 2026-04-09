import { Activity, ArrowRight, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const sessionLifecycleExample = `// 1. Merchant backend creates the session
const session = await nullpay.checkout.sessions.create({
  amount: 25,
  currency: 'USDCX',
  success_url: 'https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url:  'https://yourapp.com/cancel',
});
// session.id = "ses_abc123"
// session.checkout_url = "https://nullpay.app/checkout/ses_abc123"

// 2. Redirect buyer to hosted checkout
res.redirect(303, session.checkout_url);

// 3. Buyer completes payment, is redirected to success_url
// URL: https://yourapp.com/success?session_id=ses_abc123

// 4. Backend verifies the session before fulfilling
const verified = await nullpay.checkout.sessions.retrieve('ses_abc123');
if (verified.status === 'SETTLED') {
  // ✅ Safe to fulfill order
}`;

const sessionStatusExample = `// Possible session status values:
// PENDING  → Session created, no payment submitted yet
// SETTLED  → Payment confirmed on Aleo; safe to fulfill
// FAILED   → Payment attempt failed or was rejected
// EXPIRED  → Session timed out before payment was completed

const session = await nullpay.checkout.sessions.retrieve(session_id);

switch (session.status) {
  case 'SETTLED':
    await fulfillOrder(session.id);
    break;
  case 'PENDING':
    // Poll again or wait for webhook
    break;
  case 'FAILED':
  case 'EXPIRED':
    await redirectToCancelPage();
    break;
}`;

const webhookVerifyExample = `// Always verify the webhook signature before trusting the event
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-nullpay-signature'];

  try {
    const event = nullpay.webhooks.constructEvent(req.body, signature);

    if (event.status === 'SETTLED') {
      // Access event.id (session ID) and event.tx_id (Aleo tx hash)
      console.log('Payment settled:', event.id, event.tx_id);
      await fulfillOrder(event.id);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    // Invalid signature — reject immediately
    res.status(400).send(\`Webhook Error: \${err.message}\`);
  }
});`;

export const checkoutLifecycleSection: DocsSection = {
    id: 'gs-checkout-lifecycle',
    group: 'Core Concepts',
    label: 'Checkout Lifecycle',
    eyebrow: 'Core Concepts',
    title: 'The hosted checkout lifecycle',
    summary:
        'Every NullPay payment flows through a hosted checkout session. Understanding the lifecycle — creation, buyer payment, settlement, verification, and fulfillment — is the most important thing to get right in any integration.',
    content: (
        <div className="space-y-6">
            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-300">End-to-end flow</p>
                    <h3 className="mt-1 text-xl font-bold text-white">Session lifecycle steps</h3>
                </div>
                <div className="divide-y divide-white/[0.06] px-6">
                    {[
                        {
                            step: '01',
                            title: 'Backend creates a checkout session',
                            desc: 'Your server calls nullpay.checkout.sessions.create() with the payment parameters. The NullPay backend registers a new session and returns a checkout_url.',
                        },
                        {
                            step: '02',
                            title: 'Buyer is redirected to the hosted checkout',
                            desc: 'Your server redirects the buyer to the checkout_url. This is a NullPay-hosted page where the buyer connects their wallet, reviews the payment, and submits the Aleo transaction. Your backend is not involved in this step.',
                        },
                        {
                            step: '03',
                            title: 'Aleo transaction is submitted and confirmed',
                            desc: 'The buyer\'s wallet generates a zero-knowledge proof and submits the private transfer and invoice payment to the Aleo network. The session status moves from PENDING to SETTLED once confirmed.',
                        },
                        {
                            step: '04',
                            title: 'Buyer is redirected to success_url',
                            desc: 'NullPay appends the session_id to your success_url and redirects the buyer back to your app. This redirect alone is not proof of payment — always verify the session status on the server.',
                        },
                        {
                            step: '05',
                            title: 'Backend verifies and fulfills',
                            desc: 'Your backend calls sessions.retrieve(session_id) to confirm status === "SETTLED". Only after this check should you fulfill the order, unlock access, or send a confirmation email.',
                        },
                        {
                            step: '06',
                            title: 'Webhook fires (optional but recommended)',
                            desc: 'If you configured a webhook_url, NullPay also sends a signed POST with the settled event. Verify the x-nullpay-signature header before acting. This handles async cases where the buyer closes the window early.',
                        },
                    ].map(({ step, title, desc }) => (
                        <div key={step} className="flex gap-5 py-5">
                            <span className="shrink-0 pt-0.5 font-mono text-[11px] font-black text-gray-600">{step}</span>
                            <div>
                                <p className="mb-1 text-sm font-bold text-white">{title}</p>
                                <p className="text-xs leading-relaxed text-gray-400">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Clock}
                    title="PENDING"
                    description="Session was created but no payment has been submitted yet. Do not fulfill."
                />
                <MetricCard
                    icon={CheckCircle}
                    title="SETTLED"
                    description="Payment confirmed on the Aleo network. The merchant can safely fulfill the order."
                />
                <MetricCard
                    icon={XCircle}
                    title="FAILED"
                    description="The payment transaction was rejected by the Aleo network."
                />
                <MetricCard
                    icon={Activity}
                    title="EXPIRED"
                    description="The checkout session window elapsed before payment was completed."
                />
            </div>

            <CodeBlock title="Full lifecycle — backend routes" language="js" code={sessionLifecycleExample} />

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">
                    <ArrowRight className="inline mr-2 h-5 w-5 text-orange-300" />
                    The {'{CHECKOUT_SESSION_ID}'} placeholder
                </h3>
                <p className="mb-3 text-sm leading-relaxed text-gray-400">
                    When you create a session, NullPay replaces the literal string <code className="rounded bg-white/5 px-1.5 py-0.5 text-orange-300">{'{CHECKOUT_SESSION_ID}'}</code> in your <code className="rounded bg-white/5 px-1.5 py-0.5 text-white">success_url</code> with the actual session ID before redirecting the buyer back to your app. This means you don't need to know the ID ahead of time — you just include the placeholder.
                </p>
                <div className="rounded-lg border border-white/[0.08] bg-black/40 p-4">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-orange-300">Your success_url template</p>
                    <code className="block text-xs text-gray-300">
                        https://yourapp.com/success?session_id=<span className="text-orange-300">{'{CHECKOUT_SESSION_ID}'}</span>
                    </code>
                    <p className="mt-3 mb-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">After redirect (actual URL)</p>
                    <code className="block text-xs text-gray-300">
                        https://yourapp.com/success?session_id=<span className="text-emerald-300">ses_x8K2mP...</span>
                    </code>
                </div>
            </GlassCard>

            <CodeBlock title="Session status handling" language="js" code={sessionStatusExample} />

            <CodeBlock title="Webhook verification (recommended)" language="js" code={webhookVerifyExample} />

            <Callout title="Never trust the redirect alone" tone="orange">
                A buyer who knows the session ID could construct a success URL manually. Always verify session status on the backend with <code className="rounded bg-white/10 px-1.5 py-0.5">sessions.retrieve()</code> or a verified webhook event before fulfilling anything of value.
            </Callout>
        </div>
    ),
};
