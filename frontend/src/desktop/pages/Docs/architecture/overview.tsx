import { Bot, FileCode2, Layers3, Package, Shield, Globe, Zap, Cpu } from 'lucide-react';
import type { DocsSection } from '../types';
import { MetricCard, Callout } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

export const architectureOverviewSection: DocsSection = {
    id: 'arch-overview',
    group: 'System Architecture',
    label: 'Overview',
    eyebrow: 'Architecture',
    title: 'The NullPay Ecosystem — Architecture Overview',
    summary:
        'NullPay is a modular, layered protocol designed to bring Web2-style checkout performance to the Aleo blockchain. It bridges high-speed merchant APIs with high-privacy Zero-Knowledge execution.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    icon={Layers3}
                    title="Frontend Layer"
                    description="The buyer-facing surface. Handles proof generation and hosted UI components."
                />
                <MetricCard
                    icon={Package}
                    title="Backend Layer"
                    description="The merchant-facing SDK. Manages session lifecycles and webhook verification."
                />
                <MetricCard
                    icon={Bot}
                    title="Agent Layer"
                    description="The AI-facing MCP bridge. Enables autonomous payment flows via AI assistants."
                />
                <MetricCard
                    icon={FileCode2}
                    title="Chain Layer"
                    description="The trustless source of truth. Enforces protocol rules on the Aleo L1."
                />
            </div>

            <GlassCard className="p-6">
                <h3 className="text-xl font-bold text-white mb-4">Design Philosophy: Layered Privacy</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">
                    Unlike traditional payment gateways that store user data in a central database, NullPay fragments data across multiple layers. No single entity—including NullPay itself—possesses enough information to reconstruct a user\'s entire financial history.
                </p>
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="flex gap-4">
                        <div className="mt-1">
                            <Shield className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-sm">Non-Custodial by Design</h4>
                            <p className="text-xs text-gray-500 mt-1">Funds move directly from the buyer to the merchant’s pool. NullPay never touches the money.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="mt-1">
                            <Zap className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-sm">Deterministic Settlement</h4>
                            <p className="text-xs text-gray-500 mt-1">On-chain mappings ensure that once a payment proof is verified, the invoice is permanently marked as settled.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="mt-1">
                            <Globe className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-sm">Global Scalability</h4>
                            <p className="text-xs text-gray-500 mt-1">The relayer network handles gas sponsorship, allowing any merchant anywhere to start accepting Aleo tokens instantly.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="mt-1">
                            <Cpu className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-sm">ZK Proof Efficiency</h4>
                            <p className="text-xs text-gray-500 mt-1">Optimized Leo circuits ensure that even complex multi-token payments can be proven in seconds.</p>
                        </div>
                    </div>
                </div>
            </GlassCard>

            <Callout title="A Unified Experience" tone="emerald">
                The architecture is designed to be invisible to the end user. To a buyer, it feels like a standard checkout. To a developer, it feels like an API-first platform. To the network, it is a series of cryptographically sound state transitions.
            </Callout>
        </div>
    ),
};
