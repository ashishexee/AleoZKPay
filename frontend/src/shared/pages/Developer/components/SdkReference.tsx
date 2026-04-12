import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Package, Terminal, Shield, ArrowRight } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { DeveloperCodeBlock } from './DeveloperCodeBlock';

export const SdkReference: React.FC = () => {
    const nullpayExample = `{
  "merchant": "aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0",
  "generated_at": "2026-03-21T09:10:24.522Z",
  "invoices": [
    { 
      "name": "basic-credits", 
      "type": "multipay", 
      "amount": 1, 
      "currency": "CREDITS", 
      "hash": "766402152790...6498623field", 
      "salt": "526143310320...48436field" 
    },
    { 
      "name": "support-any", 
      "type": "donation", 
      "amount": null, 
      "currency": "ANY", 
      "hash": "38901376877...1623field", 
      "salt": "64965075528...31428field" 
    }
  ]
}`;

    const nodeInit = [
        "import { NullPay } from '@nullpay/node';",
        "import path from 'path';",
        '',
        'const client = new NullPay({',
        '  secretKey: process.env.NULLPAY_SK,',
        '  projectRoot: __dirname,',
        "  configPath: path.join(__dirname, 'nullpay.json')",
        '});'
    ].join('\n');

    const createSession = [
        'const session = await client.checkout.sessions.create({',
        "  nullpay_invoice_name: 'basic-usdcx',",
        "  success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',",
        "  cancel_url: 'https://example.com/cancel'",
        '});',
        'console.log(session.checkout_url);'
    ].join('\n');

    return (
        <div className="space-y-8">
            <GlassCard className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <Terminal className="w-5 h-5 text-orange-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gradient-gold drop-shadow-gold">What is nullpay.json?</h2>
                </div>
                
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                    A developer manifest containing your merchant address and pre-generated invoices. 
                    The SDK automatically looks for this file in your project's root to resolve invoice hashes and salts.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-orange-300/80 mb-2 whitespace-nowrap overflow-hidden text-ellipsis">Deterministic Resolution</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            On serverless platforms like Vercel, pass <code className="text-orange-300 font-mono">projectRoot</code> to the constructor for reliable file lookup.
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-orange-300/80 mb-2">Optional Usage</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            You can skip this file and pass <code className="text-orange-300 font-mono">amount</code> / <code className="text-orange-300 font-mono">currency</code> directly to the session creator.
                        </p>
                    </div>
                </div>

                <DeveloperCodeBlock title="Example nullpay.json" code={nullpayExample} language="json" />
            </GlassCard>

            <GlassCard className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <Package className="w-5 h-5 text-orange-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gradient-gold drop-shadow-gold">Node SDK: @nullpay/node</h2>
                </div>

                <p className="text-gray-400 text-sm leading-relaxed mb-8">
                    Lightweight server-side client to manage checkout sessions and verify webhooks. 
                    If an invoice isn't pre-generated, the SDK falls back to our Relayer to handle on-chain setup.
                </p>

                <div className="space-y-6">
                    <DeveloperCodeBlock title="Initialize client" code={nodeInit} language="typescript" />
                    <DeveloperCodeBlock title="Lookup by Invoice Name" code={createSession} language="typescript" />
                </div>
            </GlassCard>

            <GlassCard className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <Shield className="w-5 h-5 text-orange-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gradient-gold drop-shadow-gold">Security & Resources</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Webhooks</h3>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Always verify the <code className="text-orange-300 font-mono">nullpay-signature</code> using our HMAC-SHA256 helper to prevent spoofing.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Reference Links</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link 
                                    to="/docs?tab=getting-started&section=gs-readme"
                                    className="group flex items-center gap-2 text-xs text-orange-400 hover:text-orange-300 transition-colors"
                                >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>Consolidated SDK Docs</span>
                                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                </Link>
                            </li>
                            <li>
                                <a 
                                    href="https://github.com/geekofdhruv/NullPay"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors"
                                >
                                    <Terminal className="w-3.5 h-3.5" />
                                    <span>Browse Source Code</span>
                                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};

export default SdkReference;
