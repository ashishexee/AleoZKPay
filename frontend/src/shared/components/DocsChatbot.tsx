import { createPortal } from 'react-dom';
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, MessageCircle, SendHorizonal, Sparkles, X, Copy, Check } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { chatWithDeveloperAssistant } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type ChatMessage = {
    id: number;
    role: 'assistant' | 'user';
    content: string;
};

interface DocsChatbotProps {
    mode: 'docs' | 'developer';
}

const QUICK_PROMPTS_DOCS = [
    'How do I install the Node SDK?',
    'What tokens does NullPay support?',
    'Explain how Webhooks work.',
    'Give me a cURL example for creating an invoice.',
];

const QUICK_PROMPTS_DEV = [
    'How do I get my Secret Key as a merchant?',
    'Show me how to initialize NullPay in my backend.',
    'What happens if my webhook fails?',
    'How do I verify a payment hash on-chain?',
];

const INITIAL_MSG_DOCS = 'Hello! I am NullBot, your Documentation Assistant. I can help you navigate the NullPay technical docs, explain APIs, SDKs, and Smart Contracts. What are you looking for?';

const INITIAL_MSG_DEV = 'Hello! I am NullBot, your Developer Portal Assistant. I can help you with Secret Keys, Webhook configuration, and integrating the SDK into your backend. What are you building today?';

const TruncatedHashComponent = ({ children, className }: any) => {
    const [copied, setCopied] = useState(false);
    const text = String(children).replace(/\n$/, '');
    const isLongHash = !text.includes(' ') && text.length > 30;

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isLongHash) {
        const display = `${text.slice(0, 8)}...${text.slice(-8)}`;
        return (
            <span className="inline-flex items-center gap-1.5 bg-white/10 text-orange-200 pl-1.5 pr-1 py-[1.5px] rounded-md text-[12px] font-mono align-middle group cursor-text">
                <span>{display}</span>
                <button
                    onClick={handleCopy}
                    className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors flex items-center justify-center shrink-0"
                    title="Copy full sequence"
                >
                    {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                </button>
            </span>
        );
    }

    return <code className={className}>{children}</code>;
};

