import React from 'react';
import { BookOpen, Copy } from 'lucide-react';

const CodeBlock = ({ title, code, language = 'javascript' }: { title?: string; code: string; language?: string }) => {
    const [copied, setCopied] = React.useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="mt-4 mb-6 group">
            {title && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-t-xl border-b-0">
                    <span className="font-mono text-xs text-neon-primary font-bold uppercase tracking-wider">{title}</span>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-600 font-mono uppercase">{language}</span>
                        <button onClick={handleCopy} className="text-gray-500 hover:text-white transition-colors">
                            {copied ? <Copy className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>
            )}
            <pre className="p-5 bg-black/80 border border-white/10 rounded-b-xl overflow-x-auto text-xs text-gray-300 font-mono leading-relaxed group-hover:border-white/20 transition-colors max-h-[500px] overflow-y-auto">
                <code>{code}</code>
            </pre>
        </div>
    );
};

const DocSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-8">
        <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-3"><BookOpen className="w-5 h-5 text-neon-primary" />{title}</h3>
        <div className="text-gray-400 text-sm leading-relaxed">{children}</div>
    </div>
);

export const SdkReference: React.FC = () => {
    const nullpayExample = `{
  "merchant": "aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0",
  "generated_at": "2026-03-21T09:10:24.522Z",
  "invoices": [
    { "name": "basic-credits", "type": "multipay", "amount": 1, "currency": "CREDITS", "label": "", "hash": "766402152790...6498623field", "salt": "526143310320...48436field" },
    { "name": "support-any", "type": "donation", "amount": null, "currency": "ANY", "label": "dsfbh", "hash": "38901376877...1623field", "salt": "64965075528...31428field" }
  ]
}`;

    const nodeInit = `import { NullPay } from '@nullpay/node';

const client = new NullPay({ secretKey: process.env.NULLPAY_SK });`;

    const createSession = `const session = await client.checkout.sessions.create({
  nullpay_invoice_name: 'basic-usdcx',
  success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://example.com/cancel'
});
console.log(session.checkout_url);`;

    return (
        <div className="space-y-6">
            <DocSection title="What is nullpay.json?">
                <p className="mb-3">
                    A developer manifest containing your merchant address and pre-generated invoices (amount, currency, hash + salt). Keep salts private and add this file to your <code className="text-white bg-white/5 py-0.5 px-1.5 rounded font-mono text-xs">.gitignore</code>.<br /><br />
                    The SDK uses <code className="text-white bg-white/5 py-0.5 px-1.5 rounded font-mono text-xs">fs</code> under the hood to automatically look for this file in your project's root. If you don't use the CLI wizard to generate it, you can completely fallback to creating this file manually! Just replicate the schema below and input the hashes and salts you generated from your own smart contract interactions.
                </p>
                <CodeBlock title="Schema / Example nullpay.json" code={nullpayExample} language="json" />
            </DocSection>

            <DocSection title="CLI: `nullpay sdk onboard`">
                <p className="mb-3">Interactive wizard that authenticates with your NullPay secret key, generates salts, submits invoices to the relayer, polls for invoice hash resolution, and writes `nullpay.json`.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                        <div className="text-xs text-gray-400 mb-2">Key behaviors</div>
                        <ul className="text-sm text-gray-300 list-disc pl-5 space-y-1">
                            <li>Generates salts with crypto.randomBytes(16) bigint + 'field'</li>
                            <li>Submits invoice to relayer: <code className="text-neon-primary">/dps/relayer/create-invoice</code></li>
                            <li>Polls Provable mapping to resolve invoice hash</li>
                        </ul>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                        <div className="text-xs text-gray-400 mb-2">Security</div>
                        <p className="text-sm text-gray-300">`nullpay.json` contains salts (sensitive). The CLI will attempt to append it to `.gitignore` automatically.</p>
                    </div>
                </div>
            </DocSection>

            <DocSection title="Node SDK: @nullpay/node">
                <p className="mb-3">Lightweight server-side client to create checkout sessions, retrieve sessions, and verify webhook signatures.</p>
                <CodeBlock title="Initialize client" code={nodeInit} language="ts" />
                <CodeBlock title="Create session (lookup by nullpay.json name)" code={createSession} language="ts" />
            </DocSection>

            <DocSection title="Webhooks & Signature Verification">
                <p className="mb-3">The SDK provides HMAC-SHA256 verification helpers. Use `webhooks.constructEvent(payload, signature)` to verify and parse events server-side.</p>
            </DocSection>

            <DocSection title="Where to find files in repo">
                <ul className="text-sm text-gray-300 list-disc pl-5">
                    <li><a className="text-neon-primary" href="/docs/nullpay_sdk.md">docs/nullpay_sdk.md</a> — consolidated doc</li>
                    <li><a className="text-neon-primary" href="/packages/nullpay-cli/src/commands/onboard.ts">packages/nullpay-cli/src/commands/onboard.ts</a> — CLI</li>
                    <li><a className="text-neon-primary" href="/packages/nullpay-node/src/index.ts">packages/nullpay-node/src/index.ts</a> — Node SDK</li>
                    <li><a className="text-neon-primary" href="/testing-website/backend/nullpay.json">testing-website/backend/nullpay.json</a> — example file</li>
                </ul>
            </DocSection>
        </div>
    );
};

export default SdkReference;
