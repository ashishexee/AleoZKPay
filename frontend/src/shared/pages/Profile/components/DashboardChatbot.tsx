import { createPortal } from 'react-dom';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, MessageCircle, SendHorizonal, Sparkles, X, Copy, Check, Wallet, Expand, Minimize2 } from 'lucide-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { QRCodeSVG } from 'qrcode.react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { useBurnerWallet } from '../../../hooks/wallet/BurnerWalletProvider';
import type { WalletTokenBalance } from '../../../hooks/wallet/useWalletBalances';
import {
    truncateAddress,
    tokenLabel,
    invoiceTypeLabel,
    walletLabel
} from '../../../utils/aleo/aleoUtils';
import { fetchAllPrivateBalances } from './BurnerWallet/scanner';
import { sweepBurnerFundsToDestination } from '../../../utils/burner/burnerSweep';
import { createInvoiceViaWallet } from '../../../utils/invoice/invoiceCreation';
import { PayerReceipt, MerchantReceipt } from '../../../types/receipt';
import type { InvoiceData } from '../../../types/invoice';
import { NullBotPendingToolCall, NullBotToolCall } from '../../../types/bot';
import { BurnerSweepCurrency } from '../../../types/tokens';
import { chatWithNullBot } from '../../../services/api';

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
    invoiceData?: InvoiceData;
};

type PendingToolMetadata = {
    availableBurnerBalances?: Record<BurnerSweepCurrency, number>;
};

type PendingToolCall =
    | (NullBotPendingToolCall & {
        metadata?: PendingToolMetadata;
    })
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



