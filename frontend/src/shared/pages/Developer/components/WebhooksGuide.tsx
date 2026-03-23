import React from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { DeveloperCodeBlock } from './DeveloperCodeBlock';

export const WebhooksGuide: React.FC = () => {
    return (
        <div className="space-y-8">
            <GlassCard className="p-8 md:p-10">
                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">Webhooks</span>
                <h2 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)] mt-3 mb-2">Recommended Fulfillment Path</h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-8">
                    The demo merchant backend verifies the `x-nullpay-signature` header against the raw request body and only fulfills when the webhook event is valid. This is the cleanest production path because settlement reaches your server even if the customer closes the browser after paying.
                </p>

                <DeveloperCodeBlock
                    title="Express Webhook Handler"
                    code={`app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString();
  }
}));

app.post('/api/webhook', (req, res) => {
  const signature = req.headers['x-nullpay-signature'];

  try {
    const event = nullpay.webhooks.constructEvent(req.rawBody, signature);

    if (event.status === 'SETTLED') {
      console.log('FULFILL ORDER', event.id, event.tx_id);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    res.status(400).send(\`Webhook Error: \${err.message}\`);
  }
});`}
                />

                <DeveloperCodeBlock
                    title="Webhook Event Payload"
                    language="json"
                    code={`{
  "id": "ses_a1b2c3d4",
  "amount": 100,
  "token_type": "USDCX",
  "status": "SETTLED",
  "tx_id": "at1abc...xyz",
  "timestamp": "2025-03-13T07:30:00.000Z"
}`}
                />

                <div className="mt-8 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                    <h4 className="text-white font-bold mb-3 text-gradient-gold drop-shadow-gold">Fulfillment Rules</h4>
                    <div className="space-y-3 text-sm text-gray-400">
                        <p>Always verify the signature from the raw body before trusting the event.</p>
                        <p>Still retrieve the session server-side before irreversible fulfillment if you want an extra confirmation step.</p>
                        <p>Store processed session IDs to keep your fulfillment idempotent.</p>
                        <p>Use HTTPS for webhook delivery in production.</p>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};

export default WebhooksGuide;
