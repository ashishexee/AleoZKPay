import { Package, Terminal, Bot, FileJson, Webhook } from 'lucide-react';
import type { DocsSection } from '../types';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';
import { Callout, CodeBlock } from '../ui';

const nullpayJsonSchema = `{
  "merchant": "aleo1...",           // Merchant Aleo address
  "generated_at": "ISO timestamp",    // Generation timestamp
  "invoices": [
    {
      "name": "string",              // Developer-chosen identifier
      "type": "standard|multipay|donation",
      "amount": 50,                // null for donation
      "currency": "CREDITS|USDCX|USAD|ANY",
      "label": "string",           // Optional memo
      "hash": "field",             // BHP256 invoice hash
      "salt": "field"              // Random salt
    }
  ]
}`;

export const sdkQuickRefSection: DocsSection = {
    id: 'qr-sdk',
    group: 'SDK',
    label: 'SDK Quick Ref',
    eyebrow: 'Quick Reference',
    title: 'SDK & CLI Quick Reference',
    summary: 'Command-line one-liners, SDK method signatures, and the nullpay.json schema. Copy-paste ready for rapid integration.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Package className="h-4 w-4 text-orange-300" />
                        <h4 className="text-sm font-bold text-white">Node SDK</h4>
                    </div>
                    <CodeBlock title="Install" language="bash" code="npm install @nullpay/node@latest" />
                    <div className="mt-3 space-y-1 text-xs text-gray-400">
                        <div className="font-mono text-orange-300">nullpay.invoices.getAll()</div>
                        <div className="font-mono text-orange-300">nullpay.invoices.getByName(name)</div>
                        <div className="font-mono text-orange-300">nullpay.checkout.sessions.create(params)</div>
                        <div className="font-mono text-orange-300">nullpay.checkout.sessions.retrieve(id)</div>
                        <div className="font-mono text-orange-300">nullpay.webhooks.verifySignature(body, sig)</div>
                        <div className="font-mono text-orange-300">nullpay.webhooks.constructEvent(body, sig)</div>
                    </div>
                </GlassCard>
                <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Terminal className="h-4 w-4 text-blue-300" />
                        <h4 className="text-sm font-bold text-white">CLI</h4>
                    </div>
                    <CodeBlock title="Install & run" language="bash" code="npx @nullpay/cli@latest sdk onboard" />
                    <div className="mt-3 space-y-1 text-xs text-gray-400">
                        <div className="font-mono text-blue-300">sdk onboard</div>
                        <div className="font-mono text-blue-300">sdk validate</div>
                        <div className="font-mono text-blue-300">sdk config</div>
                        <div className="font-mono text-blue-300">sdk invoices list</div>
                        <div className="font-mono text-blue-300">sdk invoices create</div>
                    </div>
                </GlassCard>
                <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Bot className="h-4 w-4 text-emerald-300" />
                        <h4 className="text-sm font-bold text-white">MCP Server</h4>
                    </div>
                    <CodeBlock title="Install" language="bash" code="npx -y @nullpay/mcp" />
                    <div className="mt-3 space-y-1 text-xs text-gray-400">
                        <div className="font-mono text-emerald-300">login</div>
                        <div className="font-mono text-emerald-300">create_invoice</div>
                        <div className="font-mono text-emerald-300">pay_invoice</div>
                        <div className="font-mono text-emerald-300">get_transaction_info</div>
                    </div>
                </GlassCard>
            </div>

            <GlassCard className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <FileJson className="h-5 w-5 text-yellow-300" />
                    <h3 className="text-lg font-bold text-white">nullpay.json Schema</h3>
                </div>
                <CodeBlock title="Schema" language="json" code={nullpayJsonSchema} />
            </GlassCard>

            <GlassCard className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Webhook className="h-5 w-5 text-purple-300" />
                    <h3 className="text-lg font-bold text-white">Webhook Event Types</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                        <p className="text-xs font-bold text-white mb-1">payment_intent.succeeded</p>
                        <p className="text-[11px] text-gray-400">Invoice settled on-chain. Safe to fulfill order.</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                        <p className="text-xs font-bold text-white mb-1">payment_intent.failed</p>
                        <p className="text-[11px] text-gray-400">Payment transaction failed or was rejected.</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                        <p className="text-xs font-bold text-white mb-1">payment_intent.created</p>
                        <p className="text-[11px] text-gray-400">New checkout session created. Informational only.</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                        <p className="text-xs font-bold text-white mb-1">invoice.expired</p>
                        <p className="text-[11px] text-gray-400">Invoice passed expiry block height without payment.</p>
                    </div>
                </div>
            </GlassCard>

            <Callout title="Python SDK" tone="purple">
                <code className="text-purple-300">pip install nullpay-python</code>
                <br />
                Same API surface as Node SDK with snake_case methods:
                <code className="text-gray-400"> nullpay.invoices.get_all(), checkout.sessions.create(...)</code>
            </Callout>
        </div>
    ),
};
