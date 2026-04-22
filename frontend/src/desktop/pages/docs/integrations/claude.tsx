import type { DocsSection } from '../types';
import { claudeConfigExample } from '../examples';
import { CodeBlock, IntegrationBadge, Callout } from '../ui';
import { Zap } from 'lucide-react';

export const claudeSection: DocsSection = {
    id: 'int-claude',
    group: 'Clients',
    label: 'Claude',
    eyebrow: 'Integrations',
    title: 'Install NullPay MCP in Claude Desktop',
    summary: 'Connect NullPay to Claude Desktop for AI-native payments and invoice management.',
    content: (
        <div className="space-y-12">
            <IntegrationBadge
                src="/assets/claude.svg"
                alt="Claude"
                title="Claude Desktop Integration"
                description="One-time setup for AI-powered payment workflows on Windows, macOS, and Linux."
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
                                    <td className="px-6 py-4 font-mono text-gray-400">%APPDATA%\Claude\claude_desktop_config.json</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-bold text-gray-300">macOS</td>
                                    <td className="px-6 py-4 font-mono text-gray-400">~/Library/Application Support/Claude/claude_desktop_config.json</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-bold text-gray-300">Linux</td>
                                    <td className="px-6 py-4 font-mono text-gray-400">~/.config/Claude/claude_desktop_config.json</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <Callout title="Quick Access" tone="blue">
                    Open Claude Desktop → <strong>Settings</strong> → <strong>Developer</strong> → <strong>Edit Config</strong> to open the folder directly.
                </Callout>
            </section>

            {/* Step 2 */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-sm">02</div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Add This Config</h2>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                    Paste the following block inside your <code className="text-orange-300/80">mcpServers</code> object.
                    Ensure you replace the placeholders with your actual NullPay credentials.
                </p>
                <CodeBlock title="claude_desktop_config.json" language="json" code={claudeConfigExample} />
                <Callout title="Security Notice" tone="orange">
                    Your private key and password are extremely sensitive. <strong>Never share this file</strong> or commit it to public repositories.
                </Callout>
            </section>

            {/* Step 3 & 4 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-sm">03</div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Restart Claude</h2>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        <strong>Completely quit</strong> Claude Desktop. Check your system tray to ensure no background processes are running, then reopen.
                    </p>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-sm">04</div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Verify Setup</h2>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Look for the 🔌 <strong>plug icon</strong> in the chat input. Alternatively, check <strong>Settings → Developer</strong> to confirm <code className="text-emerald-400 font-bold">nullpay</code> is active.
                    </p>
                </section>
            </div>

            {/* Next Steps */}
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
