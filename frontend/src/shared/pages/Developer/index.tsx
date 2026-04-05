import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Terminal, Command, Key, Globe, BookOpen, ArrowRight, CheckCircle, Lock, Zap, Shield, Copy, Check, Activity, Bot } from 'lucide-react';
import { SdkDashboard } from './components/SdkDashboard';
import { MerchantConsole } from './components/MerchantConsole';
import { QuickStartGuide } from './components/QuickStartGuide';
import { HostedCheckoutGuide } from './components/HostedCheckoutGuide';
import { MpcGuide } from './components/MpcGuide';
import { SdkMethodsGuide } from './components/SdkMethodsGuide';
import { WebhooksGuide } from './components/WebhooksGuide';
import { SdkReference } from './components/SdkReference';
import { DocsChatbot } from '../../components/DocsChatbot';

const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const CodeBlock = ({ title, code, language = 'javascript' }: { title: string; code: string; language?: string }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="mt-4 mb-6 group">
            <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-t-xl border-b-0 backdrop-blur-md">
                <span className="font-mono text-xs text-gray-400 font-medium uppercase tracking-widest">{title}</span>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-600 font-mono uppercase font-bold tracking-tighter">{language}</span>
                    <button onClick={handleCopy} className="text-gray-500 hover:text-white transition-colors">
                        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 hover:text-gray-300 transition-colors" />}
                    </button>
                </div>
            </div>
            <pre className="p-5 bg-[#09090b]/90 backdrop-blur-sm border border-white/[0.08] rounded-b-xl overflow-x-auto text-xs text-gray-300 font-mono leading-relaxed group-hover:border-orange-500/20 group-hover:shadow-[0_0_20px_rgba(249,115,22,0.04)] transition-all max-h-[500px] overflow-y-auto scrollbar-thin">
                <code>{code}</code>
            </pre>
        </div>
    );
};

