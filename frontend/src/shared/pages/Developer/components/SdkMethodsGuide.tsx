import React from 'react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { DeveloperCodeBlock } from './DeveloperCodeBlock';

const PropRow = ({ name, type, desc, required }: { name: string; type: string; desc: string; required?: boolean }) => (
    <div className="flex flex-col md:flex-row md:items-start gap-3 py-4 border-b border-white/[0.06] last:border-b-0">
        <div className="flex items-center gap-2 min-w-[200px]">
            <code className="text-cyan-300 text-xs font-mono font-bold">{name}</code>
            {required && <span className="text-[9px] text-red-400 font-black uppercase tracking-widest">req</span>}
        </div>
        <code className="text-blue-400 text-xs font-mono min-w-[110px]">{type}</code>
        <p className="text-gray-500 text-xs leading-relaxed flex-1">{desc}</p>
    </div>
);

export const SdkMethodsGuide: React.FC = () => {
    return (
        <div className="space-y-8">
            <GlassCard className="p-8 md:p-10">
                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">SDK Methods</span>
                <h2 className="text-3xl font-bold text-white mt-3 mb-2">What The Node SDK Exposes</h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-8">
                    The current SDK is intentionally small: create sessions, retrieve sessions, and verify signed webhooks. That keeps the merchant integration simple and server-first.
                </p>

                <div className="bg-black/40 rounded-2xl border border-white/[0.06] divide-y divide-white/[0.04] px-4 mb-8">
                    <PropRow name="secretKey" type="string" required desc="Merchant secret API key from the Developer Console." />
                    <PropRow name="baseURL" type="string" desc="Optional API base URL override for local development or custom environments." />
                </div>

                <DeveloperCodeBlock
                    title="new NullPay(config)"
                    code={`const nullpay = new NullPay({
  secretKey: process.env.NULLPAY_SECRET_KEY!,
});`}
                />

                <DeveloperCodeBlock
                    title="nullpay.invoices (Local manifest helpers)"
                    code={`// Read the entire nullpay.json manifest into memory
const allInvoices = nullpay.invoices.getAll();

// Get a specific invoice by its name or index
const proPlan = nullpay.invoices.getByName('pro-plan');
const firstInvoice = nullpay.invoices.getByIndex(0);

// Filter your pre-generated invoices
const donationInvoices = nullpay.invoices.getByType('donation');`}
                />

                <div className="bg-black/40 rounded-2xl border border-white/[0.06] divide-y divide-white/[0.04] px-4 mt-10">
                    <PropRow name="amount" type="number" desc="Amount in whole tokens. Intrinsically auto-resolved if utilizing nullpay_invoice_name." />
                    <PropRow name="currency" type="'CREDITS' | 'USDCX' | 'USAD' | 'ANY'" desc="Token type. Intrinsically auto-resolved if utilizing nullpay_invoice_name." />
                    <PropRow name="type" type="'standard' | 'multipay' | 'donation'" desc="Invoice mode. Intrinsically auto-resolved if utilizing nullpay_invoice_name." />
                    <PropRow name="success_url" type="string" desc="Your redirect URL after settlement. Supports `{CHECKOUT_SESSION_ID}` placeholder." />
                    <PropRow name="cancel_url" type="string" desc="Optional redirect URL when the user exits the checkout." />
                    <PropRow name="invoice_hash" type="string" desc="Zero-knowledge hash. Intrinsically auto-resolved if utilizing nullpay_invoice_name." />
                    <PropRow name="salt" type="string" desc="Private salt. Intrinsically auto-resolved if utilizing nullpay_invoice_name." />
                    <PropRow name="nullpay_invoice_name" type="string" desc="Shorthand. Automatically gets merged with amount, currency, invoice_hash, and salt from your local nullpay.json!" />
                </div>

                <DeveloperCodeBlock
                    title="checkout.sessions.create"
                    code={`const session = await nullpay.checkout.sessions.create({
  amount: 100,
  currency: 'USDCX',
  success_url: 'https://yoursite.com/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://yoursite.com/cart',
});

console.log(session.id);
console.log(session.checkout_url);`}
                />

                <DeveloperCodeBlock
                    title="checkout.sessions.retrieve"
                    code={`const session = await nullpay.checkout.sessions.retrieve('ses_abc123');

if (session.status === 'SETTLED') {
  console.log('Invoice:', session.invoice_hash);
  console.log('Token:', session.token_type);
}`}
                />

                <DeveloperCodeBlock
                    title="webhooks.verifySignature / constructEvent"
                    code={`const isValid = nullpay.webhooks.verifySignature(rawBody, signature);

const event = nullpay.webhooks.constructEvent(rawBody, signature);`}
                />
            </GlassCard>
        </div>
    );
};

export default SdkMethodsGuide;
