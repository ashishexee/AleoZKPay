import { Package, Settings, ShieldCheck, Zap } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const installExample = `# Install the official NullPay Python SDK
pip install nullpay-python`;

const configExample = `# The SDK is used via the NullPay class. Initialize it once per server process.
# Typically in a file like: dependencies.py or utils/nullpay.py

import os
from pathlib import Path
from nullpay import NullPay

nullpay = NullPay({
    # REQUIRED: your merchant secret key (sk_test_... or sk_live_...)
    # This key is used for both REST API auth and HMAC signature generation.
    # ⚠️ Never expose this in frontend code or commit to git.
    "secret_key": os.getenv("NULLPAY_SECRET_KEY"),

    # OPTIONAL: override the API base URL (defaults to production backend)
    # Useful for local development when proxying through a different tunnel.
    "base_url": os.getenv("NULLPAY_BASE_URL", "https://nullpay-backend-ib5q4.ondigitalocean.app/api"),

    # OPTIONAL: directory where nullpay.json lives (defaults to Path.cwd())
    "project_root": str(Path(__file__).parent),

    # OPTIONAL: override the exact path to nullpay.json
    "config_path": str(Path(__file__).parent / "nullpay.json"),
    
    # OPTIONAL: override the timeout for network requests (default: 30)
    "timeout": 120.0
})
`;

const sdkApiSurfaceExample = `# Top-level API surface of the NullPay class:
# The class is structured into logical namespaces for clarity.

client = NullPay(config)

'''
── Invoice Helpers (Local & Synchronous) ──
These methods read from the local nullpay.json manifest.
They are extremely fast as they do not perform network requests.
'''
client.invoices.get_all()                   # → List[Dict] (full list)
client.invoices.get_by_index(0)             # → Dict (by array position)
client.invoices.get_by_name('pro-plan')     # → Dict (by dev-assigned name)
client.invoices.get_by_type('multipay')     # → List[Dict] (filtered by type)

'''
── Checkout Sessions (Remote & Asynchronous) ──
These methods interact with the NullPay REST API and the Aleo network.
'''
session = client.checkout.sessions.create(params)  # → Dict
session = client.checkout.sessions.retrieve(id)    # → Dict

'''
── Webhook Security (Cryptographic) ──
Verification helpers for fulfillment endpoints.
'''
client.webhooks.verify_signature(payload, sig) # → bool (Timing-safe HMAC check)
event = client.webhooks.construct_event(payload, sig)  # → Dict (Verified & Parsed)`;