// ─── Inline Property Breakdown ────────────────────────────────────────────────
const PropRow = ({ name, type, required, desc }: { name: string; type: string; required?: boolean; desc: string }) => (
    <div className="flex flex-col sm:flex-row items-start gap-3 py-4 border-b border-white/[0.06] last:border-b-0">
        <div className="flex items-center gap-2 min-w-[200px]">
            <code className="text-neon-primary text-xs font-mono font-bold">{name}</code>
            {required && <span className="text-[9px] text-red-400 font-black uppercase tracking-widest">req</span>}
        </div>
        <code className="text-blue-400 text-xs font-mono min-w-[80px]">{type}</code>
        <p className="text-gray-500 text-xs leading-relaxed flex-1">{desc}</p>
    </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status, desc }: { status: string; desc: string }) => {
    const colors: Record<string, string> = {
        PENDING: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
        SETTLED: 'text-green-400 bg-green-400/10 border-green-400/20',
        FAILED: 'text-red-400 bg-red-400/10 border-red-400/20',
        EXPIRED: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
    };
    return (
        <div className="flex items-center gap-4 py-3 border-b border-white/[0.05] last:border-0">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border font-mono ${colors[status] ?? 'text-white'}`}>{status}</span>
            <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const DeveloperPortal = () => {
    const { address: publicKey } = useWallet();
    const [name, setName] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [secretKey, setSecretKey] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('console');
    const [commandCopied, setCommandCopied] = useState(false);
    const [cliCommandCopied, setCliCommandCopied] = useState(false);
    const [mcpCommandCopied, setMcpCommandCopied] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    React.useEffect(() => {
        if (activeTab === 'analytics' && publicKey) {
            setLoadingStats(true);
            const apiUrl = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
            fetch(`${apiUrl}/merchants/stats/${publicKey}`)
                .then(res => res.json())
                .then(data => {
                    if (!data.error) setStats(data);
                })
                .catch(err => console.error(err))
                .finally(() => setLoadingStats(false));
        }
    }, [activeTab, publicKey]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!publicKey) { setError('Please connect your Aleo wallet first.'); return; }
        if (!name) { setError('Merchant name is required.'); return; }
        try {
            setLoading(true);
            setError(null);
            const apiUrl = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
            const response = await fetch(`${apiUrl}/merchants/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, aleo_address: publicKey, webhook_url: webhookUrl || null }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Registration failed.');
            setSecretKey(data.secret_key);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'console', label: 'Console', icon: Activity },
        { id: 'guide', label: 'Quick Start', icon: Zap },
        { id: 'cli', label: 'CLI Tools', icon: Command },
        { id: 'mcp', label: 'MCP Server', icon: Bot },
        { id: 'hosted', label: 'Hosted Checkout', icon: Globe },
        { id: 'methods', label: 'SDK Methods', icon: Terminal },
        { id: 'delivery', label: 'Webhooks', icon: Shield },
        { id: 'reference', label: 'SDK Reference', icon: BookOpen },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative min-h-screen"
        >
            {/* Background blobs */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px] animate-float" />
                <div className="absolute bottom-[-10%] right-[10%] w-[30%] h-[30%] bg-zinc-800/20 rounded-full blur-[100px] animate-float-delayed" />
            </div>

            {/* Aleo Globe */}
            <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-screen h-[800px] z-0 pointer-events-none flex justify-center overflow-hidden">
                <img
                    src="/assets/aleo_globe.png"
                    alt="Aleo Globe"
                    className="w-full h-full object-cover opacity-50 mix-blend-screen mask-image-gradient-b"
                    style={{
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                    }}
                />
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto pt-8 pb-24 px-6">

                {/* ── Hero ─────────────────────────────────────────────── */}
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    className="mb-8 flex flex-col items-center text-center"
                >


                    <motion.div variants={fadeInUp} className="mb-6">
                        <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">For Developers</span>
                    </motion.div>
                    <motion.h1
                        variants={fadeInUp}
                        className="text-4xl md:text-5xl font-bold tracking-tighter text-white mb-6"
                    >
                        Developers <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">Page</span>
                    </motion.h1>
                    <motion.p variants={fadeInUp} className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                        Complete SDK and API reference for private ZK payments.
                    </motion.p>

                    <motion.div variants={fadeInUp} className="mt-8 mb-4 flex flex-col gap-4 items-center">
                        <div className="flex flex-wrap justify-center gap-3">
                            <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/[0.1] rounded-2xl hover:border-orange-500/30 hover:bg-white/[0.05] hover:shadow-[0_0_20px_rgba(249,115,22,0.05)] transition-all group max-w-fit cursor-pointer relative overflow-hidden" onClick={() => {
                                navigator.clipboard.writeText('npm install @nullpay/node@latest');
                                setCommandCopied(true);
                                setTimeout(() => setCommandCopied(false), 2000);
                            }}>
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <svg className="w-4 h-4 text-[#CB3837] group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor"><path d="M0 7.334v8h6.666v2.666H12v-2.666h12v-8H0zm6.666 5.332H4V10h2.666v2.666zm5.334 0h-2.666V10h2.666v2.666zm8 0h-2.666V10h2.666v2.666z" /></svg>
                                <code className="text-sm font-mono text-orange-300 font-medium">npm install @nullpay/node@latest</code>
                                <div className="flex items-center gap-2 ml-5 border-l border-white/5 pl-5">
                                    {commandCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />}
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-gray-400 transition-colors w-[68px] inline-block">
                                        {commandCopied ? 'Copied brother' : 'Copy'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/[0.1] rounded-2xl hover:border-orange-500/30 hover:bg-white/[0.05] hover:shadow-[0_0_20px_rgba(249,115,22,0.05)] transition-all group max-w-fit cursor-pointer relative overflow-hidden" onClick={() => {
                                navigator.clipboard.writeText('npx @nullpay/cli@latest sdk onboard');
                                setCliCommandCopied(true);
                                setTimeout(() => setCliCommandCopied(false), 2000);
                            }}>
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Command className="w-4 h-4 text-gray-500 group-hover:text-orange-400 transition-colors" />
                                <code className="text-sm font-mono text-orange-300 font-medium">npx @nullpay/cli@latest sdk onboard</code>
                                <div className="flex items-center gap-2 ml-5 border-l border-white/5 pl-5">
                                    {cliCommandCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />}
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-gray-400 transition-colors w-[68px] inline-block">
                                        {cliCommandCopied ? 'Copied brother' : 'Copy'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/[0.1] rounded-2xl hover:border-orange-500/30 hover:bg-white/[0.05] hover:shadow-[0_0_20px_rgba(249,115,22,0.05)] transition-all group max-w-fit cursor-pointer relative overflow-hidden" onClick={() => {
                                navigator.clipboard.writeText('npx -y @nullpay/mcp');
                                setMcpCommandCopied(true);
                                setTimeout(() => setMcpCommandCopied(false), 2000);
                            }}>
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Bot className="w-4 h-4 text-gray-500 group-hover:text-orange-400 transition-colors" />
                                <code className="text-sm font-mono text-orange-300 font-medium">npx -y @nullpay/mcp</code>
                                <div className="flex items-center gap-2 ml-5 border-l border-white/5 pl-5">
                                    {mcpCommandCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />}
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-gray-400 transition-colors w-[68px] inline-block">
                                        {mcpCommandCopied ? 'Copied brother' : 'Copy'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <span className="text-[10px] text-orange-500/70 font-black uppercase tracking-[0.2em] text-center">Run the SDK and CLI commands inside the root of your Node.js backend. Run the MCP command from any terminal on the user machine.</span>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="flex flex-wrap justify-center gap-10 mt-6 mb-2">
                        <motion.div 
                            layout
                            className="flex items-center gap-5 px-8 py-2 transition-colors duration-500 group/badge"
                        >
                            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500 mr-4 border-r border-white/10 pr-8 select-none whitespace-nowrap">MCP Works Seamlessly With</span>
                            <div className="flex items-center gap-12">
                                <motion.div 
                                    layout
                                    className="group/tool flex items-center cursor-pointer"
                                    whileHover="hover"
                                    initial="initial"
                                >
                                    <div className="relative flex items-center">
                                        <div className="absolute inset-[-20%] bg-orange-500/15 blur-3xl rounded-full opacity-0 group-hover/tool:opacity-100 transition-opacity duration-700" />
                                        <motion.img 
                                            layout
                                            src="/assets/claude.svg" 
                                            alt="Claude" 
                                            className="w-14 h-14 object-contain relative z-10 transition-all duration-700"
                                            variants={{
                                                initial: { scale: 1, rotate: 0 },
                                                hover: { scale: 1.15, rotate: -5 }
                                            }}
                                        />
                                        <motion.span 
                                            layout
                                            variants={{
                                                initial: { width: 0, opacity: 0, marginLeft: 0, x: -10 },
                                                hover: { width: 'auto', opacity: 1, marginLeft: 20, x: 0 }
                                            }}
                                            transition={{ 
                                                width: { type: "spring", stiffness: 100, damping: 20 },
                                                opacity: { duration: 0.4 },
                                                x: { type: "spring", stiffness: 100, damping: 20 }
                                            }}
                                            className="overflow-hidden whitespace-nowrap text-[15px] font-bold text-white relative z-10 tracking-tight"
                                        >
                                            Claude Desktop
                                        </motion.span>
                                    </div>
                                </motion.div>

                                <motion.div 
                                    layout
                                    className="group/tool flex items-center cursor-pointer"
                                    whileHover="hover"
                                    initial="initial"
                                >
                                    <div className="relative flex items-center">
                                        <div className="absolute inset-[-20%] bg-blue-500/10 blur-3xl rounded-full opacity-0 group-hover/tool:opacity-100 transition-opacity duration-700" />
                                        <motion.img 
                                            layout
                                            src="/assets/cursor-ide.png" 
                                            alt="Cursor" 
                                            className="w-16 h-16 object-contain relative z-10 transition-all duration-700"
                                            variants={{
                                                initial: { scale: 1, rotate: 0 },
                                                hover: { scale: 1.15, rotate: 5 }
                                            }}
                                        />
                                        <motion.span 
                                            layout
                                            variants={{
                                                initial: { width: 0, opacity: 0, marginLeft: 0, x: -10 },
                                                hover: { width: 'auto', opacity: 1, marginLeft: 20, x: 0 }
                                            }}
                                            transition={{ 
                                                width: { type: "spring", stiffness: 100, damping: 20 },
                                                opacity: { duration: 0.4 },
                                                x: { type: "spring", stiffness: 100, damping: 20 }
                                            }}
                                            className="overflow-hidden whitespace-nowrap text-[15px] font-bold text-white relative z-10 tracking-tight"
                                        >
                                            Cursor IDE
                                        </motion.span>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </motion.div>
                </motion.div>

                {/* ── Sticky Tab Nav ────────────────────────────────────── */}
                <div className="sticky top-24 z-50 mb-12">
                    <div className="overflow-x-auto scrollbar-thin">
                        <div className="flex flex-nowrap gap-2 bg-black/60 backdrop-blur-2xl p-2 rounded-2xl border border-white/[0.06] w-max min-w-full">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-white text-black shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                                    }`}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        ))}
                        </div>
                    </div>
                </div>

                {/* ── Tab Content ───────────────────────────────────────── */}
                <AnimatePresence mode="wait">
                    {activeTab === 'console' && (
                        <motion.div key="console" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <MerchantConsole
                                publicKey={publicKey}
                                name={name}
                                setName={setName}
                                webhookUrl={webhookUrl}
                                setWebhookUrl={setWebhookUrl}
                                loading={loading}
                                error={error}
                                secretKey={secretKey}
                                setSecretKey={setSecretKey}
                                handleRegister={handleRegister}
                            />
                        </motion.div>
                    )}
                    {activeTab === 'guide' && (
                        <motion.div key="guide" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <QuickStartGuide />
                        </motion.div>
                    )}
                    {activeTab === 'hosted' && (
                        <motion.div key="hosted" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <HostedCheckoutGuide />
                        </motion.div>
                    )}
                    {activeTab === 'cli' && (
                        <motion.div key="cli" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <GlassCard className="p-8 md:p-10">
                                <h2 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)] mb-2">NullPay CLI & nullpay.json</h2>
                                <p className="text-gray-300 text-sm leading-relaxed mb-10 max-w-3xl">
                                    The <code className="text-orange-200 bg-orange-500/10 border border-orange-400/15 px-1.5 py-0.5 rounded">@nullpay/cli</code> provides an interactive terminal wizard to securely configure and deploy your multi-pay and donation invoices directly to the Aleo network.
                                </p>

                                <h3 className="text-lg font-bold text-gradient-gold drop-shadow-gold mb-4">1. Run the interactive wizard</h3>
                                <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                                    Instead of creating invoices manually via code, generate them instantly by running the CLI from the root of your backend project.
                                </p>
                                <CodeBlock title="Run via npx" language="bash" code={`npx @nullpay/cli@latest sdk onboard`} />

                                <h3 className="text-lg font-bold text-gradient-gold drop-shadow-gold mb-4 mt-8">2. Review your nullpay.json</h3>
                                <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                                    The CLI securely communicates with the Aleo testnet via the Relayer to deploy your invoices and returns a mapped <code className="text-orange-200 bg-orange-500/10 border border-orange-400/15 px-1.5 py-0.5 rounded">invoice_hash</code> and <code className="text-orange-200 bg-orange-500/10 border border-orange-400/15 px-1.5 py-0.5 rounded">salt</code> for each.
                                    These are saved in a <code className="text-white bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">nullpay.json</code> file in your project root for your backend integration.
                                </p>
                                <CodeBlock title="Example nullpay.json" language="json" code={`{
  "merchant": "aleo1...",
  "generated_at": "2026-03-21T10:00:00.000Z",
  "invoices": [
    {
      "name": "pro-plan",
      "type": "multipay",
      "amount": 50,
      "currency": "USDCX",
      "hash": "...",
      "salt": "..."
    }
  ]
}`} />

                                <h3 className="text-lg font-bold text-gradient-gold drop-shadow-gold mb-4 mt-8">3. Use invoices in your backend</h3>
                                <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                                    The <code className="text-orange-200 bg-orange-500/10 border border-orange-400/15 px-1.5 py-0.5 rounded">@nullpay/node</code> SDK automatically reads the <code className="text-white bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">nullpay.json</code> file if it exists.
                                    This allows you to create checkout sessions by simply referencing your pre-generated invoices by name rather than hardcoding amounts, hashes, and salts in your code.
                                </p>
                                <p className="text-gray-300 text-sm mb-5 leading-relaxed">
                                    <span className="text-gradient-gold drop-shadow-gold font-semibold">nullpay.json is optional</span>; use it for named pre-generated invoices, or skip it and create sessions directly with <code className="text-white bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">amount</code>, <code className="text-white bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">currency</code>, and <code className="text-white bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">type</code>.
                                </p>
                                <CodeBlock title="Creating a checkout session" code={`import path from 'path';
