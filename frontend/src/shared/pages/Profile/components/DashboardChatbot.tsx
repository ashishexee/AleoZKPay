import { createPortal } from 'react-dom';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, MessageCircle, SendHorizonal, Sparkles, X, Copy, Check, Wallet, Expand, Minimize2 } from 'lucide-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GlassCard } from '../../../components/ui/GlassCard';
import { useBurnerWallet } from '../../../hooks/BurnerWalletProvider';
import type { WalletTokenBalance } from '../../../hooks/useWalletBalances';
import type { MerchantReceipt, PayerReceipt } from '../../../utils/aleo-utils';
import { chatWithNullBot } from '../../../services/api';
import { createInvoiceViaWallet } from '../../../utils/invoiceCreation';
import { sweepBurnerFundsToDestination, type BurnerSweepCurrency } from '../../../utils/burnerSweep';
import { fetchAllPrivateBalances } from './BurnerWallet/scanner';

type DashboardInvoice = {
    invoiceHash: string;
    amount: number;
    tokenType: number;
    invoiceType: number;
    walletType: number;
    status: string | number;
    memo?: string;
    donations?: {
        credits: number;
        usdcx: number;
        usad: number;
    };
};

type MerchantStats = {
    mainCredits: string;
    mainUSDCx: string;
    mainUSAD: string;
    burnerCredits: string;
    burnerUSDCx: string;
    burnerUSAD: string;
    invoices: number;
    settled: number;
    pending: number;
};

type ChatMessage = {
    id: number;
    role: 'assistant' | 'user';
    content: string;
};

type PendingAction =
    | {
        type: 'sweep_burner_to_main';
    }
    | null;

type BotBalanceView = {
    token: 'Credits' | 'USDCx' | 'USAD';
    publicBalance: string;
    privateBalance: string;
    loading: boolean;
};

const NULLBOT_HISTORY_KEY = 'nullbot-dashboard-history';
const MAX_HISTORY_MESSAGES = 20;
const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
    id: 1,
    role: 'assistant',
    content:
        'I can answer dashboard questions and now trigger browser-side NullPay tools. Try something like `Make an invoice of 1 credit` and I will open the normal Shield signing flow instead of asking for any private key.',
};

interface DashboardChatbotProps {
    mainWalletAddress: string | null;
    burnerWalletAddress: string | null;
    balances: WalletTokenBalance[];
    merchantStats: MerchantStats;
    invoices: DashboardInvoice[];
    mainMerchantReceipts: MerchantReceipt[];
    burnerMerchantReceipts: MerchantReceipt[];
    payerReceipts: PayerReceipt[];
    loadingInvoices: boolean;
    loadingReceipts: boolean;
    loadingPayerReceipts: boolean;
}

const QUICK_PROMPTS = [
    'Make an invoice of 1 credit',
    'Give me a full dashboard summary',
    'Show all my invoices',
    'List all receipt hashes',
];

const TOOL_PILLS = [
    'create_invoice',
    'pay_invoice',
    'get_transaction_info',
    'get_analytics',
    'check_burner_balance',
];

const tokenLabel = (tokenType: number) => {
    if (tokenType === 1) return 'USDCx';
    if (tokenType === 2) return 'USAD';
    if (tokenType === 3) return 'Any token';
    return 'Credits';
};

const invoiceTypeLabel = (invoiceType: number) => {
    if (invoiceType === 1) return 'Multi-Pay';
    if (invoiceType === 2) return 'Donation';
    return 'Standard';
};

const walletLabel = (walletType: number) => (walletType === 1 ? 'Burner' : 'Main');

const truncateAddress = (value: string | null | undefined) => (
    value ? `${value.slice(0, 10)}...${value.slice(-6)}` : 'Not connected'
);

