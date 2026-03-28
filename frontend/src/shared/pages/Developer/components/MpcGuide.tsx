import React from 'react';
import { Bot, Command, KeyRound, RefreshCw, Wallet, Wrench, Link2, Search } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { DeveloperCodeBlock } from './DeveloperCodeBlock';
import { DeveloperStepCard } from './DeveloperStepCard';

const toolCards = [
    {
        icon: KeyRound,
        title: 'login',
        description: 'Starts the NullPay session, restores a backed-up password when possible, and can recover a burner wallet from on-chain records for the current session.'
    },
    {
        icon: Wrench,
        title: 'create_invoice',
        description: 'Creates a NullPay invoice from the selected wallet and returns the payment link, invoice hash, and relayer-backed transaction details.'
    },
    {
        icon: Link2,
        title: 'pay_invoice',
        description: 'Accepts a NullPay payment link or invoice hash, chooses the correct payment program, and pays the merchant from the user wallet.'
    },
    {
        icon: Search,
        title: 'get_transaction_info',
        description: 'Fetches invoice state, recent transaction history, and enriches private invoice amounts from records when the main private key is available.'
    }
];

export const MpcGuide: React.FC = () => {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <DeveloperStepCard step="01" title="Run Setup" desc="Launch the installer with one command from any terminal." icon={Command} />
                <DeveloperStepCard step="02" title="Pick Client" desc="Choose Claude Desktop or Claude Code (beta version) in the wizard." icon={Bot} />
                <DeveloperStepCard step="03" title="Enter Wallet" desc="Provide your main wallet address, private key, and optionally your NullPay password." icon={Wallet} />
                <DeveloperStepCard step="04" title="Restart Claude" desc="NullPay writes the MCP config automatically, then Claude reloads the new local server." icon={RefreshCw} />
            </div>

            <GlassCard className="p-8 md:p-10">
                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">MCP Setup</span>
                <h2 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)] mt-3 mb-2">Install NullPay MCP In A Few Minutes</h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-4xl">
                    <code className="text-orange-200 bg-orange-500/10 border border-orange-400/15 px-1.5 py-0.5 rounded">@nullpay/mcp</code> lets Claude use NullPay tools directly over MCP. The package already knows the NullPay backend, so the user only needs wallet credentials. If the password was backed up in records, the setup can leave it blank and NullPay can recover it during login.
                </p>

                <DeveloperCodeBlock
                    title="Install NullPay MCP"
                    language="bash"
                    code={`npx -y @nullpay/mcp`}
                />

                <DeveloperCodeBlock
                    title="What The Setup Wizard Looks Like"
                    language="text"
                    code={`NullPay MCP setup

Where do you want to install NullPay MCP?
1. Claude Code (beta version)
2. Claude Desktop
3. Cancel
Choose 1, 2, or 3: 2

NullPay will configure Claude automatically. You only need to provide your wallet credentials here.

Main wallet address: aleo1...
Main wallet private key: APrivateKey1...
NullPay password (optional if you have it backed up in your records):

NullPay MCP was added to your Claude config file.
Next step: fully restart Claude so it reloads the new MCP config.`}
                />

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-orange-400/20 bg-orange-500/10 px-5 py-5">
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-orange-300 mb-2">What Users Enter</p>
                        <p className="text-sm text-white/80 leading-relaxed">
                            Only the main wallet address, main private key, and optionally the NullPay password. Backend URLs and NullPay-managed infrastructure settings are bundled into the package.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-5">
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400 mb-2">Recovery Behavior</p>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            If the password or burner wallet was backed up in on-chain records, the MCP can recover them during login. Recovered burner data stays session-only and is not written back into the backend profile.
                        </p>
                    </div>
                </div>

                <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300 mb-2">Private Key Safety</p>
                    <p className="text-sm text-white/85 leading-relaxed">
                        Your main wallet private key stays on your machine inside the local MCP process. NullPay does not send that private key to the LLM, Claude, or the NullPay backend. It is only used locally for record access, backup recovery, and payment authorization.
                    </p>
                </div>
            </GlassCard>

            <GlassCard className="p-8 md:p-10">
                <h3 className="text-2xl font-bold text-gradient-gold drop-shadow-gold mb-3">Step-By-Step Flow</h3>
                <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
                    <p><span className="text-white font-semibold">1.</span> Open a terminal and run <code className="text-white bg-white/5 px-1.5 py-0.5 rounded">npx -y @nullpay/mcp</code>.</p>
                    <p><span className="text-white font-semibold">2.</span> Choose <code className="text-white bg-white/5 px-1.5 py-0.5 rounded">Claude Desktop</code> or <code className="text-white bg-white/5 px-1.5 py-0.5 rounded">Claude Code (beta version)</code>.</p>
                    <p><span className="text-white font-semibold">3.</span> Paste your main wallet address and main private key. Enter the password only if you know it and want normal login to use it immediately.</p>
                    <p><span className="text-white font-semibold">4.</span> Let the wizard write the Claude MCP config automatically on your device.</p>
                    <p><span className="text-white font-semibold">5.</span> Fully restart Claude so the new stdio MCP server is loaded.</p>
                    <p><span className="text-white font-semibold">6.</span> In Claude, call <code className="text-white bg-white/5 px-1.5 py-0.5 rounded">login</code> first, then use invoice or payment tools.</p>
                </div>

                <DeveloperCodeBlock
                    title="Published MCP Server Command"
                    language="json"
                    code={`{
  "mcpServers": {
    "nullpay": {
      "command": "npx",
      "args": ["-y", "@nullpay/mcp", "server"],
      "env": {
        "NULLPAY_MAIN_ADDRESS": "aleo1...",
        "NULLPAY_MAIN_PRIVATE_KEY": "APrivateKey1...",
        "NULLPAY_MAIN_PASSWORD": "optional"
      }
    }
  }
}`}
                />

                <DeveloperCodeBlock
                    title="Direct Server Mode"
                    language="bash"
                    code={`npx -y @nullpay/mcp server`}
                />
            </GlassCard>

            <GlassCard className="p-8 md:p-10">
                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">Tooling</span>
                <h3 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)] mt-3 mb-8">Available NullPay MCP Tools</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {toolCards.map((tool) => (
                        <div key={tool.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-400/20 flex items-center justify-center">
                                    <tool.icon className="w-4 h-4 text-orange-300" />
                                </div>
                                <code className="text-orange-200 bg-orange-500/10 border border-orange-400/15 px-2 py-1 rounded text-sm">{tool.title}</code>
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed">{tool.description}</p>
                        </div>
                    ))}
                </div>

                <DeveloperCodeBlock
                    title="Recommended Claude Flow"
                    language="text"
                    code={`1. login
2. create_invoice
3. pay_invoice
4. get_transaction_info

Start with login so the MCP can open the wallet session, recover on-chain backups when available, and decide whether the active wallet should be main or burner.`}
                />
            </GlassCard>

            <GlassCard className="p-8 md:p-10">
                <h3 className="text-2xl font-bold text-gradient-gold drop-shadow-gold mb-3">Operational Notes</h3>
                <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
                    <p>NullPay MCP uses the production backend by default, so users do not need to manually enter the backend URL or public site URL.</p>
                    <p>The user private key is not shared with the model or the backend. The backend only receives public invoice data or the final execution authorization string needed for sponsored execution.</p>
                    <p>Claude Desktop is the primary supported path today. Claude Code support is available as a beta version in the setup wizard.</p>
                    <p>For local development, you can point Claude to your local built file instead of <code className="text-white bg-white/5 px-1.5 py-0.5 rounded">npx</code>, but published installs should use the package command shown above.</p>
                </div>
            </GlassCard>
        </div>
    );
};

export default MpcGuide;