import { NullPay } from '@nullpay/node';

const nullpay = new NullPay({
    secretKey: process.env.NULLPAY_SECRET_KEY!,
    projectRoot: __dirname,
    configPath: path.join(__dirname, 'nullpay.json'),
});

export async function createCheckout(req, res) {
    // Pass the name you defined in the CLI wizard!
    const session = await nullpay.checkout.sessions.create({
        nullpay_invoice_name: 'pro-plan', // Uses hash, salt, amount, and currency from nullpay.json
        success_url: 'https://yoursite.com/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://yoursite.com/cart',
    });

    res.redirect(303, session.checkout_url);
}`} />

                                <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 via-white/[0.02] to-transparent border border-orange-400/20 shadow-[0_0_30px_rgba(249,115,22,0.08)]">
                                    <h4 className="text-gradient-gold drop-shadow-gold font-bold mb-2 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-orange-300" />
                                        Deployment Note
                                    </h4>
                                    <p className="text-sm text-gray-300 leading-relaxed mt-4">
                                        If your backend runs on Vercel or another serverless runtime, initialize <code className="text-orange-200 bg-orange-500/10 border border-orange-400/15 px-1.5 py-0.5 rounded">NullPay</code> with <code className="text-white bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">projectRoot</code> and <code className="text-white bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">configPath</code> so <code className="text-white bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">nullpay.json</code> is resolved from the exact backend folder.
                                    </p>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                    {activeTab === 'mcp' && (
                        <motion.div key="mcp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <MpcGuide />
                        </motion.div>
                    )}
                    {activeTab === 'methods' && (
                        <motion.div key="methods" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <SdkMethodsGuide />
                        </motion.div>
                    )}
                    {activeTab === 'delivery' && (
                        <motion.div key="delivery" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <WebhooksGuide />
                        </motion.div>
                    )}
                    {activeTab === 'reference' && (
                        <motion.div key="reference" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            {/* Lazy import to avoid circularity */}
                            <React.Suspense fallback={<div className="p-6 bg-white/5 rounded-xl">Loading...</div>}>
                                <SdkReference />
                            </React.Suspense>
                        </motion.div>
                    )}
                    {activeTab === 'sdk_dashboard' && (
                        <motion.div key="sdk_dashboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <SdkDashboard />
                        </motion.div>
                    )}
                    {/* ── ANALYTICS ── */}
                    {activeTab === 'analytics' && (
                        <motion.div key="analytics" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <GlassCard className="p-8 md:p-10">
                                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">SDK Analytics</span>
                                <h2 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)] mt-3 mb-2">Checkout Metrics</h2>
                                <p className="text-gray-400 text-sm leading-relaxed mb-10">
                                    Monitor your payment volume and conversion rates across all generated checkout sessions.
                                    Only sessions with <code className="text-neon-primary bg-white/5 px-1.5 py-0.5 rounded">SETTLED</code> status are counted in volume.
                                </p>

                                {!publicKey ? (
                                    <div className="text-center p-8 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
                                        <p className="text-gray-400 mb-4">Connect your wallet to view analytics.</p>
                                        <div className="flex justify-center"><WalletMultiButton className="!bg-white !text-black !font-bold !rounded-xl !h-12" /></div>
                                    </div>
                                ) : loadingStats ? (
                                    <div className="flex space-x-6">
                                        <div className="h-32 w-full bg-white/5 animate-pulse rounded-2xl" />
                                        <div className="h-32 w-full bg-white/5 animate-pulse rounded-2xl" />
                                        <div className="h-32 w-full bg-white/5 animate-pulse rounded-2xl" />
                                    </div>
                                ) : !stats ? (
                                    <div className="text-center py-10">
                                        <p className="text-gray-500 mb-4">Register as a merchant to start tracking analytics.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Volume</p>
                                            <p className="text-3xl font-black text-white">{stats.total_volume || 0} <span className="text-sm text-gray-400 font-medium">Credits</span></p>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Successful Sessions</p>
                                            <p className="text-3xl font-black text-white">{stats.successful_sessions || 0}</p>
                                            <p className="text-xs text-gray-500 mt-2">out of {stats.total_sessions || 0}</p>
                                        </div>
                                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Conversion Rate</p>
                                            <p className="text-3xl font-black text-white">{stats.conversion_rate || '0.0'}%</p>
                                        </div>
                                    </div>
                                )}
                            </GlassCard>
                        </motion.div>
                    )}

                    {/* ── QUICK START ── */}
                    {activeTab === 'quickstart' && (
                        <motion.div key="quickstart" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {[
                                    { n: '01', title: 'Install SDK', desc: 'One npm command to add the NullPay Node client to your backend.', icon: Terminal },
                                    { n: '02', title: 'Create Session', desc: 'Generate a unique checkout URL with amount, currency, and redirect URLs.', icon: Key },
                                    { n: '03', title: 'Verify & Fulfill', desc: 'Listen to webhooks or poll the session to confirm payment and unlock value.', icon: CheckCircle },
                                ].map((step, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-500 group"
                                    >
                                        <div className="flex items-center gap-3 mb-5">
                                            <span className="text-[11px] font-black text-gray-600 font-mono">{step.n}</span>
                                            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center group-hover:border-white/20 transition-all">
                                                <step.icon className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                                        <p className="text-gray-500 text-sm leading-relaxed group-hover:text-gray-400 transition-colors">{step.desc}</p>
                                    </motion.div>
                                ))}
                            </div>

                            <GlassCard className="p-8 md:p-10">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">Installation</h2>
                                    <a
                                        href="https://www.npmjs.com/package/@nullpay/node"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                                    >
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M0 7.334v8h6.666v2.666H12v-2.666h12v-8H0zm6.666 5.332H4V10h2.666v2.666zm5.334 0h-2.666V10h2.666v2.666zm8 0h-2.666V10h2.666v2.666z" /></svg>
                                        npm package
                                    </a>
                                </div>
                                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                    The <code className="text-neon-primary bg-white/5 px-1.5 py-0.5 rounded">@nullpay/node</code> SDK is a lightweight client for your Node.js backend.
                                    Never expose your secret key on the frontend.
                                </p>
                                <CodeBlock title="Install SDK" language="bash" code={`npm install @nullpay/node@latest`} />

                                <h2 className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)] mt-10 mb-2">Initialize the Client</h2>
                                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                    Instantiate once and reuse. Your <code className="text-neon-primary bg-white/5 px-1.5 py-0.5 rounded">secretKey</code> starts with <code className="text-gray-300 bg-white/5 px-1.5 py-0.5 rounded">sk_</code>.
                                    Store it in an environment variable — never commit it to source control.
                                </p>
                                <CodeBlock title="nullpay.ts — Server-side client" code={`import path from 'path';
