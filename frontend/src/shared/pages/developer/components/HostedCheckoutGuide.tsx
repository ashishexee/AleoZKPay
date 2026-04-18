import React from 'react';
import { BookOpen, Shield, Workflow, Zap } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { DeveloperCodeBlock } from './DeveloperCodeBlock';
import { DeveloperStepCard } from './DeveloperStepCard';

export const HostedCheckoutGuide: React.FC = () => {
    return (
        <div className="space-y-8">
            <GlassCard className="p-8 md:p-10">
                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">Hosted Checkout</span>
                <h2 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)] mt-3 mb-2">What NullPay Checkout Actually Does</h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-8">
                    The hosted checkout route in this app loads the checkout session, reads the invoice details, lets the payer choose or convert private balance, executes the Aleo payment, then updates both the invoice and checkout session before redirecting to your `success_url`.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <DeveloperStepCard step="A" title="Load Session" desc="The page fetches `GET /api/checkout/sessions/:id` to render merchant, amount, token, invoice hash, and redirect URLs." icon={BookOpen} />
                    <DeveloperStepCard step="B" title="Wallet Payment" desc="The payer wallet selects the right token program, finds private records, and submits the Aleo payment transition." icon={Shield} />
                    <DeveloperStepCard step="C" title="Backend Sync" desc="After success, the checkout frontend patches both `/api/invoices/:hash` and `/api/checkout/sessions/:id` so dashboard state and webhooks stay in sync." icon={Workflow} />
                    <DeveloperStepCard step="D" title="Merchant Redirect" desc="The hosted page redirects to your success URL with the checkout session ID once payment is settled." icon={Zap} />
                </div>

                <DeveloperCodeBlock
                    title="Hosted Checkout Lifecycle"
                    code={`Merchant backend -> sessions.create()
Buyer browser -> session.checkout_url
Hosted checkout -> GET /api/checkout/sessions/:id
Buyer wallet -> private Aleo payment
Hosted checkout -> PATCH /api/invoices/:hash
Hosted checkout -> PATCH /api/checkout/sessions/:id
NullPay backend -> signed webhook to merchant
Hosted checkout -> redirect to success_url?session_id=...`}
                />
            </GlassCard>
        </div>
    );
};

export default HostedCheckoutGuide;