const formatPublicMappingBalance = (data: unknown, suffix: string) => {
    const normalize = (raw: unknown) => {
        const numeric = Number(String(raw ?? '').replace(suffix, '').replace(/"/g, '').replace(/_/g, ''));
        return Number.isFinite(numeric) ? (numeric / 1_000_000).toFixed(2) : '0.00';
    };

    if (typeof data === 'string' || typeof data === 'number') {
        return normalize(data);
    }

    if (data && typeof data === 'object') {
        const record = data as Record<string, unknown>;
        if ('microcredits' in record) return normalize(record.microcredits);
        if ('amount' in record) return normalize(record.amount);
        if ('balance' in record) return normalize(record.balance);
        if ('value' in record) return normalize(record.value);
    }

    return '0.00';
};

const MiniInvoiceCard: React.FC<{ invoiceData: InvoiceData }> = ({ invoiceData }) => {
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedHash, setCopiedHash] = useState(false);

    const copyLink = () => {
        navigator.clipboard.writeText(invoiceData.link);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const copyHash = () => {
        navigator.clipboard.writeText(invoiceData.hash);
        setCopiedHash(true);
        setTimeout(() => setCopiedHash(false), 2000);
    };

    return (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/35 p-3 sm:p-4">
            <div className="flex flex-col items-center gap-3">
                <div className="rounded-2xl bg-white p-3 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                    <div className="relative">
                        <QRCodeSVG value={invoiceData.link} size={164} level="H" includeMargin={false} />
                        <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-white p-1.5 shadow-[0_8px_22px_rgba(0,0,0,0.2)]">
                            <img
                                src="/assets/nullpay_logo.png"
                                alt="NullPay"
                                className="h-full w-full object-contain"
                                style={{ filter: 'brightness(0)' }}
                            />
                        </div>
                    </div>
                </div>
                <div className="w-full space-y-2">
                    <div className="rounded-xl bg-white/5 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400">Payment Link</div>
                        <div className="mt-1 truncate font-mono text-[11px] text-orange-200">{invoiceData.link}</div>
                    </div>
                    <div className="rounded-xl bg-white/5 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400">Invoice Hash</div>
                        <div className="mt-1 truncate font-mono text-[11px] text-cyan-200">{invoiceData.hash}</div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={copyLink}
                            className="flex-1 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-orange-100"
                        >
                            {copiedLink ? 'Link Copied' : 'Copy Link'}
                        </button>
                        <button
                            type="button"
                            onClick={copyHash}
                            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                            {copiedHash ? 'Hash Copied' : 'Copy Hash'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
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
    const [pendingToolCall, setPendingToolCall] = useState<PendingToolCall>(null);
    const [burnerBalances, setBurnerBalances] = useState<BotBalanceView[]>([
        { token: 'Credits', publicBalance: '0.00', privateBalance: '0.00', loading: false },
        { token: 'USDCx', publicBalance: '0.00', privateBalance: '0.00', loading: false },
        { token: 'USAD', publicBalance: '0.00', privateBalance: '0.00', loading: false },
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

    const loadBurnerBalanceContext = React.useCallback(async (): Promise<BotBalanceView[]> => {
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
                return formatPublicMappingBalance(data, suffix);
            } catch {
                return '0.00';
            }
        };

        if (!decryptedBurnerAddress) {
            const emptyBalances = initialBurnerBalances.map((entry) => ({ ...entry, loading: false }));
            setBurnerBalances(emptyBalances);
            return emptyBalances;
        }

        setBurnerBalances(initialBurnerBalances);

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

            const nextBalances: BotBalanceView[] = [
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
            ];
            setBurnerBalances(nextBalances);
            return nextBalances;
        } catch (error) {
            console.error('Failed to build burner balance context for NullBot:', error);
            const emptyBalances = initialBurnerBalances.map((entry) => ({ ...entry, loading: false }));
            setBurnerBalances(emptyBalances);
            return emptyBalances;
        }
    }, [decryptedBurnerAddress, decryptedBurnerKey]);

    const appendMessage = (message: ChatMessage) => {
        setMessages((current) => [...current, message].slice(-MAX_HISTORY_MESSAGES));
    };

    const appendAssistantMessage = (content: string, invoiceData?: InvoiceData) => {
        appendMessage({
            id: Date.now() + Math.floor(Math.random() * 1000),
            role: 'assistant',
            content,
            invoiceData,
        });
    };

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

    const buildPendingToolCall = (
        toolCall: NullBotToolCall,
        metadata?: PendingToolMetadata
    ): PendingToolCall => ({
        name: toolCall.name,
        args: toolCall.args as Record<string, unknown>,
        missingArgs: toolCall.missingArgs || [],
        ...(metadata ? { metadata } : {})
    });

    const getPendingToolPrompt = (toolCall: PendingToolCall) => {
        if (!toolCall) {
            return null;
        }

        if (toolCall.name === 'create_invoice') {
            if (toolCall.missingArgs.includes('optional_review')) {
                return 'Invoice draft ready. Add optional token/title/memo details, or say `continue`.';
            }
            return 'Invoice draft active. Reply with the missing invoice details like `0.1 credits` or say `cancel`.';
        }

        if (toolCall.name === 'sweep_funds') {
            return 'Sweep draft active. Reply with the amount and token you want to move, or say `cancel`.';
        }

        return 'Tool draft active. Reply with the missing details or say `cancel`.';
    };

    const prepareSweepFollowUp = async (toolCall: Extract<NullBotToolCall, { name: 'sweep_funds' }>, fallbackReply: string) => {
        if (!connected || !address) {
            appendAssistantMessage('Connect your main wallet first, then I can sweep burner funds into it.');
            return;
        }

        if (!decryptedBurnerAddress || !decryptedBurnerKey) {
            appendAssistantMessage('Your burner wallet is not unlocked right now. Unlock it first, then I can sweep funds from burner to main.');
            return;
        }

        setActionStatus('Scanning burner wallet records...');
        const freshBurnerBalances = await loadBurnerBalanceContext();
        const availableBurnerBalances: Record<BurnerSweepCurrency, number> = {
            ALEO: Number(freshBurnerBalances.find((entry) => entry.token === 'Credits')?.privateBalance || '0'),
            USDCx: Number(freshBurnerBalances.find((entry) => entry.token === 'USDCx')?.privateBalance || '0'),
            USAD: Number(freshBurnerBalances.find((entry) => entry.token === 'USAD')?.privateBalance || '0'),
        };

        setPendingToolCall(buildPendingToolCall(toolCall, { availableBurnerBalances }));
        appendAssistantMessage([
            'Your burner wallet private balances are:',
            '',
            `- Credits: ${availableBurnerBalances.ALEO.toFixed(2)}`,
            `- USDCx: ${availableBurnerBalances.USDCx.toFixed(2)}`,
            `- USAD: ${availableBurnerBalances.USAD.toFixed(2)}`,
            '',
            fallbackReply || 'Tell me how much you want to sweep and which token.',
            'Examples: `0.3 credits`, `0.5 usdcx`, or `all usad`.',
            'You can also say `cancel`.'
        ].join('\n'));
    };

    const executePlannedToolCall = async (toolCall: NullBotToolCall) => {
        if (toolCall.name === 'connect_wallet') {
            appendAssistantMessage('Use the wallet button below to connect Shield. Once connected, I will use that browser wallet directly.');
            return;
        }

        if (toolCall.name === 'pay_invoice') {
            if (!toolCall.args.payment_link) {
                appendAssistantMessage('Share the NullPay payment link and I will open the normal payment flow for you.');
                return;
            }

            const url = new URL(toolCall.args.payment_link);
            navigate(`/pay${url.search}`);
            appendAssistantMessage('I opened the in-app payment flow. Continue there and approve the payment with your wallet popup.');
            return;
        }

        if (toolCall.name === 'check_burner_balance') {
            if (!decryptedBurnerAddress || !decryptedBurnerKey) {
                appendAssistantMessage('Your burner wallet is not unlocked right now, so I cannot read its balances yet.');
                return;
            }

            setActionStatus('Scanning burner wallet records...');
            const resolvedBalances = await loadBurnerBalanceContext();
            appendAssistantMessage([
                'Your burner wallet balances are:',
                '',
                ...resolvedBalances.map((entry) => `- ${entry.token}: public ${entry.publicBalance}, private ${entry.privateBalance}`)
            ].join('\n'));
            return;
        }

        if (toolCall.name === 'get_analytics') {
            appendAssistantMessage([
                'Current dashboard snapshot:',
                '',
                `- Invoices: ${merchantStats.invoices} total`,
                `- Pending: ${merchantStats.pending}`,
                `- Settled: ${merchantStats.settled}`,
                `- Main volume: ${merchantStats.mainCredits} Credits, ${merchantStats.mainUSDCx} USDCx, ${merchantStats.mainUSAD} USAD`,
                `- Burner volume: ${merchantStats.burnerCredits} Credits, ${merchantStats.burnerUSDCx} USDCx, ${merchantStats.burnerUSAD} USAD`
            ].join('\n'));
            return;
        }

        if (toolCall.name === 'get_transaction_info') {
            const invoiceHash = toolCall.args.invoice_hash?.trim().toLowerCase();
            if (invoiceHash) {
                const matchedInvoice = invoices.find((invoice) => invoice.invoiceHash.toLowerCase() === invoiceHash);
                if (!matchedInvoice) {
                    appendAssistantMessage(`I could not find an invoice with hash \`${toolCall.args.invoice_hash}\` in your current dashboard context.`);
                    return;
                }

                appendAssistantMessage([
                    'Invoice details:',
                    '',
                    `- Hash: \`${matchedInvoice.invoiceHash}\``,
                    `- Amount: ${matchedInvoice.amount.toFixed(2)} ${tokenLabel(matchedInvoice.tokenType)}`,
                    `- Type: ${invoiceTypeLabel(matchedInvoice.invoiceType)}`,
                    `- Wallet: ${walletLabel(matchedInvoice.walletType)}`,
                    `- Status: ${matchedInvoice.status === 'SETTLED' || matchedInvoice.status === 1 ? 'SETTLED' : 'PENDING'}`,
                    ...(matchedInvoice.memo ? [`- Memo: ${matchedInvoice.memo}`] : [])
                ].join('\n'));
                return;
            }

            const limit = toolCall.args.limit && toolCall.args.limit > 0 ? toolCall.args.limit : 5;
            const recentInvoices = invoices.slice(0, limit);

            if (recentInvoices.length === 0) {
                appendAssistantMessage('There are no invoices in your current dashboard context yet.');
                return;
            }

            appendAssistantMessage([
                `Recent invoices (${recentInvoices.length}):`,
                '',
                ...recentInvoices.map((invoice) =>
                    `- \`${invoice.invoiceHash}\` | ${invoice.amount.toFixed(2)} ${tokenLabel(invoice.tokenType)} | ${invoice.status === 'SETTLED' || invoice.status === 1 ? 'SETTLED' : 'PENDING'}`
                )
            ].join('\n'));
            return;
        }

        if (toolCall.name === 'sweep_funds') {
            if (!connected || !address) {
                appendAssistantMessage('Connect your main wallet first, then I can sweep burner funds into it.');
                return;
            }

            if (!decryptedBurnerKey) {
                appendAssistantMessage('Your burner wallet is not unlocked right now. Unlock it first, then I can sweep funds from burner to main.');
                return;
            }

            const currencyMap: Record<'CREDITS' | 'USDCX' | 'USAD', BurnerSweepCurrency> = {
                CREDITS: 'ALEO',
                USDCX: 'USDCx',
                USAD: 'USAD',
            };

            if (!toolCall.args.currency || toolCall.args.amount == null) {
                await prepareSweepFollowUp(toolCall, 'Tell me how much you want to sweep and which token.');
                return;
            }

            const mappedCurrency = currencyMap[toolCall.args.currency as keyof typeof currencyMap];
            const amount = Number(toolCall.args.amount);
            if (!mappedCurrency || !Number.isFinite(amount) || amount <= 0) {
                appendAssistantMessage('Tell me the amount and token to sweep, like `0.3 credits` or `0.5 usdcx`.');
                return;
            }

            let availableBurnerBalances = pendingToolCall?.name === 'sweep_funds'
                ? pendingToolCall.metadata?.availableBurnerBalances
                : undefined;

            if (!availableBurnerBalances) {
                setActionStatus('Scanning burner wallet records...');
                const freshBurnerBalances = await loadBurnerBalanceContext();
                availableBurnerBalances = {
                    ALEO: Number(freshBurnerBalances.find((entry) => entry.token === 'Credits')?.privateBalance || '0'),
                    USDCx: Number(freshBurnerBalances.find((entry) => entry.token === 'USDCx')?.privateBalance || '0'),
                    USAD: Number(freshBurnerBalances.find((entry) => entry.token === 'USAD')?.privateBalance || '0'),
                };
            }

            if (amount > (availableBurnerBalances[mappedCurrency] || 0)) {
                appendAssistantMessage(`That exceeds your available private ${mappedCurrency} burner balance of ${(availableBurnerBalances[mappedCurrency] || 0).toFixed(2)}.`);
                return;
            }

            const destination = toolCall.args.destination === 'main_wallet' || !toolCall.args.destination
                ? address
                : toolCall.args.destination;

            const sweepResult = await sweepBurnerFundsToDestination({
                decryptedBurnerKey,
                amount,
                currency: mappedCurrency,
                destination,
                onStatus: setActionStatus
            });

            setPendingToolCall(null);
            appendAssistantMessage([
                `Burner sweep submitted${destination === address ? ' to your main wallet' : ''}${sweepResult.txIds.length > 1 ? ` across ${sweepResult.txIds.length} transactions` : ''}.`,
                '',
                ...sweepResult.txIds.map((txId: string, index: number) => `- Transfer ${index + 1}: \`${txId}\``)
            ].join('\n'));
            return;
        }

        if (toolCall.name !== 'create_invoice') {
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
        const walletType = toolCall.args.wallet === 'burner' ? 1 : 0;

        const result = await createInvoiceViaWallet({
            publicKey: address,
            executeTransaction,
            transactionStatus,
            requestTransactionHistory,
            amount: toolCall.args.invoice_type === 'donation' ? 0 : Number(toolCall.args.amount),
            title: toolCall.args.title || '',
            memo: toolCall.args.memo || '',
            invoiceType: toolCall.args.invoice_type || 'standard',
            tokenType: currencyToTokenType[toolCall.args.currency || 'CREDITS'] ?? 0,
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
        ].join('\n'), result.invoiceData);
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
            if (/^(cancel|stop|nevermind|never mind)$/i.test(trimmed) && pendingToolCall) {
                const cancelledLabel = pendingToolCall.name === 'create_invoice'
                    ? 'Invoice creation'
                    : pendingToolCall.name === 'sweep_funds'
                        ? 'Sweep'
                        : 'Tool flow';
                setPendingToolCall(null);
                appendAssistantMessage(`${cancelledLabel} cancelled.`);
                return;
            }

            const response = await chatWithNullBot(trimmed, {
                ...dashboardContext,
                pendingToolCall: pendingToolCall
                    ? {
                        name: pendingToolCall.name,
                        args: pendingToolCall.args,
                        missingArgs: pendingToolCall.missingArgs,
                        metadata: pendingToolCall.metadata,
                    }
                    : null,
            });

            if (!response.toolCall) {
                setPendingToolCall(null);
                if (response.reply) {
                    appendAssistantMessage(response.reply);
                }
                return;
            }

            if (response.toolCall.missingArgs && response.toolCall.missingArgs.length > 0) {
                if (response.toolCall.name === 'sweep_funds') {
                    await prepareSweepFollowUp(response.toolCall, response.reply);
                    return;
                }

                setPendingToolCall(buildPendingToolCall(response.toolCall));
                if (response.reply) {
                    appendAssistantMessage(response.reply);
                }
                return;
            }

            setPendingToolCall(null);
            await executePlannedToolCall(response.toolCall);
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
                                    {pendingToolCall && getPendingToolPrompt(pendingToolCall) && (
                                        <div className={`rounded-xl px-3 py-2 text-[11px] ${
                                            pendingToolCall.name === 'create_invoice'
                                                ? 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-100'
                                                : 'border border-orange-400/20 bg-orange-400/10 text-orange-100'
                                        }`}>
                                            {getPendingToolPrompt(pendingToolCall)}
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
                                                placeholder="Ask anything in plain language. NullBot will pick the tool, collect details, and trigger the browser flow."
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
