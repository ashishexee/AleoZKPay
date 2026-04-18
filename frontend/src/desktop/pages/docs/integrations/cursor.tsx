import type { DocsSection } from '../types';
import { cursorConfigExample } from '../examples';
import { CodeBlock, IntegrationBadge, Callout } from '../ui';
import { Zap } from 'lucide-react';

export const cursorSection: DocsSection = {
    id: 'int-cursor',
    group: 'Clients',
    label: 'Cursor',
    eyebrow: 'Integrations',
    title: 'Install NullPay MCP in Cursor',
    summary: 'Bring ZK-proof payments and invoice management into your AI-powered IDE.',
    content: (
        <div className="space-y-12">
            <IntegrationBadge
                src="/assets/cursor-ide.png"
                alt="Cursor"
                title="Cursor IDE Integration"
                description="One-time setup for native payments within your AI coding workflow."
            />

            {/* Step 1 */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-sm">01</div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Open Config File</h2>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px] border-collapse">
                            <thead>
                                <tr className="border-b border-white/[0.06] bg-white/[0.04] text-[11px] uppercase tracking-widest text-gray-500">
                                    <th className="px-6 py-4 font-black">Operating System</th>
                                    <th className="px-6 py-4 font-black">Configuration File Path</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                <tr>
                                    <td className="px-6 py-4 font-bold text-gray-300">Windows</td>
                                    <td className="px-6 py-4 font-mono text-gray-400">%USERPROFILE%\.cursor\mcp.json</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-bold text-gray-300">macOS / Linux</td>
                                    <td className="px-6 py-4 font-mono text-gray-400">~/.cursor/mcp.json</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <Callout title="Quick Tip" tone="blue">
                    Open Cursor → <code className="text-blue-300/80 font-mono">Cmd/Ctrl + Shift + P</code> → type <strong>Open User Settings (JSON)</strong> to find your config directory.
                </Callout>
            </section>

            {/* Step 2 */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-sm">02</div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Add This Config</h2>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                    Insert the following configuration inside your <code className="text-orange-300/80">mcpServers</code> object. 
                    Replace the placeholders with your actual NullPay credentials.
                </p>
                <CodeBlock title="mcp.json" language="json" code={cursorConfigExample} />
                <Callout title="Security Warning" tone="orange">
                    Your credentials are plain-text in this file. <strong>Treat mcp.json like a wallet file</strong> and never share it publicly.
                </Callout>
            </section>

            {/* Step 3 & 4 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-sm">03</div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Restart Cursor</h2>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                        To apply changes, <strong>fully restart</strong> Cursor. On macOS, use <code className="text-white bg-white/5 px-1 py-0.5 rounded italic font-mono">Cmd+Q</code> or use <strong>File → Exit</strong> on Windows.
                    </p>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-sm">04</div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Verify Setup</h2>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                        Go to <strong>Settings → Cursor Settings → MCP</strong>. Confirm that <code className="text-emerald-400 font-bold">nullpay</code> is listed with a green status and tools are visible.
                    </p>
                </section>
            </div>

            {/* Prompting */}
            <section className="pt-6 border-t border-white/10">
                <div className="flex items-center gap-3 mb-6">
                    <Zap className="w-5 h-5 text-orange-400" />
                    <h2 className="text-xl font-bold text-white tracking-tight">Try a Prompt</h2>
                </div>
                <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-all group">
                    <p className="text-gray-300 font-mono text-sm leading-relaxed group-hover:text-white transition-colors">
                        "Check my NullPay balance in the terminal."
                    </p>
                </div>
            </section>
        </div>
    ),
};
