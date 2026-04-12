import type { DocsSection } from '../types';
import {
    openclawConfigExample,
    openclawRestartCommand,
    openclawGatewayCommand,
    openclawInitCommand,
} from '../examples';
import { CodeBlock, IntegrationBadge, Callout } from '../ui';

export const openclawSection: DocsSection = {
    id: 'int-openclaw',
    group: 'Clients',
    label: 'OpenClaw',
    eyebrow: 'Integrations',
    title: 'Adding NullPay to OpenClaw',
    summary:
        'This guide will walk you through integrating the NullPay MCP server into your OpenClaw instance. Once configured, you\'ll be able to interact with NullPay through WhatsApp, Telegram, Slack, Discord, or any other channel connected to OpenClaw.',
    content: (
        <div className="space-y-12">
            <IntegrationBadge
                src="/assets/openclaw.svg"
                alt="OpenClaw"
                title="Cross-Platform Messaging Gateway"
                description="Connect NullPay to various messaging platforms via OpenClaw's MCP bridge."
            />

            {/* Locate Config */}
            <section className="space-y-4">
                <h3 className="text-lg font-bold text-white">1. Locate Your openclaw.json Configuration File</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                    First, find where OpenClaw stores its configuration based on your operating system:
                </p>
                <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-white/[0.08] bg-white/[0.05]">
                                <tr>
                                    <th className="px-4 py-3 font-bold text-white/90">Operating System</th>
                                    <th className="px-4 py-3 font-bold text-white/90">Default Path</th>
                                    <th className="px-4 py-3 font-bold text-white/90">Command to Find It</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                <tr>
                                    <td className="px-4 py-3 font-medium text-gray-300">Windows</td>
                                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400">C:\Users\&lt;YourUsername&gt;\.openclaw\openclaw.json</td>
                                    <td className="px-4 py-3 font-mono text-[11px] text-orange-300/80">echo %USERPROFILE%\.openclaw\openclaw.json</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-gray-300">macOS</td>
                                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400">~/.openclaw/openclaw.json</td>
                                    <td className="px-4 py-3 font-mono text-[11px] text-orange-300/80">echo ~/.openclaw/openclaw.json</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-gray-300">Linux</td>
                                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400">~/.openclaw/openclaw.json</td>
                                    <td className="px-4 py-3 font-mono text-[11px] text-orange-300/80">echo ~/.openclaw/openclaw.json</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <Callout title="Note" tone="blue">
                    The <code className="text-blue-200">.openclaw</code> folder is hidden by default. On Windows, enable "Hidden items" in File Explorer. On macOS/Linux, use <code className="text-blue-200">ls -a ~/</code> in the terminal.
                </Callout>
                <p className="text-sm leading-relaxed text-gray-400">If the file doesn't exist yet, create it by running:</p>
                <CodeBlock title="Initialize Config" language="bash" code={openclawInitCommand} />
            </section>

            {/* Edit Config */}
            <section className="space-y-6">
                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">2. Edit the Configuration File</h3>
                    <p className="text-sm leading-relaxed text-gray-400">
                        Open <code className="text-orange-300/80">openclaw.json</code> in any text editor and add the <code className="text-orange-300/80">mcp</code> section. This configuration works across Windows, macOS, and Linux.
                    </p>
                </div>

                <Callout title="Security Warning" tone="orange">
                    Replace the placeholder values (<code className="text-orange-200">YOUR_ALEO_ADDRESS</code>, <code className="text-orange-200">YOUR_PRIVATE_KEY</code>, etc.) with your actual credentials. <strong>Never share this file publicly.</strong>
                </Callout>

                <CodeBlock title="openclaw.json configuration" language="json" code={openclawConfigExample} />
            </section>

            {/* Verify */}
            <section className="space-y-4">
                <h3 className="text-lg font-bold text-white">3. Verify and Apply</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                    Restart OpenClaw to load the new MCP server and verify the integration:
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                    <CodeBlock title="Restart Service" language="bash" code={openclawRestartCommand} />
                    <CodeBlock title="Debug Gateway" language="bash" code={openclawGatewayCommand} />
                </div>
            </section>

            {/* Channels */}
            <section className="space-y-4">
                <h3 className="text-lg font-bold text-white">4. Connect Your Messaging Channels</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                    With NullPay active, connect your preferred chat platforms:
                </p>
                <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-white/[0.08] bg-white/[0.05]">
                                <tr>
                                    <th className="px-4 py-3 font-bold text-white/90">Platform</th>
                                    <th className="px-4 py-3 font-bold text-white/90">Setup Guide</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                <tr>
                                    <td className="px-4 py-3 font-medium text-gray-300">WhatsApp</td>
                                    <td className="px-4 py-3 text-[13px] text-gray-400">Scan QR code via your WhatsApp app (Linked Devices) using the Baileys bridge.</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-gray-300">Telegram</td>
                                    <td className="px-4 py-3 text-[13px] text-gray-400">Create a bot via @BotFather and add the token to your configuration.</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-gray-300">Slack</td>
                                    <td className="px-4 py-3 text-[13px] text-gray-400">Create a Slack App with Socket Mode enabled and use Bot & App tokens.</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-gray-300">Discord</td>
                                    <td className="px-4 py-3 text-[13px] text-gray-400">Create a Discord application and add the Bot Token to your config.</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-gray-300">Signal</td>
                                    <td className="px-4 py-3 text-[13px] text-gray-400">Requires <code className="text-orange-300/80">signal-cli</code> to link your account as a local device.</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-medium text-gray-300">iMessage</td>
                                    <td className="px-4 py-3 text-[13px] text-gray-400">macOS only. Uses the <code className="text-orange-300/80">imsg</code> bridge with <code className="text-orange-300/80">chat.db</code> file permissions.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <Callout title="Pro Tip" tone="emerald">
                    Refer to the <a href="https://docs.openclaw.ai/" target="_blank" rel="noopener noreferrer" className="text-emerald-300 underline underline-offset-4 hover:text-emerald-200">OpenClaw documentation</a> for detailed channel configuration.
                </Callout>
            </section>
        </div>
    ),
};
