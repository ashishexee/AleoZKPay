import React from 'react';
import { SendHorizonal } from 'lucide-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import type { PendingToolCall } from '../../../../../types/nullbot';
import { getPendingToolPrompt } from '../lib/utils';

interface NullBotComposerProps {
    connected: boolean;
    pendingToolCall: PendingToolCall;
    input: string;
    isThinking: boolean;
    onInputChange: (value: string) => void;
    onSubmit: () => void;
}

export const NullBotComposer: React.FC<NullBotComposerProps> = ({
    connected,
    pendingToolCall,
    input,
    isThinking,
    onInputChange,
    onSubmit,
}) => {
    const pendingPrompt = getPendingToolPrompt(pendingToolCall);

    return (
        <div className="mt-auto shrink-0 space-y-3 border-t border-white/8 bg-white/[0.02] p-4">
            {!connected && (
                <div className="wallet-adapter-wrapper w-full [&>button]:!h-11 [&>button]:!w-full [&>button]:!justify-center [&>button]:!rounded-xl [&>button]:!bg-white [&>button]:!font-bold [&>button]:!text-black">
                    <WalletMultiButton />
                </div>
            )}
            {pendingToolCall && pendingPrompt && (
                <div className={`rounded-xl px-3 py-2 text-[11px] ${
                    pendingToolCall.name === 'create_invoice'
                        ? 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-100'
                        : 'border border-orange-400/20 bg-orange-400/10 text-orange-100'
                }`}>
                    {pendingPrompt}
                </div>
            )}
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    onSubmit();
                }}
            >
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 shadow-inner transition-all focus-within:border-orange-500/40 focus-within:bg-black/60">
                    <input
                        value={input}
                        onChange={(event) => onInputChange(event.target.value)}
                        placeholder="Ask anything in plain language. NullBot will pick the tool, collect details, and trigger the browser flow."
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isThinking}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-orange-400 to-amber-300 text-black disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Send message"
                    >
                        <SendHorizonal size={16} />
                    </button>
                </div>
            </form>
        </div>
    );
};