const parseSweepReply = (message: string, availableByCurrency: Record<BurnerSweepCurrency, number>) => {
    const trimmed = message.trim();
    const normalized = trimmed.toLowerCase();

    if (!trimmed) {
        return { error: 'Tell me the amount and token to sweep, like `1 credit`, `0.5 usdcx`, or `all usad`.' };
    }

    if (/^(cancel|stop|nevermind|never mind)$/i.test(trimmed)) {
        return { cancelled: true };
    }

    const detectCurrency = (): BurnerSweepCurrency | null => {
        if (/\busdcx\b/i.test(trimmed)) return 'USDCx';
        if (/\busad\b/i.test(trimmed)) return 'USAD';
        if (/\b(aleo|credit|credits)\b/i.test(trimmed)) return 'ALEO';
        return null;
    };

    const currency = detectCurrency();
    if (!currency) {
        return { error: 'Mention which token to sweep: `Credits`, `USDCx`, or `USAD`.' };
    }

    if (/\ball\b/i.test(normalized)) {
        const amount = availableByCurrency[currency];
        if (!amount || amount <= 0) {
            return { error: `Your burner wallet does not currently show any private ${currency} balance to sweep.` };
        }

        return { currency, amount };
    }

    const amountMatch = trimmed.match(/(\d+(?:\.\d+)?)/);
    if (!amountMatch) {
        return { error: 'Tell me the amount to sweep, like `1 credit` or `0.5 usdcx`.' };
    }

    const amount = Number(amountMatch[1]);
    if (!Number.isFinite(amount) || amount <= 0) {
        return { error: 'Sweep amount must be a positive number.' };
    }

    return { currency, amount };
};

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

