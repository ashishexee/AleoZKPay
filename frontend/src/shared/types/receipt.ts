import { WalletTokenBalance } from '../hooks/useWalletBalances';

export interface PayerReceipt {
    owner: string;
    merchant: string;
    receiptHash: string;
    invoiceHash: string;
    amount: number;
    tokenType: number;
    payerNote: string;
    timestamp: number;
    created_at?: string;
    transactionId?: string;
}

export interface MerchantReceipt {
    owner: string;
    receiptHash: string;
    invoiceHash: string;
    amount: number;
    tokenType: number;
    merchantNote: string;
    timestamp?: number;
    created_at?: string;
    transactionId?: string;
}

export interface BurnerWalletRecord {
    owner: string;
    burnerAddress: string;
    passwordPart: string;
    pkParts: string[];
}

export interface ReportInvoice {
    invoiceHash: string;
    amount: number;
    tokenType: number;
    invoiceType: number;
    walletType: number;
    status: string | number;
    memo?: string;
    creationTx?: string | null;
    paymentTxIds?: string[];
    items?: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
    donations?: {
        credits: number;
        usdcx: number;
        usad: number;
    };
    owner?: string;
    salt?: string;
}

export interface CreditReportInput {
    merchantAddress: string;
    burnerAddress?: string | null;
    balances: WalletTokenBalance[];
    merchantStats: {
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
    invoices: ReportInvoice[];
    merchantReceipts: MerchantReceipt[];
    burnerMerchantReceipts: MerchantReceipt[];
    payerReceipts: PayerReceipt[];
}

export interface AuditReportInput extends CreditReportInput {
    programId: string;
}

export type AuditReportPerspective = 'merchant' | 'payer' | 'both';

export interface ReportOptions {
    filename?: string;
    includeMerchantAddress?: boolean;
    includeBurnerAddress?: boolean;
    includeMemo?: boolean;
    includeLineItems?: boolean;
    includeBalanceSnapshot?: boolean;
    includeIncomingReceipts?: boolean;
    includeOutgoingReceipts?: boolean;
    includeInvoiceAppendices?: boolean;
    auditPerspective?: AuditReportPerspective;
}

export interface AuditTokenTotals {
    credits: number;
    usdcx: number;
    usad: number;
}

export interface AuditReportSummary {
    invoices: number;
    incomingMerchantReceipts: number;
    outgoingPayerReceipts: number;
    totalEarnings: AuditTokenTotals;
    totalOutgoing: AuditTokenTotals;
}

export interface AuditPayloadInvoice {
    invoiceHash: string;
    status: string;
    tokenLabel: string;
    amountLabel: string;
    invoiceTypeLabel: string;
    walletLabel: string;
    memo?: string;
    lineItemsSummary?: string;
    owner?: string;
    salt?: string;
    creationTx?: string | null;
    paymentTxIds?: string[];
    items?: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
    relatedReceiptHashes?: string[];
}

export interface AuditPayloadReceipt {
    invoiceHash: string;
    receiptHash: string;
    tokenLabel: string;
    amountLabel: string;
    amount: number;
    merchant?: string;
}

export interface MerchantAuditPayload {
    version: '1.0.0';
    reportId: string;
    role: AuditReportPerspective;
    generatedAt: string;
    programId: string;
    merchantAddress?: string | null;
    burnerAddress?: string | null;
    disclosure: Required<Omit<ReportOptions, 'filename'>>;
    summary: AuditReportSummary;
    balances: Array<{ name: string; publicAmount: number; privateAmount: number }>;
    invoices: AuditPayloadInvoice[];
    incomingMerchantReceipts: AuditPayloadReceipt[];
    outgoingPayerReceipts: AuditPayloadReceipt[];
}

export interface MerchantAuditPackage {
    version: '1.0.0';
    packageType: 'nullpay_audit_report';
    reportId: string;
    role: AuditReportPerspective;
    filename: string;
    generatedAt: string;
    signerAddress: string;
    auditKeyHash: string;
    payloadHash: string;
    signatureMessage: string | null;
    signature?: string | null;
    signatureBase64: string | null;
    encryption: {
        algorithm: 'AES-GCM';
        iv: string;
        ciphertext: string;
    };
    disclosure: Required<Omit<ReportOptions, 'filename'>>;
    summary: AuditReportSummary;
}

export interface MerchantAuditBundle {
    auditPackage: MerchantAuditPackage;
    packageJson?: string;
    packageFilename?: string;
    auditKey: string;
    auditKeyFilename?: string;
    // Add compatibility with pdf bundle
    html?: string;
    htmlFilename?: string;
}

export interface VerifiedMerchantAuditPackage {
    auditPackage?: MerchantAuditPackage; // Add for compatibility
    payload: MerchantAuditPayload;
    signatureStatus: 'verified' | 'missing' | 'invalid';
}
