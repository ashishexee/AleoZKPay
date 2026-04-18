import { useMemo, useState } from 'react';
import { tokenLabel, invoiceTypeLabel, walletLabel } from '../../../../../utils/aleo/aleoUtils';
import { sweepBurnerFundsToDestination } from '../../../../../utils/burner/burnerSweep';
import { createInvoiceViaWallet } from '../../../../../utils/invoice/invoiceCreation';
import { chatWithNullBot } from '../../../../../services/api';
import type { NullBotToolCall } from '../../../../../types/bot';
import type { BurnerSweepCurrency } from '../../../../../types/tokens';
import type {
    BotBalanceView,
    DashboardChatbotProps,
    PendingToolCall,
    PendingToolMetadata,
} from '../../../../../types/nullbot';

interface NullBotControllerParams extends DashboardChatbotProps {
    connected: boolean;
    address?: string | null;
    executeTransaction?: unknown;
    transactionStatus?: unknown;
    requestTransactionHistory?: unknown;
    navigate: (to: string) => void;
    appPassword?: string | null;
    decryptedBurnerAddress?: string | null;
    decryptedBurnerKey?: string | null;
    burnerBalances: BotBalanceView[];
    loadBurnerBalanceContext: () => Promise<BotBalanceView[]>;
    messages: Array<{ role: 'assistant' | 'user'; content: string }>;
    appendMessage: (message: { id: number; role: 'assistant' | 'user'; content: string }) => void;
    appendAssistantMessage: (content: string, invoiceData?: import('../../../../../types/invoice').InvoiceData) => void;
}

export const useNullBotController = ({
    mainWalletAddress,
    burnerWalletAddress,
    balances,
    merchantStats,
    invoices,
    mainMerchantReceipts,
    burnerMerchantReceipts,
    payerReceipts,
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
}: NullBotControllerParams) => {
    const [isThinking, setIsThinking] = useState(false);
    const [actionStatus, setActionStatus] = useState('');
    const [pendingToolCall, setPendingToolCall] = useState<PendingToolCall>(null);

    const dashboardContext = useMemo(() => {
        const route = typeof window === 'undefined' ? '' : window.location.pathname;

        return {
            mode: 'dashboard',
            route,
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

    const buildPendingToolCall = (
        toolCall: NullBotToolCall,
        metadata?: PendingToolMetadata
    ): PendingToolCall => ({
        name: toolCall.name,
        args: toolCall.args as Record<string, unknown>,
        missingArgs: toolCall.missingArgs || [],
        ...(metadata ? { metadata } : {}),
    });

    const prepareSweepFollowUp = async (
        toolCall: Extract<NullBotToolCall, { name: 'sweep_funds' }>,
        fallbackReply: string
    ) => {
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
            'You can also say `cancel`.',
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
                ...resolvedBalances.map((entry) => `- ${entry.token}: public ${entry.publicBalance}, private ${entry.privateBalance}`),
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
                `- Burner volume: ${merchantStats.burnerCredits} Credits, ${merchantStats.burnerUSDCx} USDCx, ${merchantStats.burnerUSAD} USAD`,
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
                    ...(matchedInvoice.memo ? [`- Memo: ${matchedInvoice.memo}`] : []),
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
                ),
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
                onStatus: setActionStatus,
            });

            setPendingToolCall(null);
            appendAssistantMessage([
                `Burner sweep submitted${destination === address ? ' to your main wallet' : ''}${sweepResult.txIds.length > 1 ? ` across ${sweepResult.txIds.length} transactions` : ''}.`,
                '',
                ...sweepResult.txIds.map((txId: string, index: number) => `- Transfer ${index + 1}: \`${txId}\``),
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
            executeTransaction: executeTransaction as never,
            transactionStatus: transactionStatus as never,
            requestTransactionHistory: requestTransactionHistory as never,
            amount: toolCall.args.invoice_type === 'donation' ? 0 : Number(toolCall.args.amount),
            title: toolCall.args.title || '',
            memo: toolCall.args.memo || '',
            invoiceType: toolCall.args.invoice_type || 'standard',
            tokenType: currencyToTokenType[toolCall.args.currency || 'CREDITS'] ?? 0,
            walletType,
            appPassword,
            decryptedBurnerAddress,
            onStatus: setActionStatus,
        });

        appendAssistantMessage([
            `Invoice created successfully from your ${walletType === 1 ? 'burner' : 'main'} wallet.`,
            '',
            `Hash: \`${result.hash}\``,
            `Transaction: \`${result.txId}\``,
            `Payment link: ${result.invoiceData.link}`,
        ].join('\n'), result.invoiceData);
    };

    const sendMessage = async (message: string, onInputReset?: () => void) => {
        const trimmed = message.trim();
        if (!trimmed || isThinking) return;

        appendMessage({
            id: Date.now(),
            role: 'user',
            content: trimmed,
        });
        onInputReset?.();
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

    return {
        isThinking,
        actionStatus,
        pendingToolCall,
        sendMessage,
    };
};