export const DashboardChatbot: React.FC<DashboardChatbotProps> = ({
    mainWalletAddress,
    burnerWalletAddress,
    balances,
    merchantStats,
    invoices,
    mainMerchantReceipts,
    burnerMerchantReceipts,
    payerReceipts,
}) => {
    const navigate = useNavigate();
    const { connected, address, executeTransaction, transactionStatus, requestTransactionHistory } = useWallet();
    const { appPassword, decryptedBurnerAddress, decryptedBurnerKey } = useBurnerWallet();
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [actionStatus, setActionStatus] = useState('');
    const [pendingAction, setPendingAction] = useState<PendingAction>(null);
    const [burnerBalances, setBurnerBalances] = useState<BotBalanceView[]>([
        { token: 'Credits', publicBalance: '0.00', privateBalance: '0.00', loading: true },
        { token: 'USDCx', publicBalance: '0.00', privateBalance: '0.00', loading: true },
        { token: 'USAD', publicBalance: '0.00', privateBalance: '0.00', loading: true },
    ]);
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        if (typeof window === 'undefined') {
            return [INITIAL_ASSISTANT_MESSAGE];
        }

        try {
            const stored = window.sessionStorage.getItem(NULLBOT_HISTORY_KEY);
            if (!stored) {
                return [INITIAL_ASSISTANT_MESSAGE];
            }

            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed) || parsed.length === 0) {
                return [INITIAL_ASSISTANT_MESSAGE];
            }

            return parsed.slice(-MAX_HISTORY_MESSAGES);
        } catch {
            return [INITIAL_ASSISTANT_MESSAGE];
        }
    });
    const endRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.sessionStorage.setItem(
            NULLBOT_HISTORY_KEY,
            JSON.stringify(messages.slice(-MAX_HISTORY_MESSAGES))
        );
    }, [messages]);

    useEffect(() => {
        let cancelled = false;

        const initialBurnerBalances: BotBalanceView[] = [
            { token: 'Credits', publicBalance: '0.00', privateBalance: '0.00', loading: true },
            { token: 'USDCx', publicBalance: '0.00', privateBalance: '0.00', loading: true },
            { token: 'USAD', publicBalance: '0.00', privateBalance: '0.00', loading: true },
        ];

        const updatePublicBalance = async (walletAddress: string, programId: string, mappingName: string, suffix: string) => {
            try {
                const response = await fetch(`https://api.explorer.aleo.org/v1/testnet/program/${programId}/mapping/${mappingName}/${walletAddress}`);
                if (!response.ok) {
                    return '0.00';
                }
                const data = await response.json();
                const value = String(data).replace(suffix, '').replace(/"/g, '');
                return (Number(value) / 1_000_000).toFixed(2);
            } catch {
                return '0.00';
            }
        };

        const fetchBurnerBalanceContext = async () => {
            if (!decryptedBurnerAddress) {
                if (!cancelled) {
                    setBurnerBalances(initialBurnerBalances.map((entry) => ({ ...entry, loading: false })));
                }
                return;
            }

            if (!cancelled) {
                setBurnerBalances(initialBurnerBalances);
            }

            try {
                const [creditsPublic, usdcxPublic, usadPublic] = await Promise.all([
                    updatePublicBalance(decryptedBurnerAddress, 'credits.aleo', 'account', 'u64'),
                    updatePublicBalance(decryptedBurnerAddress, 'test_usdcx_stablecoin.aleo', 'balances', 'u128'),
                    updatePublicBalance(decryptedBurnerAddress, 'test_usad_stablecoin.aleo', 'balances', 'u128'),
                ]);

                let privateBalances = { ALEO: 0, USDCx: 0, USAD: 0 };
                if (decryptedBurnerKey) {
                    try {
                        privateBalances = await fetchAllPrivateBalances(decryptedBurnerKey);
                    } catch (error) {
                        console.warn('Failed to fetch burner private balances for NullBot context:', error);
                    }
                }

                if (!cancelled) {
                    setBurnerBalances([
                        {
                            token: 'Credits',
                            publicBalance: creditsPublic,
                            privateBalance: privateBalances.ALEO.toFixed(2),
                            loading: false,
                        },
                        {
                            token: 'USDCx',
                            publicBalance: usdcxPublic,
                            privateBalance: privateBalances.USDCx.toFixed(2),
                            loading: false,
                        },
                        {
                            token: 'USAD',
                            publicBalance: usadPublic,
                            privateBalance: privateBalances.USAD.toFixed(2),
                            loading: false,
                        },
                    ]);
                }
            } catch (error) {
                console.error('Failed to build burner balance context for NullBot:', error);
                if (!cancelled) {
                    setBurnerBalances(initialBurnerBalances.map((entry) => ({ ...entry, loading: false })));
                }
            }
        };

        fetchBurnerBalanceContext();

        return () => {
            cancelled = true;
        };
    }, [decryptedBurnerAddress, decryptedBurnerKey]);

    const appendMessage = (message: ChatMessage) => {
        setMessages((current) => [...current, message].slice(-MAX_HISTORY_MESSAGES));
    };

    const appendAssistantMessage = (content: string) => {
        appendMessage({
            id: Date.now() + Math.floor(Math.random() * 1000),
            role: 'assistant',
            content,
        });
    };

    const availableBurnerBalances = useMemo<Record<BurnerSweepCurrency, number>>(() => ({
        ALEO: Number(burnerBalances.find((entry) => entry.token === 'Credits')?.privateBalance || '0'),
        USDCx: Number(burnerBalances.find((entry) => entry.token === 'USDCx')?.privateBalance || '0'),
        USAD: Number(burnerBalances.find((entry) => entry.token === 'USAD')?.privateBalance || '0'),
    }), [burnerBalances]);

    const dashboardContext = useMemo(() => {
        return {
            mode: 'dashboard',
            route: window.location.pathname,
            wallet: {
                connected,
                address: address || mainWalletAddress,
                burnerAddress: decryptedBurnerAddress || burnerWalletAddress,
                hasAppPassword: Boolean(appPassword),
                burnerUnlocked: Boolean(decryptedBurnerKey),
            },
            walletAddresses: {
                main: mainWalletAddress,
                burner: burnerWalletAddress,
            },
            mainWalletBalances: balances.map((balance) => ({
                token: balance.name,
                publicBalance: balance.public,
                privateBalance: balance.private,
                loading: balance.loading,
            })),
            burnerWalletBalances: burnerBalances,
            stats: {
                totalInvoices: merchantStats.invoices,
                pendingInvoices: merchantStats.pending,
                settledInvoices: merchantStats.settled,
                mainVolume: {
                    credits: merchantStats.mainCredits,
                    usdcx: merchantStats.mainUSDCx,
                    usad: merchantStats.mainUSAD,
                },
                burnerVolume: {
                    credits: merchantStats.burnerCredits,
                    usdcx: merchantStats.burnerUSDCx,
                    usad: merchantStats.burnerUSAD,
                },
            },
            invoices: invoices.map((invoice) => ({
                invoiceHash: invoice.invoiceHash,
                amount: invoice.amount.toFixed(2),
                token: tokenLabel(invoice.tokenType),
                invoiceType: invoiceTypeLabel(invoice.invoiceType),
                wallet: walletLabel(invoice.walletType),
                status: invoice.status === 'SETTLED' || invoice.status === 1 ? 'SETTLED' : 'PENDING',
                memo: invoice.memo || '',
                donations: invoice.donations || null,
            })),
            merchantReceipts: {
                main: mainMerchantReceipts.map((receipt) => ({
                    receiptHash: receipt.receiptHash,
                    invoiceHash: receipt.invoiceHash,
                    amount: (Number(receipt.amount) / 1_000_000).toFixed(2),
                    token: tokenLabel(receipt.tokenType),
                    wallet: 'Main',
                })),
                burner: burnerMerchantReceipts.map((receipt) => ({
                    receiptHash: receipt.receiptHash,
                    invoiceHash: receipt.invoiceHash,
                    amount: (Number(receipt.amount) / 1_000_000).toFixed(2),
                    token: tokenLabel(receipt.tokenType),
                    wallet: 'Burner',
                })),
            },
            recentConversation: messages.slice(-8).map((message) => ({
                role: message.role,
                content: message.content,
            })),
            payerReceipts: payerReceipts.map((receipt) => ({
                receiptHash: receipt.receiptHash,
                invoiceHash: receipt.invoiceHash,
                amount: (Number(receipt.amount) / 1_000_000).toFixed(2),
                token: tokenLabel(receipt.tokenType),
                merchant: receipt.merchant,
            })),
        };
    }, [
        connected,
        address,
        appPassword,
        decryptedBurnerAddress,
        decryptedBurnerKey,
        mainWalletAddress,
        burnerWalletAddress,
        balances,
        burnerBalances,
        merchantStats,
        invoices,
        mainMerchantReceipts,
        burnerMerchantReceipts,
        messages,
        payerReceipts,
    ]);

    useEffect(() => {
        if (isOpen) {
            endRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, isThinking, actionStatus]);

    const executePlannedAction = async (action: any) => {
        if (action.type === 'connect_wallet') {
            appendAssistantMessage('Use the wallet button below to connect Shield. Once connected, I will use that browser wallet directly.');
            return;
        }

        if (action.type === 'open_payment_link') {
            const url = new URL(action.args.url);
            navigate(`/pay${url.search}`);
            appendAssistantMessage('I opened the in-app payment flow. Continue there and approve the payment with your wallet popup.');
            return;
        }

        if (action.type === 'sweep_burner_to_main') {
            if (!connected || !address) {
                appendAssistantMessage('Connect your main wallet first, then I can sweep burner funds into it.');
                return;
            }

            if (!decryptedBurnerKey) {
                appendAssistantMessage('Your burner wallet is not unlocked right now. Unlock it first, then I can sweep funds from burner to main.');
                return;
            }

            setPendingAction({ type: 'sweep_burner_to_main' });
            appendAssistantMessage([
                'Your burner wallet private balances are:',
                '',
                `- Credits: ${availableBurnerBalances.ALEO.toFixed(2)}`,
                `- USDCx: ${availableBurnerBalances.USDCx.toFixed(2)}`,
                `- USAD: ${availableBurnerBalances.USAD.toFixed(2)}`,
                '',
                'Tell me how much you want to sweep and which token.',
                'Examples: `1 credit`, `0.5 usdcx`, `all usad`.',
                'You can also say `cancel`.'
            ].join('\n'));
            return;
        }

        if (action.type !== 'create_invoice') {
            return;
        }

        if (!connected || !address || !executeTransaction || !transactionStatus) {
            appendAssistantMessage('Connect your wallet first, then I can create the invoice through the normal Shield popup flow.');
            return;
        }

        if (!appPassword) {
            appendAssistantMessage('Your NullPay app layer is locked right now. Unlock it first, then I can create invoices from prompts.');
            return;
        }

        const currencyToTokenType: Record<string, number> = {
            CREDITS: 0,
            USDCX: 1,
            USAD: 2,
            ANY: 3,
        };
        const walletType = action.args.wallet === 'burner' ? 1 : 0;

        const result = await createInvoiceViaWallet({
            publicKey: address,
            executeTransaction,
            transactionStatus,
            requestTransactionHistory,
            amount: Number(action.args.amount),
            memo: action.args.memo || '',
            invoiceType: action.args.invoice_type || 'standard',
            tokenType: currencyToTokenType[action.args.currency || 'CREDITS'] ?? 0,
            walletType,
            appPassword,
            decryptedBurnerAddress,
            onStatus: setActionStatus
        });

        appendAssistantMessage([
            `Invoice created successfully from your ${walletType === 1 ? 'burner' : 'main'} wallet.`,
            '',
            `Hash: \`${result.hash}\``,
            `Transaction: \`${result.txId}\``,
            `Payment link: ${result.invoiceData.link}`,
        ].join('\n'));
    };

    const sendMessage = async (message: string) => {
        const trimmed = message.trim();
        if (!trimmed || isThinking) return;

        appendMessage({
            id: Date.now(),
            role: 'user',
            content: trimmed,
        });
        setInput('');
        setIsThinking(true);
        setActionStatus('');

        try {
            if (pendingAction?.type === 'sweep_burner_to_main') {
                const parsed = parseSweepReply(trimmed, availableBurnerBalances);

                if (parsed.cancelled) {
                    setPendingAction(null);
                    appendAssistantMessage('Sweep cancelled.');
                    return;
                }

                if (parsed.error) {
                    appendAssistantMessage(parsed.error);
                    return;
                }

                if (!connected || !address) {
                    setPendingAction(null);
                    appendAssistantMessage('Connect your main wallet first, then I can sweep burner funds into it.');
                    return;
                }

                if (!decryptedBurnerKey) {
                    setPendingAction(null);
                    appendAssistantMessage('Your burner wallet is not unlocked right now. Unlock it first, then I can sweep funds from burner to main.');
                    return;
                }

                if (parsed.amount > availableBurnerBalances[parsed.currency]) {
                    appendAssistantMessage(`That exceeds your available private ${parsed.currency} burner balance of ${availableBurnerBalances[parsed.currency].toFixed(2)}.`);
                    return;
                }

                const txId = await sweepBurnerFundsToDestination({
                    decryptedBurnerKey,
                    amount: parsed.amount,
                    currency: parsed.currency,
                    destination: address,
                    onStatus: setActionStatus
                });

                setPendingAction(null);
                appendAssistantMessage([
                    'Burner sweep submitted to your main wallet.',
                    '',
                    `- ${parsed.amount.toFixed(2)} ${parsed.currency} -> \`${txId}\``
                ].join('\n'));
                return;
            }

            const response = await chatWithNullBot(trimmed, dashboardContext);
            if (response.reply && response.action?.type !== 'sweep_burner_to_main') {
                appendAssistantMessage(response.reply);
            }
            if (response.action) {
                await executePlannedAction(response.action);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            appendAssistantMessage(`NullBot error: ${errorMessage}`);
        } finally {
            setActionStatus('');
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
                        className={isExpanded ? 'w-[min(96vw,56rem)] origin-bottom-right' : 'w-[min(92vw,26rem)] origin-bottom-right'}
                    >
                        <GlassCard
                            variant="heavy"
                            hoverEffect={false}
                            className="border border-orange-400/20 shadow-[0_25px_80px_rgba(0,0,0,0.45)]"
                        >
                            <div className={`relative flex flex-col overflow-hidden ${isExpanded ? 'h-[min(85vh,48rem)]' : 'h-[min(35rem,calc(100vh-7rem))]'}`}>
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
                                                Browser-native NullPay tools with Shield popup signing.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsExpanded((current) => !current)}
                                            className="text-gray-400 hover:text-white transition-colors"
                                            aria-label={isExpanded ? 'Collapse dashboard assistant' : 'Expand dashboard assistant'}
                                            title={isExpanded ? 'Collapse chat' : 'Expand chat'}
                                        >
                                            {isExpanded ? <Minimize2 size={18} /> : <Expand size={18} />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsOpen(false)}
                                            className="text-gray-400 hover:text-white transition-colors"
                                            aria-label="Close dashboard assistant"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="px-4 pt-3 pb-2 border-b border-white/5 bg-black/10">
                                    <div className="flex items-center gap-2 text-[11px] text-gray-300">
                                        <Wallet size={12} className="text-orange-300" />
                                        <span>{connected ? `Main ${truncateAddress(address || mainWalletAddress)}` : 'Wallet not connected'}</span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {TOOL_PILLS.map((tool) => (
                                            <span
                                                key={tool}
                                                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-gray-300"
                                            >
                                                {tool}
                                            </span>
                                        ))}
                                    </div>
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
                                                            : 'bg-[#18181A] text-gray-200 border border-white/10 rounded-bl-sm [&_h1]:text-white [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-white [&_p]:mb-1 [&_p]:last:mb-0 [&_strong]:text-white [&_ul]:list-inside [&_ul]:space-y-1 [&_a]:text-orange-400 [&_a]:underline [&_code]:bg-white/10 [&_code]:text-orange-200 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-[12px] [&_code]:font-mono [&_pre]:bg-black/50 [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:my-2 [&_pre]:overflow-x-auto'
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
                                                                    return <TruncatedHashComponent className={className}>{children}</TruncatedHashComponent>;
                                                                }
                                                            }}
                                                        >
                                                            {message.content}
                                                        </ReactMarkdown>
                                                    )}
                                                </motion.div>
                                            </div>
                                        ))}

                                        {messages.length <= 1 && (
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
                                                    {QUICK_PROMPTS.map((prompt) => (
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
                                                <div className="rounded-2xl rounded-bl-sm px-4 py-3 text-sm bg-white/5 backdrop-blur-md border border-white/10 flex flex-col gap-2 min-h-[46px]">
                                                    <div className="flex items-center gap-1.5">
                                                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                                    </div>
                                                    {actionStatus && (
                                                        <p className="text-xs text-orange-200 whitespace-pre-wrap">{actionStatus}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        <div ref={endRef} className="h-2" />
                                    </div>
                                </div>

                                <div className="p-4 bg-white/[0.02] border-t border-white/8 mt-auto shrink-0 space-y-3">
                                    {!connected && (
                                        <div className="wallet-adapter-wrapper w-full [&>button]:!w-full [&>button]:!justify-center [&>button]:!rounded-xl [&>button]:!h-11 [&>button]:!bg-white [&>button]:!text-black [&>button]:!font-bold">
                                            <WalletMultiButton />
                                        </div>
                                    )}
                                    <form
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            void sendMessage(input);
                                        }}
                                    >
                                        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 focus-within:border-orange-500/40 focus-within:bg-black/60 transition-all shadow-inner">
                                            <input
                                                value={input}
                                                onChange={(event) => setInput(event.target.value)}
                                                placeholder="Ask about invoices, balances, or say: sweep funds from burner to main wallet"
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
                aria-label="Open dashboard assistant"
            >
                <MessageCircle size={26} />
            </motion.button>
        </div>,
        document.body
    );
};