import { NullPay } from '@nullpay/node';

const nullpay = new NullPay({
    secretKey: process.env.NULLPAY_SECRET_KEY!, // sk_xxxxxxxxxxxxxxxx
    projectRoot: __dirname, // recommended on Vercel/serverless
    configPath: path.join(__dirname, 'nullpay.json'),
});

export default nullpay;`} />
                                <p className="text-gray-500 text-xs mt-3 leading-relaxed">
                                    If you use <code className="text-neon-primary bg-white/5 px-1.5 py-0.5 rounded">nullpay.json</code> on Vercel or another serverless runtime, include <code className="text-neon-primary bg-white/5 px-1.5 py-0.5 rounded">projectRoot</code> and <code className="text-neon-primary bg-white/5 px-1.5 py-0.5 rounded">configPath</code> so the SDK resolves the file from the exact backend folder.
                                </p>

                                <h2 className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)] mt-10 mb-2">Create a Checkout Session</h2>
                                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                    Call this from your server when a user initiates a purchase.
                                    The returned <code className="text-neon-primary bg-white/5 px-1.5 py-0.5 rounded">session.checkout_url</code> is a unique, one-time payment page
                                    hosted on NullPay where the user's browser generates the ZK-proof.
                                </p>
                                <CodeBlock title="POST /api/checkout — Your backend route" code={`import nullpay from './nullpay';

