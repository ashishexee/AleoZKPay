import { motion } from 'framer-motion';
import { CreditCard, LockKeyhole, ShieldCheck } from 'lucide-react';
import { CardWalletPanel } from '../../shared/pages/Profile/components/CardWalletPanel';
const CardsPage = () => {
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    const highlights = [
        {
            icon: CreditCard,
            title: 'Three private tokens',
            description: 'Manage Credits, USDCx, and USAD inside one dedicated card wallet.'
        },
        {
            icon: LockKeyhole,
            title: 'Local key handling',
            description: 'The card key stays encrypted until you unlock it on your own device.'
        },
        {
            icon: ShieldCheck,
            title: 'Limit-controlled spending',
            description: 'Default safety caps stay in place unless your main wallet approves a change.'
        }
    ];

    return (
        <div className="relative min-h-screen overflow-hidden px-4 pt-10 pb-20 md:px-8">
            <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
                <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-orange-500/10 blur-[120px] animate-float" />
                <div className="absolute top-[18%] right-[-6%] h-[32%] w-[32%] rounded-full bg-amber-400/10 blur-[110px] animate-float-delayed" />
                <div className="absolute bottom-[-12%] left-[18%] h-[35%] w-[35%] rounded-full bg-white/5 blur-[130px] animate-pulse-slow" />
            </div>

            <div className="absolute top-[-150px] left-1/2 z-0 flex h-[820px] w-screen -translate-x-1/2 justify-center overflow-hidden pointer-events-none">
                <img
                    src="/assets/aleo_globe.png"
                    alt="Aleo Globe"
                    className="h-full w-full object-cover opacity-50 mix-blend-screen mask-image-gradient-b"
                    style={{
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                    }}
                />
            </div>

            <motion.div
                initial="hidden"
                animate="show"
                variants={{
                    hidden: { opacity: 0 },
                    show: {
                        opacity: 1,
                        transition: { staggerChildren: 0.12 }
                    }
                }}
                className="relative z-10 mx-auto w-full"
            >
                <motion.div
                    variants={itemVariants}
                    className="mb-10 flex flex-col items-center text-center"
                >
                    <h1 className="max-w-4xl text-4xl font-bold tracking-tighter text-white md:text-5xl">
                        Private spending,
                        <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-orange-500 bg-clip-text text-transparent"> card-style control</span>
                    </h1>
                    <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/65 md:text-base">
                        Create a dedicated non-custodial Aleo card wallet, top it up with private funds, and keep spending limits under your main wallet&apos;s approval.
                    </p>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3"
                >
                    {highlights.map(({ icon: Icon, title, description }) => (
                        <div
                            key={title}
                            className="rounded-3xl border border-white/10 bg-black/35 p-5 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
                        >
                            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/10 text-orange-300">
                                <Icon className="h-5 w-5" />
                            </div>
                            <h2 className="text-base font-semibold text-white">{title}</h2>
                            <p className="mt-2 text-sm leading-relaxed text-white/60">{description}</p>
                        </div>
                    ))}
                </motion.div>

                <motion.div variants={itemVariants}>
                    <CardWalletPanel itemVariants={itemVariants} />
                </motion.div>
            </motion.div>
        </div>
    );
};

export default CardsPage;