export const pythonSdkSection: DocsSection = {
    id: 'sdk-python',
    group: 'Overview',
    label: 'Python SDK',
    eyebrow: 'SDK',
    title: 'Python SDK — Integration for FastAPI, Flask, and Django',
    summary:
        'The nullpay-python SDK provides a fully native Python interface to the NullPay protocol. It bridges your backend to the Aleo blockchain without requiring Node.js, abstracting ZK-proof generation, relayer sponsorship, and polling into clean Python methods.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Package}
                    title="Python Native"
                    description="Supports standard Python types. Optimized for Python 3.8+ with standard library HTTP compatibility."
                />
                <MetricCard
                    icon={ShieldCheck}
                    title="Security Built-in"
                    description="Internal usage of hmac.compare_digest protects your webhooks from timing-attacks during verification."
                />
                <MetricCard
                    icon={Zap}
                    title="Relayer Aware"
                    description="Automatically triggers the DPS Relayer flow if on-chain invoices are missing, covering gas fees for the merchant."
                />
                <MetricCard
                    icon={Settings}
                    title="Framework Agnostic"
                    description="Designed to work seamlessly with FastAPI, Flask, Django, or plain Python scripts."
                />
            </div>

            <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">Installation</h3>
                    <div className="flex items-center gap-2">
                        <a
                            href="https://www.npmjs.com/package/@nullpay/node"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                        >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M0 7.334v8h6.666v2.666H12v-2.666h12v-8H0zm6.666 5.332H4V10h2.666v2.666zm5.334 0h-2.666V10h2.666v2.666zm8 0h-2.666V10h2.666v2.666z" /></svg>
                            npm
                        </a>
                        <a
                            href="https://pypi.org/project/nullpay-python/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all"
                        >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M14.25.18l.9.2.73.26.59.3.45.32L17 1.9l.22.2.21.22.18.23.16.23.14.24.12.24.1.25.1.26.07.25.07.27.05.26.04.28.02.26.02.28a8.71 8.71 0 0 1-.02 1.48v.26l-.04.26-.05.26-.06.27-.08.27-.1.25-.1.25-.13.25-.15.24-.16.24-.18.23-.2.22-.22.21-.24.2-.42.31-.58.3-.73.26-.89.2-1.03.14-1.16.08-1.28.03-1.39-.01-1.46-.05-1.5-.1-1.54-.15-1.54-.19-1.5-.24L3.81 7.2l-.72-.32-.61-.35-.48-.37-.36-.39-.24-.4L1.2 5.07a8.55 8.55 0 0 1-.6-1.5A8.7 8.7 0 0 1 .4 2.1l.03-.26.04-.26.06-.27.08-.27.1-.25.1-.25.14-.25.15-.24.18-.24.19-.23.21-.22.23-.21.25-.2.45-.31.6-.3.75-.26.9-.2 1.05-.14 1.18-.08 1.3-.03 1.4-.01 1.48.04L13 .18l1.25.02zm-3.32 1.95a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm6.75 6.44l-.2-.9-.26-.74-.3-.59-.31-.44-.34-.3-.2-.2-.23-.2-.22-.17-.23-.16-.24-.13-.25-.11-.26-.09-.26-.08-.28-.05-.28-.04-.26-.01a8.71 8.71 0 0 0-1.48.01l-.26.04-.27.05-.26.06-.26.07-.26.09-.25.11-.24.12-.24.14-.23.16-.22.18-.21.19-.2.22-.31.42-.3.58-.26.73-.2.89-.14 1.03-.08 1.16-.03 1.28.01 1.39.05 1.46.1 1.5.15 1.54.19 1.54.24 1.5.3 1.44.32.72.35.61.37.48.39.36.4.24.3.2.43.19.74.25a8.7 8.7 0 0 0 1.5.6l1.46.2.26-.03.26-.04.27-.06.27-.08.25-.1.25-.1.25-.14.24-.15.24-.18.23-.19.22-.21.21-.23.2-.25.31-.45.3-.6.26-.75.2-.9.14-1.05.08-1.18.03-1.3.01-1.4-.04-1.48z"/></svg>
                            PyPI
                        </a>
                    </div>
                </div>
                <CodeBlock title="Package Manager" language="bash" code={installExample} />
                <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="mb-1 text-sm font-bold text-white">Technical Manifest</p>
                    <ul className="mt-2 space-y-2 text-xs text-gray-400">
                        <li>• <code className="rounded bg-white/5 px-1 py-0.5">NullPay</code>: The primary client class for all operations.</li>
                        <li>• **Configuration**: Accepts dictionary config with snake_case or camelCase keys for ease of use.</li>
                        <li>• **Auto-Dependency**: Minimal dependencies, heavily relying on the Python standard library.</li>
                    </ul>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-2 text-xl font-bold text-white">Architecture Deep Dive: Configuration</h3>
                <p className="mb-4 text-sm text-gray-400">
                    The Python SDK uses a similar architecture to the Node SDK, allowing precise control over where the <code className="text-gray-300">nullpay.json</code> file is loaded from, avoiding common pathing issues in containerized environments.
                </p>
                <CodeBlock title="dependencies.py" language="python" code={configExample} />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                        <p className="mb-1 text-xs font-bold text-blue-300 uppercase">When to use project_root</p>
                        <p className="text-xs text-gray-400">Set this when your <code className="text-gray-300">nullpay.json</code> is located at the root of your application, and the SDK should search for it there.</p>
                    </div>
                    <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
                        <p className="mb-1 text-xs font-bold text-purple-300 uppercase">When to use config_path</p>
                        <p className="text-xs text-gray-400">Use this for absolute precision, directly pointing the SDK to the exact path of your <code className="text-gray-300">nullpay.json</code> file.</p>
                    </div>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">The SDK Controller Surface</h3>
                <div className="mb-4 text-sm text-gray-400">
                    The SDK is divided into three functional domains that mirror the Node SDK, using Pythonic conventions (snake_case).
                </div>
                <CodeBlock title="Full API Reference" language="python" code={sdkApiSurfaceExample} />
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04]">
                        <div className="mb-2 flex items-center gap-2">
                            <Settings className="h-4 w-4 text-orange-300" />
                            <p className="text-xs font-black uppercase tracking-widest text-orange-300">invoices.*</p>
                        </div>
                        <p className="text-xs leading-relaxed text-gray-400">Handles local manifest reading. It validates your <code className="text-white/80">nullpay.json</code> and allows simple dictionary lookups by name, type, or index.</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04]">
                        <div className="mb-2 flex items-center gap-2">
                            <Zap className="h-4 w-4 text-blue-300" />
                            <p className="text-xs font-black uppercase tracking-widest text-blue-300">checkout.*</p>
                        </div>
                        <p className="text-xs leading-relaxed text-gray-400">The core engine. It manages session creation, coordinates with the backend relayer if needed, and returns the <code className="text-white/80">checkout_url</code> for your frontend.</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04]">
                        <div className="mb-2 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-300" />
                            <p className="text-xs font-black uppercase tracking-widest text-emerald-300">webhooks.*</p>
                        </div>
                        <p className="text-xs leading-relaxed text-gray-400">The gatekeeper. It parses the raw payload and verifies the HMAC signature using <code className="text-white/80">hmac.compare_digest</code> for maximum security.</p>
                    </div>
                </div>
            </GlassCard>

            <Callout title="Production Best Practice: Environment Variables" tone="blue">
                Always store your <code className="rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-200">NULLPAY_SECRET_KEY</code> securely. In Python, use <code className="text-blue-200">os.getenv("NULLPAY_SECRET_KEY")</code> alongside packages like <code className="text-blue-200">python-dotenv</code>.
            </Callout>
        </div>
    ),
};
