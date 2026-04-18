import React from 'react';
import { Wallet } from 'lucide-react';
import { truncateAddress } from '../../../../../utils/aleo-utils';

interface NullBotStatusBarProps {
    connected: boolean;
    address?: string | null;
    mainWalletAddress: string | null;
    toolPills: string[];
}

export const NullBotStatusBar: React.FC<NullBotStatusBarProps> = ({
    connected,
    address,
    mainWalletAddress,
    toolPills,
}) => {
    return (
        <div className="border-b border-white/5 bg-black/10 px-4 pb-2 pt-3">
            <div className="flex items-center gap-2 text-[11px] text-gray-300">
                <Wallet size={12} className="text-orange-300" />
                <span>{connected ? `Main ${truncateAddress(address || mainWalletAddress)}` : 'Wallet not connected'}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
                {toolPills.map((tool) => (
                    <span
                        key={tool}
                        className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-gray-300"
                    >
                        {tool}
                    </span>
                ))}
            </div>
        </div>
    );
};