export const DocsChatbot: React.FC<DocsChatbotProps> = ({ mode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 1,
            role: 'assistant',
            content: mode === 'docs' ? INITIAL_MSG_DOCS : INITIAL_MSG_DEV,
        },
    ]);

    const quickPrompts = mode === 'docs' ? QUICK_PROMPTS_DOCS : QUICK_PROMPTS_DEV;
    const endRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            endRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, isThinking]);

    const sendMessage = async (message: string) => {
        const trimmed = message.trim();
        if (!trimmed || isThinking) return;

        const userMessage: ChatMessage = { id: Date.now(), role: 'user', content: trimmed };
        setMessages((current) => [...current, userMessage]);
        setInput('');
        setIsThinking(true);

        try {
            const context = {
                mode,
                route: window.location.pathname,
            };
            const reply = await chatWithDeveloperAssistant(trimmed, context);
            setMessages((current) => [...current, { id: Date.now() + 2, role: 'assistant', content: reply }]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setMessages((current) => [...current, { id: Date.now() + 3, role: 'assistant', content: `Assistant error: ${errorMessage}` }]);
        } finally {
            setIsThinking(false);
        }
    };

    return createPortal(
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[60] flex flex-col items-end gap-3">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 18, scale: 0.96 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className="w-[min(92vw,24rem)] origin-bottom-right"
                    >
                        <GlassCard
                            variant="heavy"
                            hoverEffect={false}
                            className="border border-orange-400/20 shadow-[0_25px_80px_rgba(0,0,0,0.45)]"
                        >
                            <div className="relative flex h-[min(32rem,calc(100vh-7rem))] flex-col overflow-hidden">
                                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-orange-400/18 via-cyan-400/10 to-transparent pointer-events-none" />

                                <div className="relative p-4 border-b border-white/8 flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-300 text-black flex items-center justify-center shadow-[0_0_24px_rgba(251,146,60,0.35)]">
                                            <Bot size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-white">NullBot</span>
                                                <Sparkles size={14} className="text-orange-300" />
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                                Your intelligent copilot for NullPay {mode === 'docs' ? 'documentation' : 'integrations'}.
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className="text-gray-400 hover:text-white transition-colors"
                                        aria-label={`Close ${mode} assistant`}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="flex-1 min-h-0 px-4 pb-0">
                                    <div className="h-full overflow-y-auto space-y-4 pr-2 pb-4 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
                                        {messages.map((message) => (
                                            <div
                                                key={message.id}
                                                className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                                            >
                                                <div className="flex items-center gap-2 mb-1.5 px-1">
                                                    <span className="text-[10px] font-semibold text-gray-400/80 uppercase tracking-wider">
                                                        {message.role === 'user' ? 'You' : 'NullBot'}
                                                    </span>
                                                </div>

                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className={`max-w-[88%] rounded-2xl px-5 py-3.5 text-[13.5px] sm:text-[14px] leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                                                        message.role === 'user'
                                                            ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-black shadow-orange-500/20 rounded-br-sm font-medium'
                                                            : 'bg-[#18181A] text-gray-200 border border-white/10 rounded-bl-sm [&_h1]:text-white [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-white [&_h2]:text-[15px] [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-white [&_h3]:text-[14px] [&_h3]:font-bold [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:mb-1 [&_p]:last:mb-0 [&_strong]:text-white [&_strong]:font-semibold [&_ul]:list-inside [&_ul]:pl-1 [&_ul]:mb-1 [&_ul]:last:mb-0 [&_ul]:space-y-1 [&_ul_ul]:mt-1 [&_ul_ul]:mb-0 [&_ul_ul]:ml-4 [&_ol]:list-inside [&_ol]:pl-1 [&_ol]:mb-1 [&_ol]:last:mb-0 [&_ol]:space-y-1 [&_ol_ol]:mt-1 [&_ol_ol]:mb-0 [&_ol_ol]:ml-4 [&_li]:pl-0 [&_li]:mt-0 [&_li_p]:inline [&_li_p]:!m-0 [&_li_p]:!leading-snug [&_li_ul]:mt-1 [&_li_ol]:mt-1 [&_a]:text-orange-400 [&_a]:underline [&_a]:underline-offset-2 [&_table]:w-full [&_table]:my-2 [&_table]:border-collapse [&_th]:text-left [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-[11px] [&_th]:font-semibold [&_th]:text-white/60 [&_th]:uppercase [&_th]:tracking-wider [&_th]:border-b [&_th]:border-white/10 [&_td]:px-3 [&_td]:py-1.5 [&_td]:border-b [&_td]:border-white/5 [&_td]:whitespace-normal [&_code]:bg-white/10 [&_code]:text-orange-200 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-[12px] [&_code]:font-mono [&_code]:break-all [&_pre]:bg-black/50 [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-gray-300 [&_pre_code]:break-normal [&_pre_code]:whitespace-pre'
                                                    }`}
                                                >
                                                    {message.role === 'user' ? (
                                                        message.content
                                                    ) : (
                                                        <ReactMarkdown 
                                                            remarkPlugins={[remarkGfm]}
                                                            components={{
                                                                code(props) {
                                                                    const {children, className} = props;
                                                                    return <TruncatedHashComponent className={className}>{children}</TruncatedHashComponent>
                                                                }
                                                            }}
                                                        >
                                                            {message.content}
                                                        </ReactMarkdown>
                                                    )}
                                                </motion.div>
                                            </div>
                                        ))}

                                        {messages.length === 1 && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2, duration: 0.3 }}
                                                className="flex flex-col items-start gap-2 pt-1 pb-2 w-full"
                                            >
                                                <span className="text-[10px] font-semibold text-gray-400/80 uppercase tracking-wider px-1">
                                                    Suggested Actions
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                    {quickPrompts.map((prompt) => (
                                                        <button
                                                            key={prompt}
                                                            type="button"
                                                            onClick={() => void sendMessage(prompt)}
                                                            className="text-xs px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-left flex-1 min-w-[140px]"
                                                        >
                                                            {prompt}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}

                                        {isThinking && (
                                            <div className="flex flex-col items-start pt-1">
                                                <div className="flex items-center gap-2 mb-1.5 px-1">
                                                    <span className="text-[10px] font-semibold text-gray-400/80 uppercase tracking-wider">
                                                        NullBot
                                                    </span>
                                                </div>
                                                <div className="rounded-2xl rounded-bl-sm px-4 py-3 text-sm bg-white/5 backdrop-blur-md border border-white/10 flex items-center gap-1.5 h-[46px]">
                                                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                                </div>
                                            </div>
                                        )}
                                        <div ref={endRef} className="h-2" />
                                    </div>
                                </div>

                                <form
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        void sendMessage(input);
                                    }}
                                    className="p-4 bg-white/[0.02] border-t border-white/8 mt-auto shrink-0"
                                >
                                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 focus-within:border-orange-500/40 focus-within:bg-black/60 transition-all shadow-inner">
                                        <input
                                            value={input}
                                            onChange={(event) => setInput(event.target.value)}
                                            placeholder="Ask about SDKs, APIs, Webhooks, or Contracts..."
                                            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!input.trim() || isThinking}
                                            className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-400 to-amber-300 text-black flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                            aria-label="Send message"
                                        >
                                            <SendHorizonal size={16} />
                                        </button>
                                    </div>
                                </form>
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
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-orange-400 via-amber-300 to-orange-500 text-black shadow-[0_12px_40px_rgba(251,146,60,0.45)] flex items-center justify-center border border-white/20"
                aria-label={`Open ${mode} assistant`}
            >
                <MessageCircle size={26} />
            </motion.button>
        </div>,
        document.body
    );
};
