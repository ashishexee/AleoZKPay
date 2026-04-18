import type { WalletTokenBalance } from '../hooks/useWalletBalances';
import type { InvoiceData } from './invoice';
import type { MerchantReceipt, PayerReceipt } from './receipt';
import type { NullBotPendingToolCall } from './bot';
import type { BurnerSweepCurrency } from './tokens';

export type DashboardInvoice = {
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

export type MerchantStats = {
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

export type ChatMessage = {
    id: number;
    role: 'assistant' | 'user';
    content: string;
    invoiceData?: InvoiceData;
};

export type PendingToolMetadata = {
    availableBurnerBalances?: Record<BurnerSweepCurrency, number>;
};

export type PendingToolCall =
    | (NullBotPendingToolCall & {
        metadata?: PendingToolMetadata;
    })
    | null;

export type BotBalanceView = {
    token: 'Credits' | 'USDCx' | 'USAD';
    publicBalance: string;
    privateBalance: string;
    loading: boolean;
};

export interface DashboardChatbotProps {
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
