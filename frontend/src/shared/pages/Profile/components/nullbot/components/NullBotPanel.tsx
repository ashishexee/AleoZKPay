import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../../../../components/ui/GlassCard';
import { useBurnerWallet } from '../../../../../hooks/BurnerWalletProvider';
import type { DashboardChatbotProps } from '../../../../../types/nullbot';
import { TOOL_PILLS } from '../lib/constants';
import { NullBotComposer } from './NullBotComposer';
import { NullBotHeader } from './NullBotHeader';
import { NullBotMessages } from './NullBotMessages';
import { NullBotStatusBar } from './NullBotStatusBar';
import { useBurnerBalanceContext } from '../hooks/useBurnerBalanceContext';
import { useChatHistory } from '../hooks/useChatHistory';
import { useNullBotController } from '../hooks/useNullBotController';

export const DashboardChatbot: React.FC<DashboardChatbotProps> = (props) => {
    const navigate = useNavigate();
    const { connected, address, executeTransaction, transactionStatus, requestTransactionHistory } = useWallet();
    const { appPassword, decryptedBurnerAddress, decryptedBurnerKey } = useBurnerWallet();
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [input, setInput] = useState('');
    const endRef = useRef<HTMLDivElement | null>(null);

    const { messages, appendMessage, appendAssistantMessage } = useChatHistory();
    const { burnerBalances, loadBurnerBalanceContext } = useBurnerBalanceContext(
        decryptedBurnerAddress,
        decryptedBurnerKey
    );

    const { isThinking, actionStatus, pendingToolCall, sendMessage } = useNullBotController({
        ...props,
        connected,
        address,
        executeTransaction,
        transactionStatus,
        requestTransactionHistory,
        navigate,
        appPassword,
        decryptedBurnerAddress,
        decryptedBurnerKey,
        burnerBalances,
        loadBurnerBalanceContext,
        messages,
        appendMessage,
        appendAssistantMessage,
    });

    useEffect(() => {
        if (isOpen) {
            endRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, isThinking, actionStatus]);

    const handleSend = () => {
        void sendMessage(input, () => setInput(''));
    };

    return createPortal(
        <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 18, scale: 0.96 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className={isExpanded ? 'w-[min(96vw,56rem)] origin-bottom-right' : 'w-[min(92vw,26rem)] origin-bottom-right'}
                    >
                        <GlassCard
                            variant="heavy"
                            hoverEffect={false}
                            className="border border-orange-400/20 shadow-[0_25px_80px_rgba(0,0,0,0.45)]"
                        >
                            <div className={`relative flex flex-col overflow-hidden ${isExpanded ? 'h-[min(85vh,48rem)]' : 'h-[min(35rem,calc(100vh-7rem))]'}`}>
                                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-orange-400/18 via-cyan-400/10 to-transparent" />

                                <NullBotHeader
                                    isExpanded={isExpanded}
                                    onToggleExpanded={() => setIsExpanded((current) => !current)}
                                    onClose={() => setIsOpen(false)}
                                />

                                <NullBotStatusBar
                                    connected={connected}
                                    address={address}
                                    mainWalletAddress={props.mainWalletAddress}
                                    toolPills={TOOL_PILLS}
                                />

                                <div className="min-h-0 flex-1 px-4 pb-0">
                                    <NullBotMessages
                                        messages={messages}
                                        isThinking={isThinking}
                                        actionStatus={actionStatus}
                                        endRef={endRef}
                                        onQuickPrompt={(prompt) => {
                                            void sendMessage(prompt);
                                        }}
                                    />
                                </div>

                                <NullBotComposer
                                    connected={connected}
                                    pendingToolCall={pendingToolCall}
                                    input={input}
                                    isThinking={isThinking}
                                    onInputChange={setInput}
                                    onSubmit={handleSend}
                                />
                            </div>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => setIsOpen((open) => !open)}
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-orange-400 via-amber-300 to-orange-500 text-black shadow-[0_12px_40px_rgba(251,146,60,0.45)] sm:h-16 sm:w-16"
                aria-label="Open dashboard assistant"
            >
                <MessageCircle size={26} />
            </motion.button>
        </div>,
        document.body
    );
};