export async function createCheckout(req, res) {
    const session = await nullpay.checkout.sessions.create({
        amount: 50,         // Number of tokens (e.g. 50 USDCX)
        currency: 'USDCX', // 'CREDITS' | 'USDCX' | 'USAD'

        // The placeholder {CHECKOUT_SESSION_ID} is auto-replaced by NullPay
        success_url: 'https://yoursite.com/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://yoursite.com/cart',
    });

    // Redirect the user to the NullPay payment page
    res.redirect(303, session.checkout_url);
}`} />

                                <h2 className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)] mt-10 mb-2">Verify the Payment on Success</h2>
                                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                    On your <code className="text-neon-primary bg-white/5 px-1.5 py-0.5 rounded">success_url</code>, retrieve the session using the
                                    <code className="text-neon-primary bg-white/5 px-1.5 py-0.5 rounded mx-1">session_id</code> query parameter.
                                    Always verify <code className="text-neon-primary bg-white/5 px-1.5 py-0.5 rounded">status === 'SETTLED'</code> before fulfilling orders.
                                </p>
                                <CodeBlock title="GET /success — Your success page handler" code={`import nullpay from './nullpay';

export async function handleSuccess(req, res) {
    const { session_id } = req.query;

    // Retrieve the session from NullPay
    const session = await nullpay.checkout.sessions.retrieve(session_id);

    if (session.status !== 'SETTLED') {
        // Payment not confirmed — do NOT fulfill
        return res.redirect('/cart?error=payment_not_confirmed');
    }

    // ✅ Payment confirmed on Aleo. Fulfill the order.
    await db.orders.fulfill({ sessionId: session_id });
    await sendConfirmationEmail(session.metadata);

    res.send('Order confirmed!');
}`} />
                            </GlassCard>
                        </motion.div>
                    )}

                    {/* ── SDK REFERENCE ── */}
                    {activeTab === 'sdk' && (
                        <motion.div key="sdk" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <GlassCard className="p-8 md:p-10">
                                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">SDK Reference</span>
                                <h2 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)] mt-3 mb-2">NullPay Node SDK</h2>
                                <p className="text-gray-400 text-sm leading-relaxed mb-10">
                                    Complete reference for all methods in the <code className="text-neon-primary">@nullpay/node</code> package.
                                </p>

                                <div className="space-y-12">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                                            <Terminal className="w-5 h-5 text-gray-500" />
                                            new NullPay(config)
                                        </h3>
                                        <p className="text-gray-500 text-sm mb-5 leading-relaxed">Constructor. Creates and authenticates the client with NullPay servers.</p>
                                        <div className="bg-black/40 rounded-2xl border border-white/[0.06] divide-y divide-white/[0.04] px-4 mb-5">
                                            <PropRow name="secretKey" type="string" required desc="Your merchant Secret API Key. Must start with sk_. Store in environment variables only." />
                                            <PropRow name="projectRoot" type="string" desc="Optional backend root for resolving nullpay.json. Recommended on serverless runtimes." />
                                            <PropRow name="configPath" type="string" desc="Optional exact file path to nullpay.json for deterministic lookup." />
                                        </div>
                                        <CodeBlock title="Initialization" code={`import path from 'path';
