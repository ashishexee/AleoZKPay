import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './GlassCard';

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: ReactNode;
    rightElement?: ReactNode;
    statusElement?: ReactNode;
    showStatus?: boolean;
    error?: boolean;
    variant?: 'amber' | 'bw';
}

export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(({
    icon,
    rightElement,
    statusElement,
    showStatus,
    error,
    variant = 'amber',
    className,
    value,
    ...props
}, ref) => {
    const isBW = variant === 'bw';

    return (
        <div className="relative group">
            {/* Outer Glow Effect */}
            <div className={cn(
                "absolute -inset-0.5 rounded-2xl bg-gradient-to-r transition-all duration-500 opacity-0 group-focus-within:opacity-100 blur-sm pointer-events-none",
                error 
                    ? "from-red-500/20 via-red-500/10 to-red-500/20" 
                    : isBW
                        ? "from-white/20 via-white/10 to-white/20"
                        : value 
                            ? "from-amber-500/20 via-orange-500/10 to-amber-500/20" 
                            : "from-white/10 via-white/5 to-white/10"
            )} />

            <div className={cn(
                "relative flex flex-col gap-0.5 rounded-2xl border transition-all duration-300 backdrop-blur-xl bg-black/40",
                error
                    ? "border-red-500/30 bg-red-500/5"
                    : value 
                        ? isBW 
                            ? "border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                            : "border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.05)]" 
                        : "border-white/10 focus-within:border-white/20"
            )}>
                <div className="flex items-center gap-3 px-4 py-3">
                    {/* Icon Container */}
                    {icon && (
                        <div className={cn(
                            "flex shrink-0 items-center justify-center transition-colors duration-300",
                            error 
                                ? "text-red-400"
                                : value 
                                    ? isBW ? "text-white" : "text-amber-400" 
                                    : "text-gray-500 group-focus-within:text-white/70"
                        )}>
                            {icon}
                        </div>
                    )}

                    {/* Input Field */}
                    <input
                        ref={ref}
                        value={value}
                        className={cn(
                            "flex-1 bg-transparent border-none outline-none text-sm font-mono tracking-wider transition-colors placeholder:text-gray-600 disabled:opacity-50 min-w-0",
                            error
                                ? "text-red-200"
                                : value 
                                    ? isBW ? "text-white" : "text-amber-200" 
                                    : "text-white",
                            className
                        )}
                        {...props}
                    />

                    {/* Right Element (Buttons, etc.) */}
                    {rightElement}
                </div>

                {/* Bottom Status Indicator */}
                <AnimatePresence>
                    {showStatus && statusElement && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className={cn(
                                "px-4 pb-3 flex items-center gap-2 border-t pt-2",
                                error 
                                    ? "border-red-500/10" 
                                    : isBW ? "border-white/10" : "border-amber-500/10"
                            )}>
                                {statusElement}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
});

GlassInput.displayName = 'GlassInput';
