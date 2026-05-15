import { AlertTriangle, AlertCircle, Info, XCircle } from 'lucide-react';
import type { DocsSection } from '../types';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';
import { Callout } from '../ui';

export const errorCodesSection: DocsSection = {
    id: 'qr-errors',
    group: 'Errors',
    label: 'Error Codes',
    eyebrow: 'Quick Reference',
    title: 'Error Codes & Troubleshooting',
    summary: 'Common error codes, their causes, and resolution steps. Covers contract assertion failures, API errors, SDK issues, and MCP setup problems.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <GlassCard className="p-5 border-red-500/10">
                    <div className="flex items-center gap-2 mb-3">
                        <XCircle className="h-4 w-4 text-red-400" />
                        <h4 className="text-sm font-bold text-white">Contract Errors</h4>
                    </div>
                    <div className="space-y-2 text-xs text-gray-400">
                        <div className="flex flex-col gap-0.5 pb-2 border-b border-white/[0.04]">
                            <code className="text-red-300 font-mono">assert_eq failed</code>
                            <span>Hash mismatch: invoice tampered or wrong salt/amount/merchant</span>
                        </div>
                        <div className="flex flex-col gap-0.5 pb-2 border-b border-white/[0.04]">
                            <code className="text-red-300 font-mono">assert(block.height &lt;= expiry)</code>
                            <span>Invoice expired: passed expiry_height block</span>
                        </div>
                        <div className="flex flex-col gap-0.5 pb-2 border-b border-white/[0.04]">
                            <code className="text-red-300 font-mono">assert_eq(status, 0u8)</code>
                            <span>Invoice already settled: double-payment attempt</span>
                        </div>
                        <div className="flex flex-col gap-0.5 pb-2 border-b border-white/[0.04]">
                            <code className="text-red-300 font-mono">signature::verify failed</code>
                            <span>Oracle quote invalid: rate tampered or expired</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <code className="text-red-300 font-mono">transfer_private</code>
                            <span>Insufficient balance or spent record used</span>
                        </div>
                    </div>
                </GlassCard>
                <GlassCard className="p-5 border-yellow-500/10">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-yellow-400" />
                        <h4 className="text-sm font-bold text-white">API Errors</h4>
                    </div>
                    <div className="space-y-2 text-xs text-gray-400">
                        <div className="flex flex-col gap-0.5 pb-2 border-b border-white/[0.04]">
                            <code className="text-yellow-300 font-mono">400 Invalid signature</code>
                            <span>Webhook HMAC verification failed</span>
                        </div>
                        <div className="flex flex-col gap-0.5 pb-2 border-b border-white/[0.04]">
                            <code className="text-yellow-300 font-mono">401 Unauthorized</code>
                            <span>Missing or invalid Bearer sk_ token</span>
                        </div>
                        <div className="flex flex-col gap-0.5 pb-2 border-b border-white/[0.04]">
                            <code className="text-yellow-300 font-mono">404 Invoice not found</code>
                            <span>Hash does not exist in backend database</span>
                        </div>
                        <div className="flex flex-col gap-0.5 pb-2 border-b border-white/[0.04]">
                            <code className="text-yellow-300 font-mono">500 Relayer error</code>
                            <span>On-chain submission failed. Retry or check network</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <code className="text-yellow-300 font-mono">503 DPS unavailable</code>
                            <span>Delegated proving service overloaded. Retry with backoff</span>
                        </div>
                    </div>
                </GlassCard>
                <GlassCard className="p-5 border-blue-500/10">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="h-4 w-4 text-blue-400" />
                        <h4 className="text-sm font-bold text-white">SDK Errors</h4>
                    </div>
                    <div className="space-y-2 text-xs text-gray-400">
                        <div className="flex flex-col gap-0.5 pb-2 border-b border-white/[0.04]">
                            <code className="text-blue-300 font-mono">nullpay.json not found</code>
                            <span>Pass projectRoot or configPath to constructor</span>
                        </div>
                        <div className="flex flex-col gap-0.5 pb-2 border-b border-white/[0.04]">
                            <code className="text-blue-300 font-mono">Invoice name not found</code>
                            <span>Check nullpay.json has the name, or use inline params</span>
                        </div>
                        <div className="flex flex-col gap-0.5 pb-2 border-b border-white/[0.04]">
                            <code className="text-blue-300 font-mono">Session timeout</code>
                            <span>Relayer polling exceeded 2 minutes. Invoice may still confirm</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <code className="text-blue-300 font-mono">Invalid webhook signature</code>
                            <span>Use express.raw() not express.json() for webhook route</span>
                        </div>
                    </div>
                </GlassCard>
                <GlassCard className="p-5 border-emerald-500/10">
                    <div className="flex items-center gap-2 mb-3">
                        <Info className="h-4 w-4 text-emerald-400" />
                        <h4 className="text-sm font-bold text-white">MCP Errors</h4>
                    </div>
                    <div className="space-y-2 text-xs text-gray-400">
                        <div className="flex flex-col gap-0.5 pb-2 border-b border-white/[0.04]">
                            <code className="text-emerald-300 font-mono">Config not written</code>
                            <span>Run npx -y @nullpay/mcp with write permissions</span>
                        </div>
                        <div className="flex flex-col gap-0.5 pb-2 border-b border-white/[0.04]">
                            <code className="text-emerald-300 font-mono">Wallet not found</code>
                            <span>Verify NULLPAY_MAIN_ADDRESS is valid Aleo address</span>
                        </div>
                        <div className="flex flex-col gap-0.5 pb-2 border-b border-white/[0.04]">
                            <code className="text-emerald-300 font-mono">Password incorrect</code>
                            <span>Use on-chain backup recovery if private key available</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <code className="text-emerald-300 font-mono">Server not starting</code>
                            <span>Check Node.js 18+ and npx availability</span>
                        </div>
                    </div>
                </GlassCard>
            </div>

            <Callout title="Debugging Checklist" tone="orange">
                <ol className="list-decimal list-inside space-y-1 text-xs text-gray-400">
                    <li>Verify invoice hash exists: GET /api/invoices/:hash</li>
                    <li>Check salt_to_invoice mapping on Aleo Explorer</li>
                    <li>Confirm token type matches: Credits=0u8, USDCx=1u8, USAD=2u8</li>
                    <li>Verify expiry_height &gt; current block.height</li>
                    <li>Check status = 0u8 (Open) not 1u8 (Settled)</li>
                    <li>For Oracle: verify signature and expires_at block</li>
                    <li>Webhook: use express.raw() not express.json()</li>
                </ol>
            </Callout>
        </div>
    ),
};