import { NullPay } from '@nullpay/node';

const nullpay = new NullPay({
    secretKey: 'sk_test_••••••••',
    projectRoot: __dirname,
    configPath: path.join(__dirname, 'nullpay.json'),
});`} />
                                    </div>

                                    <div className="pt-4 border-t border-white/[0.06]">
                                        <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                                            <Key className="w-5 h-5 text-gray-500" />
                                            nullpay.checkout.sessions.create(params)
                                        </h3>
                                        <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                                            Creates a new Checkout Session. Returns a session object with a unique <code className="text-neon-primary">checkout_url</code>.
                                            The user must be redirected to this URL to complete payment. Each session is single-use.
                                        </p>
                                        <div className="bg-black/40 rounded-2xl border border-white/[0.06] divide-y divide-white/[0.04] px-4 mb-5">
                                            <PropRow name="amount" type="number" required desc="The amount of tokens to charge. Denominated in whole units (e.g. 50 for 50 USDCX)." />
                                            <PropRow name="currency" type="'CREDITS' | 'USDCX' | 'USAD'" required desc="The token type to accept as payment." />
                                            <PropRow name="success_url" type="string" required desc="URL to redirect after successful payment. Use {CHECKOUT_SESSION_ID} as a placeholder." />
                                            <PropRow name="cancel_url" type="string" desc="URL to redirect if the user cancels or closes the checkout." />
                                        </div>
                                        <CodeBlock title="Create session" code={`const session = await nullpay.checkout.sessions.create({
    amount: 100,
    currency: 'USDCX',
    success_url: 'https://yoursite.com/success?id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://yoursite.com/cart',
});

