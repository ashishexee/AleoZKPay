import React from 'react';
import { Bot, Expand, Minimize2, Sparkles, X } from 'lucide-react';

interface NullBotHeaderProps {
    isExpanded: boolean;
    onToggleExpanded: () => void;
    onClose: () => void;
}

export const NullBotHeader: React.FC<NullBotHeaderProps> = ({
    isExpanded,
    onToggleExpanded,
    onClose,
}) => {
    return (
        <div className="relative flex items-start justify-between gap-4 border-b border-white/8 p-4">
            <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-300 text-black shadow-[0_0_24px_rgba(251,146,60,0.35)]">
                    <Bot size={20} />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">NullBot</span>
                        <Sparkles size={14} className="text-orange-300" />
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-gray-400">
                        Browser-native NullPay tools with Shield popup signing.
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onToggleExpanded}
                    className="text-gray-400 transition-colors hover:text-white"
                    aria-label={isExpanded ? 'Collapse dashboard assistant' : 'Expand dashboard assistant'}
                    title={isExpanded ? 'Collapse chat' : 'Expand chat'}
                >
                    {isExpanded ? <Minimize2 size={18} /> : <Expand size={18} />}
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-gray-400 transition-colors hover:text-white"
                    aria-label="Close dashboard assistant"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};
