import type { DocsSection } from '../types';
import { IntegrationBadge, Callout } from '../ui';
import { User, Settings, Plus, RefreshCw, Zap } from 'lucide-react';

export const codexSection: DocsSection = {
    id: 'int-codex',
    group: 'Clients',
    label: 'Codex',
    eyebrow: 'Integrations',
    title: 'Install NullPay MCP in Codex',
    summary: 'A clean, UI-driven setup to bring ZK-payments into your Codex workflow.',
    content: (
        <div className="space-y-12">
            <IntegrationBadge
                src="/assets/codex.svg"
                alt="Codex"
                title="Codex Integration"
                description="Use the integrated MCP manager to connect NullPay without editing config files manually."
            />

            {/* Step 1 */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-sm">01</div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Open MCP Settings</h2>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
                    Navigate to the MCP management interface within Codex:
                </p>
                <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] text-[13px] text-gray-300">
                    <User className="w-4 h-4 text-orange-300" />
                    <span>Profile Icon (bottom left)</span>
                    <span className="text-gray-600">→</span>
                    <Settings className="w-4 h-4 text-orange-300" />
                    <span>Codex Settings</span>
                    <span className="text-gray-600">→</span>
                    <span className="font-bold text-white tracking-tight">MCP Tab</span>
                    <span className="text-gray-600">→</span>
                    <span className="flex items-center gap-1 text-orange-400 font-bold">
                        <Plus className="w-3.5 h-3.5" /> Add Server
                    </span>
                </div>
            </section>

            {/* Step 2 */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-sm">02</div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Fill the Form</h2>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px] border-collapse">
                            <thead>
                                <tr className="border-b border-white/[0.06] bg-white/[0.04] text-[11px] uppercase tracking-widest text-gray-500">
                                    <th className="px-6 py-4 font-black">Field</th>
                                    <th className="px-6 py-4 font-black">Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                <tr>
                                    <td className="px-6 py-4 font-bold text-gray-300">Name</td>
                                    <td className="px-6 py-4 font-mono text-orange-300/80">nullpay</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-bold text-gray-300">Command to launch</td>
                                    <td className="px-6 py-4 font-mono text-orange-300/80">npx</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-bold text-gray-300 align-top pt-4">Arguments</td>
                                    <td className="px-6 py-4 space-y-2">
                                        <p className="text-gray-500 text-[10px] uppercase tracking-widest font-black mb-2">Click "+ Add argument" twice:</p>
                                        <div className="space-y-1.5">
                                            <div className="px-2 py-1 rounded bg-white/5 border border-white/10 font-mono text-gray-400">-y</div>
                                            <div className="px-2 py-1 rounded bg-white/5 border border-white/10 font-mono text-gray-400">@nullpay/mcp</div>
                                            <div className="px-2 py-1 rounded bg-white/5 border border-white/10 font-mono text-gray-400">server</div>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-bold text-gray-300 align-top pt-4">Env Variables</td>
                                    <td className="px-6 py-4 space-y-3">
                                        <p className="text-gray-500 text-[10px] uppercase tracking-widest font-black mb-2">Click "+ Add environment variable" three times:</p>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <code className="text-xs text-gray-500 w-40">NULLPAY_MAIN_ADDRESS</code>
                                                <span className="text-gray-600">→</span>
                                                <code className="text-xs text-orange-300/80">YOUR_ALEO_ADDRESS</code>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="text-xs text-gray-500 w-40">NULLPAY_MAIN_PRIVATE_KEY</code>
                                                <span className="text-gray-600">→</span>
                                                <code className="text-xs text-orange-300/80">YOUR_PRIVATE_KEY</code>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="text-xs text-gray-500 w-40">NULLPAY_MAIN_PASSWORD</code>
                                                <span className="text-gray-600">→</span>
                                                <code className="text-xs text-orange-300/80">YOUR_PASSWORD</code>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <Callout title="Final Step" tone="emerald">
                    Leave <strong>STDIO</strong> selected as the transport method (default) and click <span className="font-bold text-white underline underline-offset-4">Save</span>.
                </Callout>
                <Callout title="Security Notice" tone="orange">
                    Your credentials are stored by Codex. Ensure you only install MCP servers you trust.
                </Callout>
            </section>

            {/* Step 3 */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-sm">03</div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Verify Status</h2>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed max-w-2xl">
                    Back in the MCP servers list, <code className="text-white">nullpay</code> should appear with a <code className="text-emerald-400 font-bold">green status indicator</code>. 
                    If it stays gray or shows an error, click the <RefreshCw className="inline-block w-3.5 h-3.5 mx-1 mb-0.5" /> refresh icon to retry.
                </p>
            </section>

            {/* Prompting */}
            <section className="pt-6 border-t border-white/10">
                <div className="flex items-center gap-3 mb-6">
                    <Zap className="w-5 h-5 text-orange-400" />
                    <h2 className="text-xl font-bold text-white tracking-tight">Start Prompting</h2>
                </div>
                <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-all group">
                    <p className="text-gray-300 font-mono text-sm leading-relaxed group-hover:text-white transition-colors">
                        "Check my NullPay balance."
                    </p>
                </div>
            </section>
        </div>
    ),
};
