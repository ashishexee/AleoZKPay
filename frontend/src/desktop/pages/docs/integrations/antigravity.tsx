import type { DocsSection } from '../types';
import { antigravityConfigExample } from '../examples';
import { CodeBlock, IntegrationBadge, Callout } from '../ui';
import { Terminal, CheckCircle2, AlertTriangle } from 'lucide-react';

export const antigravitySection: DocsSection = {
    id: 'int-antigravity',
    group: 'Clients',
    label: 'Antigravity',
    eyebrow: 'Integrations',
    title: 'How to Install NullPay in Google Antigravity',
    summary: 'A step-by-step guide to connecting the NullPay MCP server to your Google Antigravity IDE.',
    content: (
        <div className="space-y-12">
            <IntegrationBadge
                src="/assets/antigravity.svg"
                alt="Antigravity"
                title="Google Antigravity Integration"
                description="Connect NullPay directly to your IDE via the Model Context Protocol."
            />

            {/* Introduction */}
            <section className="space-y-4 text-gray-400 leading-relaxed text-[15px]">
                <p>
                    This guide will walk you through every step needed to connect the NullPay MCP (Model Context Protocol) server to <strong>Google Antigravity</strong>.
                    Once installed, you can interact with NullPay directly from your IDE—checking balances, sending payments, and creating invoices using natural language.
                </p>
            </section>

            {/* Prerequisites */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-xl font-bold text-white tracking-tight">Prerequisites</h2>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px] border-collapse">
                            <thead>
                                <tr className="border-b border-white/[0.06] bg-white/[0.04] text-[11px] uppercase tracking-widest text-gray-500">
                                    <th className="px-6 py-4 font-black">Requirement</th>
                                    <th className="px-6 py-4 font-black">Why You Need It</th>
                                    <th className="px-6 py-4 font-black">How to Check</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                <tr>
                                    <td className="px-6 py-4 font-bold text-gray-300">Node.js (v18+)</td>
                                    <td className="px-6 py-4 text-gray-400">Included <code className="text-orange-300/80">npx</code> is used to run the server.</td>
                                    <td className="px-6 py-4 text-gray-400 font-mono"><code className="text-orange-300/80">node --version</code></td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-bold text-gray-300">Google Antigravity</td>
                                    <td className="px-6 py-4 text-gray-400">The primary IDE hosting the MCP server.</td>
                                    <td className="px-6 py-4 text-gray-400 italic">First-time launch required</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-bold text-gray-300">NullPay Account</td>
                                    <td className="px-6 py-4 text-gray-400">Aleo address, private key, and password.</td>
                                    <td className="px-6 py-4 text-gray-400">
                                        <a href="https://nullpay.app" target="_blank" rel="noopener noreferrer" className="text-orange-400 underline underline-offset-4 hover:text-orange-300">
                                            Sign up here
                                        </a>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <Callout title="Windows Note" tone="blue">
                    You may need to restart your terminal or IDE after installing Node.js for <code className="text-blue-300/80">npx</code> to be globally recognized.
                </Callout>
            </section>

            {/* Step 1 */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-sm">01</div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Locate Configuration</h2>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
                    Antigravity stores its MCP settings in a hidden <code className="text-orange-300/80">.gemini</code> folder.
                    Locate the <code className="text-orange-300/80">mcp_config.json</code> file at the paths below:
                </p>
                <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px] border-collapse">
                            <thead>
                                <tr className="border-b border-white/[0.06] bg-white/[0.04] text-[11px] uppercase tracking-widest text-gray-500">
                                    <th className="px-6 py-4 font-black">Operating System</th>
                                    <th className="px-6 py-4 font-black">Config File Path</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                <tr>
                                    <td className="px-6 py-4 font-bold text-gray-300">Windows</td>
                                    <td className="px-6 py-4 font-mono text-gray-400">C:\Users\ \ .gemini\antigravity\mcp_config.json</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-bold text-gray-300">macOS / Linux</td>
                                    <td className="px-6 py-4 font-mono text-gray-400">~/.gemini/antigravity/mcp_config.json</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <Callout title="Hidden Files" tone="emerald">
                    Use <code className="text-emerald-300/80">Cmd + Shift + .</code> on macOS or enable "Hidden items" in Windows File Explorer to see the .gemini folder.
                </Callout>
            </section>

            {/* Step 2 */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-sm">02</div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Edit Configuration</h2>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                    Open the file and add the following configuration block within your <code className="text-orange-300/80">mcpServers</code> object.
                    Replace the placeholders with your actual NullPay credentials.
                </p>
                <CodeBlock title="mcp_config.json" language="json" code={antigravityConfigExample} />

                <div className="pt-6 space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500">Security Parameters</h3>
                    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[13px] border-collapse">
                                <thead>
                                    <tr className="border-b border-white/[0.06] bg-white/[0.04]">
                                        <th className="px-6 py-4 font-bold text-gray-200">Placeholder</th>
                                        <th className="px-6 py-4 font-bold text-gray-200">What to Replace It With</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    <tr>
                                        <td className="px-6 py-4 font-mono text-orange-300/80">YOUR_ALEO_ADDRESS</td>
                                        <td className="px-6 py-4 text-gray-400">Your public public Aleo address (Starts with <code className="text-gray-200">aleo1...</code>)</td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-4 font-mono text-orange-300/80">YOUR_PRIVATE_KEY</td>
                                        <td className="px-6 py-4 text-gray-400">Your Aleo private key (Starts with <code className="text-gray-200">APrivateKey1...</code>)</td>
                                    </tr>
                                    <tr>
                                        <td className="px-6 py-4 font-mono text-orange-300/80">YOUR_PASSWORD</td>
                                        <td className="px-6 py-4 text-gray-400">The password used to decrypt and authorize your NullPay wallet.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <Callout title="Critical Security" tone="orange">
                    Your private key and password are <strong>extremely sensitive</strong>. Treat this config file like a wallet file—never commit it to version control or share it publicly.
                </Callout>
            </section>

            {/* Quick Steps 3 & 4 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-sm">03</div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Apply Changes</h2>
                    </div>
                    <ul className="space-y-4 text-sm text-gray-400 leading-relaxed list-inside list-disc">
                        <li>Save and close the configuration file.</li>
                        <li><strong>Completely quit</strong> Google Antigravity (check background processes).</li>
                        <li>Restart Antigravity to initialize the new MCP server.</li>
                    </ul>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 font-black text-sm">04</div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Verify Setup</h2>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Open the <strong>Agent Panel</strong>, click the <strong>...</strong> icon at the top, and select <strong>MCP Servers</strong>.
                        Confirm that <code className="text-emerald-400 font-bold">nullpay</code> is listed with a green status indicator.
                    </p>
                </section>
            </div>

            {/* Example Commands */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <Terminal className="w-5 h-5 text-gray-500" />
                    <h2 className="text-xl font-bold text-white tracking-tight">Start Prompting</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        "Show my current NullPay balance.",
                        "Send 25 USDCx to aleo1...",
                        "Generate a donation invoice for 10 USAD.",
                        "Check the status of my recent payments."
                    ].map((prompt, i) => (
                        <div key={i} className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-orange-500/20 hover:bg-white/[0.04]">
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <code className="relative z-10 font-mono text-[13px] text-gray-300 group-hover:text-white transition-colors">
                                "{prompt}"
                            </code>
                        </div>
                    ))}
                </div>
            </section>

            {/* Troubleshooting */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-400/80" />
                    <h2 className="text-xl font-bold text-white tracking-tight">Troubleshooting</h2>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px] border-collapse">
                            <thead>
                                <tr className="border-b border-white/[0.06] bg-white/[0.04] text-[11px] uppercase tracking-widest text-gray-500">
                                    <th className="px-6 py-4 font-black">Symptom</th>
                                    <th className="px-6 py-4 font-black">Probable Cause</th>
                                    <th className="px-6 py-4 font-black">Solution</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                <tr>
                                    <td className="px-6 py-4 font-bold text-gray-300">Not listed in Panel</td>
                                    <td className="px-6 py-4 text-gray-400 whitespace-nowrap">JSON syntax error</td>
                                    <td className="px-6 py-4 text-gray-400">Validate the file for missing commas or brackets.</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-bold text-gray-300">Red error status</td>
                                    <td className="px-6 py-4 text-gray-400 whitespace-nowrap">Node.js / Path issue</td>
                                    <td className="px-6 py-4 text-gray-400">Verify <code className="text-orange-300/80">npx</code> works in your terminal.</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-bold text-gray-300">Auth failed</td>
                                    <td className="px-6 py-4 text-gray-400 whitespace-nowrap">Invalid credentials</td>
                                    <td className="px-6 py-4 text-gray-400">Ensure your address and secret key match the dashboard.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    ),
};
