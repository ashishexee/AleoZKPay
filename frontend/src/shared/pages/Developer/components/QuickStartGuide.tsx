import React from 'react';
import { CheckCircle, Key, Terminal } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { DeveloperCodeBlock } from './DeveloperCodeBlock';
import { DeveloperStepCard } from './DeveloperStepCard';

export const QuickStartGuide: React.FC = () => {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <DeveloperStepCard step="01" title="Install SDK" desc="Use the official Node client in your merchant backend." icon={Terminal} />
                <DeveloperStepCard step="02" title="Create Session" desc="Call the SDK from your backend route when the buyer starts checkout." icon={Key} />
                <DeveloperStepCard step="03" title="Verify And Fulfill" desc="Retrieve the session or wait for the webhook before fulfillment." icon={CheckCircle} />
            </div>

            <GlassCard className="p-8 md:p-10">
                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">Quick Start</span>
                <h2 className="text-3xl font-bold text-white mt-3 mb-2">Backend Integration In 3 Steps</h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-8">
                    This is the same flow the demo merchant backend uses: your server creates the checkout session, the buyer is redirected to NullPay hosted checkout, and your backend verifies settlement afterwards.
                </p>

                <DeveloperCodeBlock
                    title="1. Install And Initialize"
                    code={`import { NullPay } from '@nullpay/node';

const nullpay = new NullPay({
  secretKey: process.env.NULLPAY_SECRET_KEY!,
  baseURL: 'https://nullpay.app/api', // optional override for local dev
});`}
                />

                <DeveloperCodeBlock
                    title="2. Create A Checkout Route"
                    code={`app.post('/api/checkout/variable', async (req, res) => {
  const { currency, price, tokens } = req.body;

  const session = await nullpay.checkout.sessions.create({
    amount: price,
    currency,
    success_url: \`https://yoursite.com/success?session_id={CHECKOUT_SESSION_ID}&tokens=\${tokens}\`,
    cancel_url: 'https://yoursite.com/cart',
  });

  res.json({ checkoutUrl: session.checkout_url });
});`}
                />

                <DeveloperCodeBlock
                    title="3. Verify On Success"
                    code={`app.get('/success', async (req, res) => {
  const sessionId = req.query.session_id as string;
  const session = await nullpay.checkout.sessions.retrieve(sessionId);

  if (session.status !== 'SETTLED') {
    return res.status(409).send('Payment not settled yet');
  }

  // safe to fulfill here
  res.send('Order confirmed');
});`}
                />
            </GlassCard>

            <GlassCard className="p-8 md:p-10">
                <h3 className="text-2xl font-bold text-white mb-3">Pre-Generated Invoice Flows</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                    For multi-pay or donation-style flows, you can pass a pre-generated `invoice_hash` and `salt`, exactly like the demo backend does for subscriptions and donation profiles.
                </p>
                <DeveloperCodeBlock
                    title="Pre-generated Multipay Or Donation"
                    code={`const session = await nullpay.checkout.sessions.create({
  type: 'multipay', // or 'donation'
  currency: 'USDCX',
  invoice_hash: '1115746144...field',
  salt: '3370317817...field',
  success_url: 'https://yoursite.com/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://yoursite.com/cancel',
});`}
                />
            </GlassCard>
        </div>
    );
};

export default QuickStartGuide;
