import { Link, useLocation } from 'react-router-dom';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../shared/utils/cn';

const Navbar = () => {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;

    const isLanding = location.pathname === '/' || location.pathname === '/vision' || location.pathname === '/privacy';

    const landingNavItems = [
        { path: '/', label: 'Home' },
        { path: '/vision', label: 'Vision' },
        { label: 'Privacy', path: '/privacy' },
    ];

    const appNavItems = [
        { path: '/explorer', label: 'Explorer' },
        { path: '/create', label: 'Create Invoice' },
        { path: '/profile', label: 'Dashboard' },
        { path: '/giftcards', label: 'Gift Cards' },
        { path: '/profile-qr', label: 'Profile QR' },
        { path: '/developer', label: 'Developer' },
        { label: 'Docs', path: '/docs' },
    ];

    const navItems = isLanding ? landingNavItems : appNavItems;

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-50 h-24 flex items-center justify-center px-6 pointer-events-none"
        >
            <div className="w-full max-w-7xl flex items-center justify-between pointer-events-auto">
                {/* LOGO */}
                <Link to="/" className="group flex items-center gap-3 no-underline">
                    <div className="relative w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] group-hover:shadow-[0_0_35px_rgba(249,115,22,0.4)] transition-all duration-500">
                        <div className="w-4 h-4 border-2 border-black group-hover:border-orange-500 rotate-45 group-hover:rotate-90 transition-all duration-500" />
                    </div>
                    <div className="flex flex-col">
                        <span className="relative text-xl font-bold text-white tracking-tight transition-colors duration-500">
                            <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 drop-shadow-gold" aria-hidden="true">
                                NullPay
                            </span>
                            <span className="group-hover:opacity-0 transition-opacity duration-500">
                                NullPay
                            </span>
                        </span>
                        <span className="relative text-[10px] text-gray-400 uppercase tracking-widest font-medium transition-colors duration-500">
                            <span className="absolute inset-0 text-orange-400/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true">
                                Privacy First
                            </span>
                            <span className="group-hover:opacity-0 transition-opacity duration-500">
                                Privacy First
                            </span>
                        </span>
                    </div>
                </Link>

                {/* NAVIGATION PILL (CENTERED ABSOLUTELY) */}
                <div className="absolute left-1/2 -translate-x-1/2 flex bg-black/60 backdrop-blur-2xl border border-white/20 rounded-full p-1 items-center gap-1 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    {navItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "relative px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap",
                                    active ? "text-white" : "text-white/40 hover:text-white"
                                )}
                            >
                                {active && (
                                    <motion.span
                                        layoutId="navbar-active-indicator"
                                        className="absolute inset-0 rounded-full bg-neon-primary/20 border border-neon-primary/40 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                        transition={{
                                            type: "spring",
                                            bounce: 0.25,
                                            duration: 0.5
                                        }}
                                    />
                                )}
                                <span className="relative z-10">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* ACTIONS */}
                <div className="flex items-center gap-4">
                    {isLanding && (
                        <Link to="/explorer" className="hidden md:flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-2.5 rounded-full backdrop-blur-md transition-all duration-300 text-sm font-semibold text-white group">
                            Get Started
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    )}
                    <div className="wallet-adapter-wrapper transform hover:scale-105 transition-transform duration-300">
                        <WalletMultiButton className="!bg-black/50 !backdrop-blur-lg !border !border-white/10 !rounded-full !py-3 !px-6 !h-auto !font-sans !font-semibold !text-sm !text-white hover:!bg-white/10 hover:!border-white/30 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]" />
                    </div>
                </div>
            </div>
        </motion.nav>
    );
};

export default Navbar;
