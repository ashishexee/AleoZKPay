import React from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Link } from 'react-router-dom';
import { ExternalLink, Shield, ArrowRight } from 'lucide-react';
import { useBurnerWallet } from '../../hooks/wallet/BurnerWalletProvider';
import { PasswordPrompt } from '../auth/PasswordPrompt';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { connected } = useWallet();
    const { isUnlocked, isAutoUnlocking } = useBurnerWallet();

    if (!connected) {
        return (
            <div className="page-container relative min-h-[70vh] flex flex-col items-center justify-start pt-8 md:pt-12 text-center px-4">
                {/* Background glows */}
                <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/5 rounded-full blur-[120px] animate-float" />
                    <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-amber-400/10 rounded-full blur-[100px] animate-float-delayed" />
                    <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-orange-500/5 rounded-full blur-[120px] animate-pulse-slow" />
                </div>

                {/* Aleo Globe background */}
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

                <div className="relative z-10 flex flex-col items-center max-w-md w-full">
                    {/* Heading */}
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 tracking-tighter whitespace-nowrap">
                        <span className="text-white">Wallet </span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                            Not Connected
                        </span>
                    </h1>

                    <p className="text-white/50 text-base leading-relaxed max-w-sm mb-10">
                        Connect your Aleo wallet to access this secured page and execute transactions on the network.
                    </p>

                    {/* Actions */}
                    <div className="w-full max-w-xs space-y-3 mb-8">
                        <div className="wallet-adapter-wrapper [&>button]:!w-full [&>button]:!justify-center [&>button]:!rounded-xl [&>button]:!h-11 [&>button]:!bg-white [&>button]:!text-black [&>button]:!font-bold [&>button]:!text-sm">
                            <WalletMultiButton />
                        </div>

                        <a
                            href="https://chromewebstore.google.com/detail/shield/hhddpjpacfjaakjioinajgmhlbhfchao?pli=1"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-orange-500/25 bg-orange-500/5 hover:bg-orange-500/10 text-orange-300/80 hover:text-orange-200 transition-all duration-300 text-sm font-medium"
                        >
                            <span>Get Shield Wallet Extension</span>
                            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                        </a>
                    </div>

                    {/* Auditor Card */}
                    <div className="relative group w-full rounded-2xl border border-white/[0.06] bg-white/[0.01] px-5 py-4 backdrop-blur-md transition-all duration-300 hover:border-orange-500/30 hover:bg-white/[0.02] hover:shadow-[0_0_30px_rgba(249,115,22,0.08)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
                        {/* Glow effect that tracks hover/group */}
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/2 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        
                        <div className="flex items-center justify-between gap-4 relative z-10">
                            <div className="flex items-center gap-3.5 text-left">
                                {/* Icon container with a dual-ring glow */}
                                <div className="flex items-center justify-center w-11 h-11 rounded-xl border border-white/[0.08] bg-white/[0.02] text-orange-400/90 group-hover:border-orange-500/35 group-hover:bg-orange-500/5 group-hover:text-orange-300 transition-all duration-300 shadow-sm shadow-orange-500/5">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors duration-200 mb-0.5">
                                        Auditor Access
                                    </p>
                                    <p className="text-xs text-white/40 group-hover:text-white/60 transition-colors duration-200">
                                        Verify audit bundles without a wallet.
                                    </p>
                                </div>
                            </div>
                            
                            <Link
                                to="/audit/verify"
                                className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-white/70 hover:text-white hover:bg-orange-500/10 hover:border-orange-500/40 transition-all duration-300 group/btn"
                            >
                                <span>Verify</span>
                                <ArrowRight className="w-3.5 h-3.5 transform group-hover/btn:translate-x-0.5 transition-transform duration-200 text-white/50 group-hover/btn:text-white" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isAutoUnlocking) {
        return (
            <div className="page-container relative min-h-screen flex flex-col items-center justify-center text-center">
                <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/5 rounded-full blur-[120px] animate-float" />
                    <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-amber-400/10 rounded-full blur-[100px] animate-float-delayed" />
                    <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-orange-500/5 rounded-full blur-[120px] animate-pulse-slow" />
                </div>
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
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-8 h-8 border-2 border-neon-primary/30 border-t-neon-primary rounded-full animate-spin mb-4" />
                    <p className="text-gray-400 text-sm">Checking for on-chain records...</p>
                </div>
            </div>
        );
    }

    if (!isUnlocked) {
        return <PasswordPrompt />;
    }

    return <>{children}</>;
};