console.log(session.id);   // ses_abc123
console.log(session.checkout_url);  // https://nullpay.app/checkout/ses_abc123`} />
                                    </div>

                                    <div className="pt-4 border-t border-white/[0.06]">
                                        <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-gray-500" />
                                            nullpay.checkout.sessions.retrieve(id)
                                        </h3>
                                        <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                                            Fetches a previously created session by its ID. Use this on your <code className="text-neon-primary">success_url</code> page to
                                            verify payment status before fulfilling an order. Always check <code className="text-neon-primary">status === 'SETTLED'</code>.
                                        </p>
                                        <div className="bg-black/40 rounded-2xl border border-white/[0.06] divide-y divide-white/[0.04] px-4 mb-5">
                                            <PropRow name="id" type="string" required desc="The session ID returned from sessions.create() or from the {CHECKOUT_SESSION_ID} URL placeholder." />
                                        </div>
                                        <CodeBlock title="Retrieve session" code={`const session = await nullpay.checkout.sessions.retrieve('ses_abc123');

// Always guard on status before fulfilling
if (session.status === 'SETTLED') {
    console.log('Payment confirmed! Invoice:', session.invoice_hash);
    console.log('Amount paid:', session.amount, session.token_type);
}`} />
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}

                    {/* ── SESSIONS API ── */}
                    {activeTab === 'sessions' && (
                        <motion.div key="sessions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <GlassCard className="p-8 md:p-10">
                                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">Sessions API</span>
                                <h2 className="text-3xl font-bold text-white mt-3 mb-2">Checkout Session Object</h2>
                                <p className="text-gray-400 text-sm leading-relaxed mb-10">
                                    A Checkout Session represents the entire lifecycle of a payment — from creation through on-chain settlement.
                                    All sensitive fields are encrypted at rest using AES-256-GCM.
                                </p>

                                <h3 className="text-lg font-bold text-white mb-4">Session Properties</h3>
                                <div className="bg-black/40 rounded-2xl border border-white/[0.06] divide-y divide-white/[0.04] px-4 mb-10">
                                    <PropRow name="id" type="string" desc="Unique identifier for the session. Format: ses_xxxxxxxx." />
                                    <PropRow name="status" type="string" desc="Payment status. One of: PROCESSING, PENDING, SETTLED, FAILED." />
                                    <PropRow name="amount" type="number" desc="The amount charged, in whole token units (e.g. 50 for 50 USDCX). Available on retrieve." />
                                    <PropRow name="token_type" type="string" desc="Token type: CREDITS, USDCX, or USAD. Available on retrieve." />
                                    <PropRow name="checkout_url" type="string" desc="The one-time checkout URL to redirect your customer to." />
                                    <PropRow name="invoice_hash" type="string" desc="The zero-knowledge invoice hash." />
                                </div>

                                <h3 className="text-lg font-bold text-white mb-4">Status Lifecycle</h3>
                                <div className="bg-black/40 rounded-2xl border border-white/[0.06] px-5 py-2 mb-10">
                                    <StatusBadge status="PENDING" desc="Session created. The user has been redirected to the checkout page but has not yet submitted payment." />
                                    <StatusBadge status="SETTLED" desc="Payment confirmed on Aleo. The ZK-proof has been verified and funds have moved on-chain. Safe to fulfill." />
                                    <StatusBadge status="FAILED" desc="The transaction was submitted but rejected by the Aleo network. Do NOT fulfill. Contact support." />
                                    <StatusBadge status="EXPIRED" desc="The session was not completed within the time limit (24h). Create a new session for the user." />
                                </div>

                                <h3 className="text-lg font-bold text-white mb-4">Raw HTTP API (without SDK)</h3>
                                <CodeBlock title="POST /api/checkout/sessions" language="http" code={`POST https://nullpay-backend-ib5q4.ondigitalocean.app/api/checkout/sessions
Authorization: Bearer sk_test_xxxxxxxxxxxxxxxx
Content-Type: application/json

{
    "amount": 100,
    "currency": "USDCX",
    "success_url": "https://yoursite.com/success?id={CHECKOUT_SESSION_ID}",
    "cancel_url": "https://yoursite.com/cart"
}

// Response 200 OK
{
    "id": "ses_a1b2c3d4",
    "checkout_url": "https://nullpay.app/checkout/ses_a1b2c3d4",
    "status": "PROCESSING",
    "invoice_hash": "...",
    "salt": "..."
}`} />

                                <CodeBlock title="GET /api/checkout/sessions/:id" language="http" code={`GET https://nullpay-backend-ib5q4.ondigitalocean.app/api/checkout/sessions/ses_a1b2c3d4
Authorization: Bearer sk_test_xxxxxxxxxxxxxxxx

// Response 200 OK — payment settled
{
    "id": "ses_a1b2c3d4",
    "status": "SETTLED",
    "amount": 100,
    "token_type": "USDCX",
    "invoice_hash": "...",
    "merchant_name": "My Premium Store"
}`} />
                            </GlassCard>
                        </motion.div>
                    )}

                    {/* ── WEBHOOKS ── */}
                    {activeTab === 'webhooks' && (
                        <motion.div key="webhooks" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                            <GlassCard className="p-8 md:p-10">
                                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">Webhooks</span>
                                <h2 className="text-3xl font-bold text-white mt-3 mb-2">Real-Time Event Delivery</h2>
                                <p className="text-gray-400 text-sm leading-relaxed mb-10">
                                    Webhooks are the recommended way to fulfill orders. When a payment settles on-chain, NullPay sends an
                                    authenticated <code className="text-neon-primary bg-white/5 px-1.5 py-0.5 rounded">POST</code> request to your registered webhook URL
                                    within seconds. You set your webhook URL when registering as a merchant.
                                </p>

                                <h3 className="text-lg font-bold text-white mb-4">Event Payload</h3>
                                <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                                    NullPay sends a JSON body containing the webhook event object. Use the SDK's <code className="text-neon-primary">constructEvent</code> to automatically parse and verify the HMAC-SHA256 signature in one step.
                                </p>
                                <CodeBlock title="Webhook POST body" language="json" code={`{
    "id": "ses_a1b2c3d4",
    "amount": 100,
    "token_type": "USDCX",
    "status": "SETTLED",
    "tx_id": "at1abc...xyz",
    "timestamp": "2025-03-13T07:30:00.000Z"
}`} />

                                <h3 className="text-lg font-bold text-white mb-4 mt-8">Handling Webhooks in Express</h3>
                                <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                                    Your endpoint must respond with a <code className="text-neon-primary">2xx</code> status within 30 seconds.
                                    If it doesn't, NullPay will retry delivery up to 3 times with exponential backoff.
                                </p>
                                <CodeBlock title="Express webhook handler" code={`import express from 'express';
import nullpay from './nullpay';

const app = express();

// ⚠️ Ensure you capture the raw body for signature verification
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['x-nullpay-signature'];

    try {
        const event = nullpay.webhooks.constructEvent(req.body.toString(), signature);

        if (event.status === 'SETTLED') {
            // ✅ Double-check session status via API before fulfilling
            const verified = await nullpay.checkout.sessions.retrieve(event.id);

            if (verified.status === 'SETTLED') {
                // Fulfill the order in your database
                await db.orders.updateStatus(event.id, 'fulfilled');
                console.log('Order fulfilled for session:', event.id);
            }
        }

        // Always return 200 to acknowledge receipt
        res.status(200).json({ received: true });
    } catch (err) {
        res.status(400).send(\`Webhook Error: \${err.message}\`);
    }
});`} />

                                <div className="mt-8 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                                    <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-gray-400" />
                                        Security Best Practices
                                    </h4>
                                    <div className="space-y-3 mt-4">
                                        {[
                                            'Always verify the session status via API before fulfilling — do not trust the webhook payload alone.',
                                            'Your webhook URL should use HTTPS in production.',
                                            'Implement idempotency — store processed session IDs to prevent double-fulfillment on retries.',
                                            'Use a secret key rotation strategy — register a new merchant account if your key is compromised.',
                                        ].map((tip, i) => (
                                            <div key={i} className="flex items-start gap-3 text-sm text-gray-400">
                                                <span className="w-4 h-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-gray-600 font-bold shrink-0 mt-0.5">{i + 1}</span>
                                                {tip}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}

                    {/* ── API KEYS / REGISTRATION ── */}
                    {activeTab === 'keys' && (
                        <motion.div key="keys" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                                {/* Registration Card */}
                                <GlassCard className="p-8">
                                    <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">Step 01</span>
                                    <h2 className="text-2xl font-bold text-white mt-3 mb-2">Register as a Merchant</h2>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-8">
                                        Connect your Aleo wallet to register. Your wallet address becomes the settlement destination — all payments flow here.
                                        Your Secret Key is encrypted with <strong className="text-white">AES-256-GCM</strong> before being stored.
                                    </p>

                                    {!publicKey ? (
                                        <div className="space-y-5 text-center py-4">
                                            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto">
                                                <Lock className="w-6 h-6 text-gray-500" />
                                            </div>
                                            <p className="text-gray-500 text-sm">Connect your Aleo wallet to identify yourself. Payments settle to this address.</p>
                                            <div className="wallet-adapter-wrapper w-full [&>button]:!w-full [&>button]:!bg-white [&>button]:!text-black [&>button]:!font-black [&>button]:!rounded-xl [&>button]:!h-12">
                                                <WalletMultiButton />
                                            </div>
                                        </div>
                                    ) : secretKey ? (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                                            <div className="p-4 bg-white/[0.04] border border-white/[0.08] rounded-xl">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                                    <span className="text-sm font-bold text-white">Merchant Registered</span>
                                                </div>
                                                <p className="text-gray-400 text-xs leading-relaxed mb-4">
                                                    Copy your Secret Key and store it in an environment variable immediately.
                                                    This is the <span className="text-red-400 font-bold">only time</span> it will be shown.
                                                </p>
                                                <div className="bg-black/60 rounded-xl p-4 border border-white/10 relative overflow-hidden">
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-neon-primary to-neon-accent" />
                                                    <code className="text-neon-primary text-xs font-mono break-all pl-2">{secretKey}</code>
                                                </div>
                                                <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mt-3 animate-pulse">⚠ Copy now — cannot be recovered later</p>
                                            </div>
                                            <Button variant="secondary" className="w-full" onClick={() => setSecretKey(null)}>
                                                Register Another Store
                                            </Button>
                                        </motion.div>
                                    ) : (
                                        <form onSubmit={handleRegister} className="space-y-5">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Store Name *</label>
                                                <input
                                                    value={name}
                                                    onChange={e => setName(e.target.value)}
                                                    placeholder="e.g. My Premium Store"
                                                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition-colors font-mono"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Webhook URL <span className="text-gray-600 normal-case tracking-normal font-normal">(recommended)</span></label>
                                                <input
                                                    type="url"
                                                    value={webhookUrl}
                                                    onChange={e => setWebhookUrl(e.target.value)}
                                                    placeholder="https://yoursite.com/api/webhook"
                                                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30 transition-colors font-mono"
                                                />
                                                <p className="text-[10px] text-gray-600 mt-1.5 ml-1">NullPay will POST here every time a payment settles.</p>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block">Settlement Address</label>
                                                <div className="bg-black/30 rounded-xl p-3.5 border border-white/[0.05]">
                                                    <p className="text-[10px] text-gray-500 font-mono break-all">{publicKey}</p>
                                                </div>
                                            </div>
                                            {error && (
                                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                                    <p className="text-xs text-red-400">{error}</p>
                                                </div>
                                            )}
                                            <Button type="submit" variant="primary" glow className="w-full h-14 text-base" disabled={loading}>
                                                {loading ? (
                                                    <span className="flex items-center gap-2">
                                                        <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                        Generating...
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2">
                                                        <Key className="w-4 h-4" />
                                                        Generate Secret Key
                                                        <ArrowRight className="w-4 h-4" />
                                                    </span>
                                                )}
                                            </Button>
                                        </form>
                                    )}
                                </GlassCard>

                                {/* Info Side */}
                                <div className="space-y-5">
                                    <div className="p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                                        <h3 className="text-lg font-bold text-white mb-4">Key Security Model</h3>
                                        <div className="space-y-4">
                                            {[
                                                { label: 'Encryption at Rest', desc: 'Your secret key is hashed (SHA-256) for fast lookup and stored as AES-256-GCM ciphertext. The plaintext never persists.' },
                                                { label: 'One-Time Display', desc: 'The plaintext key is returned once — immediately after creation. After that, even NullPay cannot recover it.' },
                                                { label: 'No Rotation (Yet)', desc: 'If your key is compromised, register a new merchant account with a new Aleo address.' },
                                            ].map((item, i) => (
                                                <div key={i} className="flex items-start gap-3">
                                                    <div className="w-5 h-5 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[10px] text-gray-500 font-bold shrink-0 mt-0.5">{i + 1}</div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white mb-1">{item.label}</p>
                                                        <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                                        <h3 className="text-lg font-bold text-white mb-4">Environment Setup</h3>
                                        <CodeBlock title=".env" language="bash" code={`# Server-side only — never expose on frontend
NULLPAY_SECRET_KEY=sk_xxxxxxxxxxxxxxxx`} />
                                        <CodeBlock title="Loading in code" code={`import { NullPay } from '@nullpay/node';

// ✅ Read from environment
const nullpay = new NullPay({
    secretKey: process.env.NULLPAY_SECRET_KEY!,
});`} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <DocsChatbot mode="developer" />
        </motion.div>
    );
};

export default DeveloperPortal;
