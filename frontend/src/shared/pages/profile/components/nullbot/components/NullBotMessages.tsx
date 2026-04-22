import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../../../../../types/nullbot';
import { QUICK_PROMPTS } from '../lib/constants';
import { MiniInvoiceCard } from './MiniInvoiceCard';
import { TruncatedHash } from './TruncatedHash';

interface NullBotMessagesProps {
    messages: ChatMessage[];
    isThinking: boolean;
    actionStatus: string;
    endRef: React.RefObject<HTMLDivElement | null>;
    onQuickPrompt: (prompt: string) => void;
}

const assistantBubbleClass = 'bg-[#18181A] text-gray-200 border border-white/10 rounded-bl-sm [&_h1]:text-white [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-white [&_p]:mb-1 [&_p]:last:mb-0 [&_strong]:text-white [&_ul]:list-inside [&_ul]:space-y-1 [&_a]:text-orange-400 [&_a]:underline [&_code]:bg-white/10 [&_code]:text-orange-200 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-[12px] [&_code]:font-mono [&_pre]:bg-black/50 [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:my-2 [&_pre]:overflow-x-auto';

export const NullBotMessages: React.FC<NullBotMessagesProps> = ({
    messages,
    isThinking,
    actionStatus,
    endRef,
    onQuickPrompt,
}) => {
    return (
        <div className="h-full overflow-y-auto space-y-4 scroll-smooth pb-4 pr-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5 hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
            {messages.map((message) => (
                <div
                    key={message.id}
                    className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                    <div className="mb-1.5 flex items-center gap-2 px-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400/80">
                            {message.role === 'user' ? 'You' : 'NullBot'}
                        </span>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`max-w-[88%] break-words whitespace-pre-wrap rounded-2xl px-5 py-3.5 text-[13.5px] leading-relaxed shadow-sm sm:text-[14px] ${
                            message.role === 'user'
                                ? 'rounded-br-sm bg-gradient-to-r from-orange-500 to-amber-400 font-medium text-black shadow-orange-500/20'
                                : assistantBubbleClass
                        }`}
                    >
                        {message.role === 'user' ? (
                            message.content
                        ) : (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    code(props) {
                                        const { children, className } = props;
                                        return <TruncatedHash className={className}>{children}</TruncatedHash>;
                                    },
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        )}
                        {message.role === 'assistant' && message.invoiceData && (
                            <MiniInvoiceCard invoiceData={message.invoiceData} />
                        )}
                    </motion.div>
                </div>
            ))}

            {messages.length <= 1 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="flex w-full flex-col items-start gap-2 pb-2 pt-1"
                >
                    <span className="px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400/80">
                        Suggested Actions
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {QUICK_PROMPTS.map((prompt) => (
                            <button
                                key={prompt}
                                type="button"
                                onClick={() => onQuickPrompt(prompt)}
                                className="min-w-[140px] flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-left text-xs text-gray-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}

            {isThinking && (
                <div className="flex flex-col items-start pt-1">
                    <div className="mb-1.5 flex items-center gap-2 px-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400/80">
                            NullBot
                        </span>
                    </div>
                    <div className="flex min-h-[46px] flex-col gap-2 rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-4 py-3 text-sm backdrop-blur-md">
                        <div className="flex items-center gap-1.5">
                            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0 }} className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                        </div>
                        {actionStatus && (
                            <p className="whitespace-pre-wrap text-xs text-orange-200">{actionStatus}</p>
                        )}
                    </div>
                </div>
            )}

            <div ref={endRef} className="h-2" />
        </div>
    );
};
