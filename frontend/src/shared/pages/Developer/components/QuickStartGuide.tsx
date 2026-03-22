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
                <h2 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)] mt-3 mb-2">Backend Integration In 3 Steps</h2>
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
                <h3 className="text-2xl font-bold text-gradient-gold drop-shadow-gold mb-3">Using nullpay.json (Pre-Generated Invoices)</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                    For multi-pay or donation-style flows, the best practice is to pre-generate your invoices and store them in a <code className="text-white bg-white/5 py-0.5 px-1.5 rounded">nullpay.json</code> file at the root of your backend project.
                    The <code className="text-neon-primary bg-white/5 py-0.5 px-1.5 rounded">@nullpay/node</code> SDK automatically reads this file! 
                    There are two ways to create your <code className="text-white bg-white/5 py-0.5 px-1.5 rounded">nullpay.json</code>:
                </p>
                <div className="space-y-4 mb-8">
                    <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                        <h4 className="text-gradient-gold drop-shadow-gold font-bold mb-2">1. Automatic Generation (Recommended)</h4>
                        <p className="text-gray-400 text-sm">Run our interactive CLI wizard: <code className="text-white bg-white/5 py-0.5 px-1.5 rounded">npx @nullpay/cli@1.0.1 sdk onboard</code>. It handles generating salts, submitting to the Aleo relayer, resolving the invoice hashes on the network, and writing the final <code className="text-white bg-white/5 py-0.5 px-1.5 rounded">nullpay.json</code> file for you.</p>
                    </div>
                    <div className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                        <h4 className="text-gradient-gold drop-shadow-gold font-bold mb-2">2. Manual Fallback</h4>
                        <p className="text-gray-400 text-sm">If you don't want to use the CLI, you can manually interact with the NullPay smart contract, generate your own hashes and salts, and create a <code className="text-white bg-white/5 py-0.5 px-1.5 rounded">nullpay.json</code> file matching the schema yourself.</p>
                    </div>
                </div>
                
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                    Once the file is in your root directory, you can create a checkout session by simply passing the name of the invoice. The SDK intrinsically auto-fetches the amount, currency, type, hash, and salt for you!
                </p>

                <DeveloperCodeBlock
                    title="Auto-fetching from nullpay.json"
                    code={`const session = await nullpay.checkout.sessions.create({
  nullpay_invoice_name: 'pro-plan', // 🚀 Auto-merges hash, salt, amount, and currency!
  success_url: 'https://yoursite.com/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://yoursite.com/cancel',
});`}
                />
            </GlassCard>
        </div>
    );
};

export default QuickStartGuide;
