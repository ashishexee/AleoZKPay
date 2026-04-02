import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';

export const AnimatedBanner = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Parallax and scroll-based animation effects
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end end"]
    });

    // Smooth reveal as user scrolls down to this section
    const scale = useTransform(scrollYProgress, [0, 0.6], [0.85, 1]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);
    
    // The dome rises up faster than the container scrolls
    const domeY = useTransform(scrollYProgress, [0, 0.8], ["40%", "0%"]);

    return (
        <section ref={containerRef} className="py-20 px-4 md:px-8 lg:px-16 relative overflow-hidden z-20">
            <div className="max-w-6xl mx-auto">
                <motion.div 
                    style={{ scale, opacity }}
                    className="relative rounded-[2.5rem] overflow-hidden bg-[#0c0c0e] border border-white/[0.04] min-h-[480px] flex flex-col items-center justify-start text-center p-12 shadow-2xl"
                >
                    {/* Grid Background */}
                    <div 
                        className="absolute inset-0 opacity-[0.05]"
                        style={{
                            backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px)',
                            backgroundSize: '8% 100%'
                        }}
                    />

                    {/* Animated Dome with Scroll Parallax */}
                    <div className="absolute top-[40%] left-0 right-0 bottom-0 overflow-hidden pointer-events-none rounded-b-[2.5rem]">
                        <motion.div 
                            style={{ y: domeY }}
                            className="w-full h-full relative"
                        >
                            {/* Glow Blob */}
                            <motion.div 
                                animate={{ 
                                    scale: [1, 1.05, 1],
                                    rotate: [-0.5, 0.5, -0.5]
                                }}
                                transition={{ 
                                    duration: 12, repeat: Infinity, ease: "easeInOut" 
                                }}
                                className="absolute top-0 left-1/2 -translate-x-1/2 w-[160%] md:w-[130%] aspect-[2/1] rounded-t-[100%]"
                                style={{
                                    background: 'linear-gradient(90deg, #fb923c 0%, #f97316 50%, #9a3412 100%)',
                                    filter: 'blur(16px)',
                                    boxShadow: '0 -20px 80px rgba(249, 115, 22, 0.25)'
                                }}
                            />
                            {/* Core Shape Overlay */}
                            <motion.div 
                                animate={{ 
                                    scale: [1, 1.02, 1],
                                    rotate: [-0.3, 0.3, -0.3]
                                }}
                                transition={{ 
                                    duration: 12, repeat: Infinity, ease: "easeInOut" 
                                }}
                                className="absolute top-[4%] left-1/2 -translate-x-1/2 w-[158%] md:w-[128%] aspect-[2/1] rounded-t-[100%]"
                                style={{
                                    background: 'linear-gradient(90deg, #fdba74 0%, #f97316 50%, #c2410c 100%)',
                                }}
                            />
                        </motion.div>
                    </div>

                    {/* Inner glow line at top */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />

                    {/* Content */}
                    <div className="relative z-10 max-w-3xl mx-auto mt-16 mb-24 flex flex-col items-center">
                        <motion.h2 
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-50px' }}
                            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-white leading-[1.15] font-sans"
                        >
                            Transact privately, settle faster, <br className="hidden md:block"/> and stay secure.
                        </motion.h2>
                        <motion.p 
                            initial={{ opacity: 0, y: 15 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-50px' }}
                            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="text-white/80 text-base md:text-lg font-medium mt-6"
                        >
                            Experience the power of zero-knowledge proofs with NullPay
                        </motion.p>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            whileInView={{ opacity: 1, scale: 1, y: 0 }}
                            viewport={{ once: true, margin: '-50px' }}
                            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="pt-10"
                        >
                            <Link
                                to="/explorer"
                                className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-orange-50 hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(249,115,22,0.3)]"
                            >
                                Learn More
                            </Link>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};