import React from 'react';
import { motion } from 'framer-motion';
import { Shimmer } from '../../../components/ui/Shimmer';
import type { WalletTokenBalance } from '../../../hooks/useWalletBalances';

interface WalletBalancesProps {
    itemVariants: any;
    balances: WalletTokenBalance[];
}

export const WalletBalances: React.FC<WalletBalancesProps> = ({ itemVariants, balances }) => {
    return (
        <motion.div variants={itemVariants} className="flex flex-wrap gap-3 justify-center items-center mt-[-1rem] mb-4">
            {balances.map((token) => (
                <div key={token.name} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-sm group hover:border-white/20 hover:bg-white/10 transition-colors">
                    <span className="text-[10px] font-bold text-white tracking-widest uppercase w-14">{token.name}</span>
                    <div className="w-px h-5 bg-white/10" />
                    <div className="flex items-center gap-1.5 min-w-[70px]">
                        <span className="text-gray-400 text-[10px]" title="Public Balance">🌐</span>
                        {token.loading ? (
                            <Shimmer className="h-4 w-10 bg-white/10 rounded-sm" />
                        ) : (
                            <span className="text-xs font-bold text-white tracking-tighter truncate">{token.public}</span>
                        )}
                    </div>
                    <div className="w-px h-5 bg-white/10" />
                    <div className="flex items-center gap-1.5 min-w-[70px] relative">
                        <span className="text-neon-primary text-[10px]" title="Private Balance">🔒</span>
                        {token.loading ? (
                            <Shimmer className="h-4 w-10 bg-white/10 rounded-sm" />
                        ) : (
                            <span className="text-xs font-bold text-white tracking-tighter truncate">{token.private}</span>
                        )}
                        <div className="absolute inset-0 right-0 w-8 h-8 rounded-full bg-neon-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                    </div>
                </div>
            ))}
        </motion.div>
    );
};
