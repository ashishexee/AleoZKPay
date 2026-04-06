import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MerchantReceipt, PayerReceipt } from './aleo-utils';
import type { WalletTokenBalance } from '../hooks/useWalletBalances';
import { getTokenLabel } from './tokens';

interface InvoiceItem {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
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
    items?: InvoiceItem[];
    donations?: {
        credits: number;
        usdcx: number;
        usad: number;
    };
    owner?: string;
    salt?: string;
}

interface MerchantStatsSnapshot {
    mainCredits: string;
    mainUSDCx: string;
    mainUSAD: string;
    burnerCredits: string;
    burnerUSDCx: string;
    burnerUSAD: string;
    invoices: number;
    settled: number;
    pending: number;
}

export interface CreditReportInput {
    merchantAddress: string;
    burnerAddress?: string | null;
    balances: WalletTokenBalance[];
    merchantStats: MerchantStatsSnapshot;
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
    items?: InvoiceItem[];
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
    signatureBase64: string | null;
    encryption: {
        algorithm: 'AES-GCM';
        iv: string;
        ciphertext: string;
    };
    disclosure: Required<Omit<ReportOptions, 'filename'>>;
    summary: AuditReportSummary;
}

export interface GeneratedMerchantAuditBundle {
    html: string;
    htmlFilename: string;
    auditPackage: MerchantAuditPackage;
    packageFilename: string;
    auditKey: string;
    auditKeyFilename: string;
}

export interface VerifiedMerchantAuditPackage {
    auditPackage: MerchantAuditPackage;
    payload: MerchantAuditPayload;
    signatureStatus: 'verified' | 'missing' | 'invalid';
}

const DARK: [number, number, number] = [10, 12, 18];
const CARD: [number, number, number] = [20, 24, 36];
const CARD_ALT: [number, number, number] = [25, 31, 45];
const WHITE: [number, number, number] = [242, 244, 248];
const MUTED: [number, number, number] = [145, 152, 168];
const ORANGE: [number, number, number] = [249, 115, 22];
const GREEN: [number, number, number] = [34, 197, 94];
const CYAN: [number, number, number] = [34, 211, 238];
const YELLOW: [number, number, number] = [250, 204, 21];
const RED: [number, number, number] = [248, 113, 113];

function normalizeStatus(status: string | number): string {
    if (typeof status === 'number') return status === 1 ? 'SETTLED' : status === 0 ? 'PENDING' : String(status);
    return String(status || 'UNKNOWN').toUpperCase();
}

function shortHash(value?: string | null, left = 10, right = 8): string {
    if (!value) return '-';
    if (value.length <= left + right + 3) return value;
    return `${value.slice(0, left)}...${value.slice(-right)}`;
}

function units(amount: number): string {
    return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

function micro(amount: number): string {
    return units(amount / 1_000_000);
}

function list<T>(value: T[] | undefined | null): T[] {
    return Array.isArray(value) ? value : [];
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string): T[] {
    const seen = new Set<string>();
    return items.filter((item) => {
        const key = getKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function createTokenTotals(): AuditTokenTotals {
    return { credits: 0, usdcx: 0, usad: 0 };
}

function addReceiptAmount(totals: AuditTokenTotals, tokenType: number, amountMicro: number): void {
    const amount = Number(amountMicro || 0) / 1_000_000;
    if (tokenType === 1) totals.usdcx += amount;
    else if (tokenType === 2) totals.usad += amount;
    else totals.credits += amount;
}

function sumMerchantReceiptTotals(receipts: MerchantReceipt[]): AuditTokenTotals {
    return receipts.reduce((totals, receipt) => {
        addReceiptAmount(totals, receipt.tokenType, receipt.amount);
        return totals;
    }, createTokenTotals());
}

function sumPayerReceiptTotals(receipts: PayerReceipt[]): AuditTokenTotals {
    return receipts.reduce((totals, receipt) => {
        addReceiptAmount(totals, receipt.tokenType, receipt.amount);
        return totals;
    }, createTokenTotals());
}

function buildCreditSnapshot(input: CreditReportInput) {
    const invoices = list(input.invoices);
    const merchantReceipts = uniqueBy([...list(input.merchantReceipts), ...list(input.burnerMerchantReceipts)], (r) => r.receiptHash);
    const payerReceipts = uniqueBy(list(input.payerReceipts), (r) => r.receiptHash);
    const settled = invoices.filter((invoice) => normalizeStatus(invoice.status) === 'SETTLED');
    const pending = invoices.filter((invoice) => normalizeStatus(invoice.status) === 'PENDING');
    const settleRate = invoices.length ? (settled.length / invoices.length) * 100 : 0;
    const receiptCoverage = settled.length ? Math.min((merchantReceipts.length / settled.length) * 100, 100) : 0;
    const historyScore = Math.min(invoices.length * 8, 100);
    const anchorScore = invoices.length
        ? ((invoices.filter((i) => i.creationTx).length + invoices.filter((i) => list(i.paymentTxIds).length > 0).length) / (invoices.length * 2)) * 100
        : 0;
    const score = Math.round(settleRate * 0.45 + receiptCoverage * 0.2 + historyScore * 0.2 + anchorScore * 0.15);
    const grade = score >= 95 ? 'A+' : score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : 'D';

    return {
        score,
        grade,
        totals: {
            invoices: invoices.length,
            settled: settled.length,
            pending: pending.length,
            merchantReceipts: merchantReceipts.length,
            payerReceipts: payerReceipts.length,
            invoiceVolume: invoices.reduce((sum, invoice) => sum + (Number(invoice.amount) || 0), 0),
            settledVolume: settled.reduce((sum, invoice) => sum + (Number(invoice.amount) || 0), 0),
            merchantReceiptVolume: merchantReceipts.reduce((sum, receipt) => sum + receipt.amount, 0) / 1_000_000,
            payerReceiptVolume: payerReceipts.reduce((sum, receipt) => sum + receipt.amount, 0) / 1_000_000
        },
        breakdown: [
            ['Settlement performance', '45%', `${Math.round(settleRate)}/100`],
            ['Receipt coverage', '20%', `${Math.round(receiptCoverage)}/100`],
            ['Invoice history depth', '20%', `${Math.round(historyScore)}/100`],
            ['Transaction anchors', '15%', `${Math.round(anchorScore)}/100`]
        ]
    };
}

function baseDoc(): jsPDF {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFillColor(...DARK);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');
    return doc;
}

function pageWidth(doc: jsPDF): number {
    return doc.internal.pageSize.getWidth();
}

function pageHeight(doc: jsPDF): number {
    return doc.internal.pageSize.getHeight();
}

function addPageTheme(doc: jsPDF) {
    doc.setFillColor(...DARK);
    doc.rect(0, 0, pageWidth(doc), pageHeight(doc), 'F');
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
    if (y + needed <= pageHeight(doc) - 20) return y;
    doc.addPage();
    addPageTheme(doc);
    return 24;
}

function addHeader(doc: jsPDF, title: string, subtitle: string, merchantAddress: string): number {
    const margin = 18;
    doc.setFillColor(...CARD);
    doc.roundedRect(margin, margin, pageWidth(doc) - margin * 2, 34, 5, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...WHITE);
    doc.text(title, margin + 6, margin + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(subtitle, margin + 6, margin + 20);
    doc.text(`Merchant: ${shortHash(merchantAddress, 16, 10)}`, margin + 6, margin + 26);
    doc.text(new Date().toLocaleString(), pageWidth(doc) - margin - 5, margin + 12, { align: 'right' });
    return 60;
}

function addSectionTitle(doc: jsPDF, y: number, title: string) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text(title, 18, y);
}

function addMetricCards(doc: jsPDF, y: number, cards: Array<{ label: string; value: string; color?: [number, number, number] }>): number {
    const margin = 18;
    const gap = 4;
    const width = (pageWidth(doc) - margin * 2 - gap * (cards.length - 1)) / cards.length;
    cards.forEach((card, index) => {
        const x = margin + index * (width + gap);
        doc.setFillColor(...CARD_ALT);
        doc.roundedRect(x, y, width, 20, 4, 4, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(card.label.toUpperCase(), x + 4, y + 7);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...(card.color || WHITE));
        doc.text(card.value, x + 4, y + 15);
    });
    return y + 26;
}

function addFooter(doc: jsPDF, note: string) {
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
        doc.setPage(page);
        doc.setDrawColor(40, 44, 60);
        doc.setLineWidth(0.2);
        doc.line(18, pageHeight(doc) - 12, pageWidth(doc) - 18, pageHeight(doc) - 12);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(note, 18, pageHeight(doc) - 7);
        doc.text(`Page ${page} / ${pages}`, pageWidth(doc) - 18, pageHeight(doc) - 7, { align: 'right' });
    }
}

function runTable(doc: jsPDF, options: Record<string, unknown>) {
    runTable(doc, {
        willDrawPage: () => addPageTheme(doc),
        ...options
    });
}

export async function generateMerchantCreditReportPdf(input: CreditReportInput): Promise<void> {
    const doc = baseDoc();
    let y = addHeader(
        doc,
        'NullPay Merchant Credit Report',
        'Profile-based credit snapshot for sharing with partners and counterparties',
        input.merchantAddress
    );

    const snapshot = buildCreditSnapshot(input);
    const incomingReceipts = uniqueBy(
        [...list(input.merchantReceipts), ...list(input.burnerMerchantReceipts)],
        (receipt) => receipt.receiptHash
    );
    const outgoingReceipts = uniqueBy(list(input.payerReceipts), (receipt) => receipt.receiptHash);

    y = addMetricCards(doc, y, [
        { label: 'Credit Grade', value: snapshot.grade, color: snapshot.score >= 85 ? GREEN : snapshot.score >= 70 ? CYAN : snapshot.score >= 55 ? YELLOW : RED },
        { label: 'Credit Score', value: `${snapshot.score}/100`, color: ORANGE },
        { label: 'Created Invoices', value: String(snapshot.totals.invoices) },
        { label: 'Settled Invoices', value: String(snapshot.totals.settled), color: GREEN }
    ]);

    addSectionTitle(doc, y, 'Merchant Identity');
    runTable(doc, {
        startY: y + 4,
        margin: { left: 18, right: 18 },
        head: [['Field', 'Value']],
        body: [
            ['Main wallet', input.merchantAddress],
            ['Burner wallet', input.burnerAddress || 'Not configured'],
            ['Incoming merchant receipts', String(snapshot.totals.merchantReceipts)],
            ['Outgoing payer receipts', String(snapshot.totals.payerReceipts)]
        ],
        theme: 'plain',
        styles: { fillColor: CARD as [number, number, number], textColor: WHITE as [number, number, number], lineColor: [40, 44, 60] as [number, number, number], lineWidth: 0.2, fontSize: 8, cellPadding: 3.5 },
        headStyles: { fillColor: [28, 34, 50] as [number, number, number], textColor: ORANGE as [number, number, number], fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: 'auto' } }
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    y = ensureSpace(doc, y, 40);
    addSectionTitle(doc, y, 'Score Breakdown');
    runTable(doc, {
        startY: y + 4,
        margin: { left: 18, right: 18 },
        head: [['Metric', 'Weight', 'Score']],
        body: snapshot.breakdown,
        theme: 'plain',
        styles: { fillColor: CARD as [number, number, number], textColor: WHITE as [number, number, number], lineColor: [40, 44, 60] as [number, number, number], lineWidth: 0.2, fontSize: 8, cellPadding: 3.5 },
        headStyles: { fillColor: [28, 34, 50] as [number, number, number], textColor: CYAN as [number, number, number], fontStyle: 'bold' }
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    y = ensureSpace(doc, y, 42);
    addSectionTitle(doc, y, 'Operational Metrics');
    runTable(doc, {
        startY: y + 4,
        margin: { left: 18, right: 18 },
        head: [['Metric', 'Value']],
        body: [
            ['Pending invoices', String(snapshot.totals.pending)],
            ['Invoice volume', `${units(snapshot.totals.invoiceVolume)} total`],
            ['Settled invoice volume', `${units(snapshot.totals.settledVolume)} total`],
            ['Incoming merchant receipt volume', `${units(snapshot.totals.merchantReceiptVolume)} total`],
            ['Outgoing payer receipt volume', `${units(snapshot.totals.payerReceiptVolume)} total`],
            ['Main wallet credits volume', input.merchantStats.mainCredits],
            ['Burner wallet credits volume', input.merchantStats.burnerCredits]
        ],
        theme: 'plain',
        styles: { fillColor: CARD as [number, number, number], textColor: WHITE as [number, number, number], lineColor: [40, 44, 60] as [number, number, number], lineWidth: 0.2, fontSize: 8, cellPadding: 3.5 },
        headStyles: { fillColor: [28, 34, 50] as [number, number, number], textColor: GREEN as [number, number, number], fontStyle: 'bold' }
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    y = ensureSpace(doc, y, 34);
    addSectionTitle(doc, y, 'Wallet Balance Snapshot');
    runTable(doc, {
        startY: y + 4,
        margin: { left: 18, right: 18 },
        head: [['Asset', 'Public', 'Private']],
        body: input.balances.map((balance) => [balance.name, units(balance.publicAmount), units(balance.privateAmount)]),
        theme: 'plain',
        styles: { fillColor: CARD as [number, number, number], textColor: WHITE as [number, number, number], lineColor: [40, 44, 60] as [number, number, number], lineWidth: 0.2, fontSize: 8, cellPadding: 3.5 },
        headStyles: { fillColor: [28, 34, 50] as [number, number, number], textColor: YELLOW as [number, number, number], fontStyle: 'bold' }
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    y = ensureSpace(doc, y, 45);
    addSectionTitle(doc, y, 'Invoice Portfolio');
    runTable(doc, {
        startY: y + 4,
        margin: { left: 18, right: 18 },
        head: [['Invoice', 'Status', 'Type', 'Token', 'Amount', 'Receipt Hashes']],
        body: input.invoices.map((invoice) => {
            const receiptCount = incomingReceipts.filter((receipt) => receipt.invoiceHash === invoice.invoiceHash).length;
            return [
                shortHash(invoice.invoiceHash),
                normalizeStatus(invoice.status),
                invoice.invoiceType === 2 ? 'Donation' : invoice.invoiceType === 1 ? 'Multi Pay' : 'Standard',
                getTokenLabel(invoice.tokenType, invoice.invoiceType),
                invoice.invoiceType === 2 && invoice.donations
                    ? `${units(invoice.donations.credits + invoice.donations.usdcx + invoice.donations.usad)} mixed`
                    : units(invoice.amount),
                String(receiptCount)
            ];
        }),
        theme: 'plain',
        styles: { fillColor: CARD as [number, number, number], textColor: WHITE as [number, number, number], lineColor: [40, 44, 60] as [number, number, number], lineWidth: 0.2, fontSize: 7.5, cellPadding: 3 },
        headStyles: { fillColor: [28, 34, 50] as [number, number, number], textColor: ORANGE as [number, number, number], fontStyle: 'bold' }
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    y = ensureSpace(doc, y, 40);
    addSectionTitle(doc, y, 'Receipt Hash Registry');
    const receiptRows: string[][] = [];
    incomingReceipts.slice(0, 40).forEach((receipt) => {
        receiptRows.push(['Merchant receipt', shortHash(receipt.invoiceHash), shortHash(receipt.receiptHash, 12, 10), `${micro(receipt.amount)} ${getTokenLabel(receipt.tokenType)}`]);
    });
    outgoingReceipts.slice(0, 20).forEach((receipt) => {
        receiptRows.push(['Payer receipt', shortHash(receipt.invoiceHash), shortHash(receipt.receiptHash, 12, 10), `${micro(receipt.amount)} ${getTokenLabel(receipt.tokenType)}`]);
    });
    runTable(doc, {
        startY: y + 4,
        margin: { left: 18, right: 18 },
        head: [['Type', 'Invoice', 'Receipt Hash', 'Amount']],
        body: receiptRows.length ? receiptRows : [['No receipts found', '-', '-', '-']],
        theme: 'plain',
        styles: { fillColor: CARD as [number, number, number], textColor: WHITE as [number, number, number], lineColor: [40, 44, 60] as [number, number, number], lineWidth: 0.2, fontSize: 7.5, cellPadding: 3 },
        headStyles: { fillColor: [28, 34, 50] as [number, number, number], textColor: CYAN as [number, number, number], fontStyle: 'bold' }
    });

    addFooter(doc, 'NullPay merchant credit report');
    doc.save(`NullPay_Credit_Report_${shortHash(input.merchantAddress, 8, 6).replace('...', '_')}.pdf`);
}

export async function generateMerchantAuditReportPdf(input: AuditReportInput): Promise<void> {
    const doc = baseDoc();
    let y = addHeader(
        doc,
        'NullPay Merchant Audit Report',
        'Detailed operational export for third-party review and audit preparation',
        input.merchantAddress
    );

    const incomingReceipts = uniqueBy(
        [...list(input.merchantReceipts), ...list(input.burnerMerchantReceipts)],
        (receipt) => receipt.receiptHash
    );
    const outgoingReceipts = uniqueBy(list(input.payerReceipts), (receipt) => receipt.receiptHash);
    const invoices = [...list(input.invoices)].sort((left, right) => left.invoiceHash.localeCompare(right.invoiceHash));

    y = addMetricCards(doc, y, [
        { label: 'Invoices', value: String(invoices.length) },
        { label: 'Merchant Receipts', value: String(incomingReceipts.length), color: GREEN },
        { label: 'Outgoing Receipts', value: String(outgoingReceipts.length), color: CYAN },
        { label: 'Program', value: shortHash(input.programId, 8, 8), color: ORANGE }
    ]);

    addSectionTitle(doc, y, 'Audit Report Metadata');
    runTable(doc, {
        startY: y + 4,
        margin: { left: 18, right: 18 },
        head: [['Field', 'Value']],
        body: [
            ['Program ID', input.programId],
            ['Main merchant wallet', input.merchantAddress],
            ['Burner wallet', input.burnerAddress || 'Not configured'],
            ['Generated at', new Date().toISOString()],
            ['Audit scope', 'Merchant profile export with invoice, receipt, and transaction evidence'],
            ['Current mode', 'Wallet-visible records plus NullPay backend invoice metadata']
        ],
        theme: 'plain',
        styles: { fillColor: CARD as [number, number, number], textColor: WHITE as [number, number, number], lineColor: [40, 44, 60] as [number, number, number], lineWidth: 0.2, fontSize: 8, cellPadding: 3.5 },
        headStyles: { fillColor: [28, 34, 50] as [number, number, number], textColor: ORANGE as [number, number, number], fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 44 }, 1: { cellWidth: 'auto' } }
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    y = ensureSpace(doc, y, 34);
    addSectionTitle(doc, y, 'Balance Snapshot');
    runTable(doc, {
        startY: y + 4,
        margin: { left: 18, right: 18 },
        head: [['Asset', 'Public', 'Private']],
        body: input.balances.map((balance) => [balance.name, units(balance.publicAmount), units(balance.privateAmount)]),
        theme: 'plain',
        styles: { fillColor: CARD as [number, number, number], textColor: WHITE as [number, number, number], lineColor: [40, 44, 60] as [number, number, number], lineWidth: 0.2, fontSize: 8, cellPadding: 3.5 },
        headStyles: { fillColor: [28, 34, 50] as [number, number, number], textColor: YELLOW as [number, number, number], fontStyle: 'bold' }
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    y = ensureSpace(doc, y, 50);
    addSectionTitle(doc, y, 'Invoice Register');
    runTable(doc, {
        startY: y + 4,
        margin: { left: 18, right: 18 },
        head: [['Invoice', 'Status', 'Token', 'Amount', 'Type', 'Wallet', 'Create Tx', 'Payment Txs']],
        body: invoices.map((invoice) => [
            shortHash(invoice.invoiceHash),
            normalizeStatus(invoice.status),
            getTokenLabel(invoice.tokenType, invoice.invoiceType),
            invoice.invoiceType === 2 && invoice.donations
                ? `${units(invoice.donations.credits + invoice.donations.usdcx + invoice.donations.usad)} mixed`
                : units(invoice.amount),
            invoice.invoiceType === 2 ? 'Donation' : invoice.invoiceType === 1 ? 'Multi Pay' : 'Standard',
            invoice.walletType === 1 ? 'Burner' : 'Main',
            invoice.creationTx ? 'Yes' : 'No',
            String(list(invoice.paymentTxIds).length)
        ]),
        theme: 'plain',
        styles: { fillColor: CARD as [number, number, number], textColor: WHITE as [number, number, number], lineColor: [40, 44, 60] as [number, number, number], lineWidth: 0.2, fontSize: 7, cellPadding: 2.8 },
        headStyles: { fillColor: [28, 34, 50] as [number, number, number], textColor: CYAN as [number, number, number], fontStyle: 'bold' }
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    y = ensureSpace(doc, y, 48);
    addSectionTitle(doc, y, 'Incoming Merchant Receipts');
    runTable(doc, {
        startY: y + 4,
        margin: { left: 18, right: 18 },
        head: [['Invoice', 'Receipt Hash', 'Owner', 'Token', 'Amount']],
        body: incomingReceipts.length
            ? incomingReceipts.map((receipt) => [shortHash(receipt.invoiceHash), shortHash(receipt.receiptHash, 12, 10), shortHash(receipt.owner, 12, 8), getTokenLabel(receipt.tokenType), micro(receipt.amount)])
            : [['No merchant receipts found', '-', '-', '-', '-']],
        theme: 'plain',
        styles: { fillColor: CARD as [number, number, number], textColor: WHITE as [number, number, number], lineColor: [40, 44, 60] as [number, number, number], lineWidth: 0.2, fontSize: 7, cellPadding: 2.8 },
        headStyles: { fillColor: [28, 34, 50] as [number, number, number], textColor: GREEN as [number, number, number], fontStyle: 'bold' }
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    y = ensureSpace(doc, y, 48);
    addSectionTitle(doc, y, 'Outgoing Payer Receipts');
    runTable(doc, {
        startY: y + 4,
        margin: { left: 18, right: 18 },
        head: [['Invoice', 'Receipt Hash', 'Merchant', 'Token', 'Amount']],
        body: outgoingReceipts.length
            ? outgoingReceipts.map((receipt) => [shortHash(receipt.invoiceHash), shortHash(receipt.receiptHash, 12, 10), shortHash(receipt.merchant, 12, 8), getTokenLabel(receipt.tokenType), micro(receipt.amount)])
            : [['No payer receipts found', '-', '-', '-', '-']],
        theme: 'plain',
        styles: { fillColor: CARD as [number, number, number], textColor: WHITE as [number, number, number], lineColor: [40, 44, 60] as [number, number, number], lineWidth: 0.2, fontSize: 7, cellPadding: 2.8 },
        headStyles: { fillColor: [28, 34, 50] as [number, number, number], textColor: YELLOW as [number, number, number], fontStyle: 'bold' }
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    y = ensureSpace(doc, y, 48);
    addSectionTitle(doc, y, 'Invoice Evidence Checklist');
    autoTable(doc, {
        startY: y + 4,
        margin: { left: 18, right: 18 },
        head: [['Invoice', 'Salt', 'Memo', 'Items', 'Create Tx', 'Payment Txs', 'Receipt Hashes']],
        body: invoices.map((invoice) => [
            shortHash(invoice.invoiceHash),
            invoice.salt ? 'Yes' : 'No',
            invoice.memo ? 'Yes' : 'No',
            list(invoice.items).length ? String(list(invoice.items).length) : '0',
            invoice.creationTx ? 'Yes' : 'No',
            list(invoice.paymentTxIds).length ? String(list(invoice.paymentTxIds).length) : '0',
            String(incomingReceipts.filter((receipt) => receipt.invoiceHash === invoice.invoiceHash).length)
        ]),
        theme: 'plain',
        styles: { fillColor: CARD as [number, number, number], textColor: WHITE as [number, number, number], lineColor: [40, 44, 60] as [number, number, number], lineWidth: 0.2, fontSize: 7, cellPadding: 2.8 },
        headStyles: { fillColor: [28, 34, 50] as [number, number, number], textColor: ORANGE as [number, number, number], fontStyle: 'bold' }
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    for (const invoice of invoices) {
        y = ensureSpace(doc, y, 68);
        addSectionTitle(doc, y, `Invoice Appendix: ${shortHash(invoice.invoiceHash, 12, 10)}`);
        runTable(doc, {
            startY: y + 4,
            margin: { left: 18, right: 18 },
            head: [['Field', 'Value']],
            body: [
                ['Invoice hash', invoice.invoiceHash],
                ['Status', normalizeStatus(invoice.status)],
                ['Token', getTokenLabel(invoice.tokenType, invoice.invoiceType)],
                ['Amount', invoice.invoiceType === 2 && invoice.donations ? `${units(invoice.donations.credits + invoice.donations.usdcx + invoice.donations.usad)} mixed` : units(invoice.amount)],
                ['Invoice type', invoice.invoiceType === 2 ? 'Donation' : invoice.invoiceType === 1 ? 'Multi Pay' : 'Standard'],
                ['Receiving wallet', invoice.walletType === 1 ? 'Burner wallet' : 'Main wallet'],
                ['Owner', invoice.owner || '-'],
                ['Salt', invoice.salt || '-'],
                ['Memo', invoice.memo || '-'],
                ['Creation transaction', invoice.creationTx || '-'],
                ['Payment transaction IDs', list(invoice.paymentTxIds).join('\n') || '-']
            ],
            theme: 'plain',
            styles: { fillColor: CARD as [number, number, number], textColor: WHITE as [number, number, number], lineColor: [40, 44, 60] as [number, number, number], lineWidth: 0.2, fontSize: 7.5, cellPadding: 3 },
            headStyles: { fillColor: [28, 34, 50] as [number, number, number], textColor: CYAN as [number, number, number], fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: 'auto' } }
        });
        y = (doc as any).lastAutoTable.finalY + 4;

        const relatedReceipts = incomingReceipts.filter((receipt) => receipt.invoiceHash === invoice.invoiceHash);
        if (relatedReceipts.length) {
            y = ensureSpace(doc, y, 28);
            runTable(doc, {
                startY: y,
                margin: { left: 24, right: 18 },
                head: [['Related merchant receipt hashes', 'Amount']],
                body: relatedReceipts.map((receipt) => [receipt.receiptHash, `${micro(receipt.amount)} ${getTokenLabel(receipt.tokenType)}`]),
                theme: 'plain',
                styles: { fillColor: CARD_ALT as [number, number, number], textColor: WHITE as [number, number, number], lineColor: [40, 44, 60] as [number, number, number], lineWidth: 0.2, fontSize: 7, cellPadding: 2.6 },
                headStyles: { fillColor: [31, 40, 56] as [number, number, number], textColor: GREEN as [number, number, number], fontStyle: 'bold' }
            });
            y = (doc as any).lastAutoTable.finalY + 4;
        }

        if (list(invoice.items).length) {
            y = ensureSpace(doc, y, 28);
            runTable(doc, {
                startY: y,
                margin: { left: 24, right: 18 },
                head: [['Line Item', 'Qty', 'Unit Price', 'Total']],
                body: list(invoice.items).map((item) => [item.name || 'Unnamed item', String(item.quantity), units(item.unitPrice), units(item.total)]),
                theme: 'plain',
                styles: { fillColor: CARD_ALT as [number, number, number], textColor: WHITE as [number, number, number], lineColor: [40, 44, 60] as [number, number, number], lineWidth: 0.2, fontSize: 7, cellPadding: 2.6 },
                headStyles: { fillColor: [31, 40, 56] as [number, number, number], textColor: YELLOW as [number, number, number], fontStyle: 'bold' }
            });
            y = (doc as any).lastAutoTable.finalY + 6;
        } else {
            y += 4;
        }
    }

    y = ensureSpace(doc, y, 22);
    addSectionTitle(doc, y, 'Report Note');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
        'This export packages the merchant-visible evidence currently available in NullPay: wallet records, receipt hashes, invoice metadata, and transaction references. Chain-side selective disclosure packages and audit authorization anchors are not yet part of the current NullPay contract.',
        18,
        y + 6,
        { maxWidth: pageWidth(doc) - 36 }
    );

    addFooter(doc, 'NullPay merchant audit report');
    doc.save(`NullPay_Audit_Report_${shortHash(input.merchantAddress, 8, 6).replace('...', '_')}.pdf`);
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function explorerUrl(txId: string): string {
    return `https://testnet.explorer.provable.com/transaction/${encodeURIComponent(txId)}`;
}

function reportThemeCss(): string {
    return `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap');
        :root {
            color-scheme: dark;
            --bg: #000000;
            --surface: rgba(10, 10, 10, 0.72);
            --surface-strong: rgba(9, 11, 18, 0.9);
            --border: rgba(255, 255, 255, 0.1);
            --text: #f8fafc;
            --muted: #9ca3af;
            --orange: #f97316;
            --orange-soft: #fdba74;
            --cyan: #67e8f9;
            --shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
        }
        * { box-sizing: border-box; }
        html { background: var(--bg); }
        body {
            margin: 0;
            min-height: 100vh;
            font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
            color: var(--text);
            background-color: var(--bg);
            background-image:
                radial-gradient(circle at 10% 18%, rgba(249, 115, 22, 0.16), transparent 28%),
                radial-gradient(circle at 84% 14%, rgba(251, 191, 36, 0.1), transparent 22%),
                radial-gradient(circle at 68% 84%, rgba(255, 255, 255, 0.06), transparent 24%),
                radial-gradient(circle at 24% 78%, rgba(249, 115, 22, 0.08), transparent 22%);
        }
        body::before {
            content: '';
            position: fixed;
            inset: 0;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
            opacity: 0.035;
            pointer-events: none;
        }
        body::after {
            content: '';
            position: fixed;
            inset: -10% auto auto -10%;
            width: 42vw;
            height: 42vw;
            max-width: 520px;
            max-height: 520px;
            border-radius: 999px;
            background: radial-gradient(circle, rgba(249, 115, 22, 0.18), transparent 64%);
            filter: blur(30px);
            pointer-events: none;
        }
        main {
            position: relative;
            z-index: 1;
            max-width: 1240px;
            margin: 0 auto;
            padding: 28px 18px 56px;
        }
        h1, h2, h3, h4 { margin: 0; }
        p {
            color: #b0b7c5;
            line-height: 1.7;
            margin: 0;
        }
        a {
            color: var(--cyan);
            text-decoration: none;
        }
        a:hover { text-decoration: underline; }
        code {
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 12px;
            word-break: break-all;
            color: #fef3c7;
        }
        .hero,
        .panel,
        .card,
        .invoice-section {
            position: relative;
            overflow: hidden;
            border-radius: 28px;
            border: 1px solid var(--border);
            background:
                linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01)),
                linear-gradient(180deg, rgba(8, 10, 16, 0.92), rgba(3, 5, 10, 0.92));
            box-shadow: var(--shadow);
            backdrop-filter: blur(22px);
        }
        .hero::before,
        .panel::before,
        .card::before,
        .invoice-section::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(120deg, rgba(255, 255, 255, 0.05), transparent 36%, transparent 70%, rgba(249, 115, 22, 0.06));
            pointer-events: none;
        }
        .hero {
            display: grid;
            grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.7fr);
            gap: 14px;
            padding: 22px 24px;
            margin-bottom: 16px;
            border-color: rgba(249, 115, 22, 0.14);
        }
        .hero-copy,
        .hero-side {
            position: relative;
            z-index: 1;
        }
        .hero-side {
            display: grid;
            gap: 12px;
            align-content: start;
        }
        .eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 7px 11px;
            border-radius: 999px;
            border: 1px solid rgba(249, 115, 22, 0.2);
            background: rgba(249, 115, 22, 0.08);
            color: var(--orange-soft);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            margin-bottom: 12px;
        }
        .hero h1 {
            font-size: clamp(1.9rem, 3.4vw, 3.35rem);
            line-height: 0.98;
            letter-spacing: -0.05em;
        }
        .title-accent {
            background: linear-gradient(90deg, #fb923c 0%, #fdba74 45%, #f97316 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            filter: drop-shadow(0 0 15px rgba(249, 115, 22, 0.3));
        }
        .hero p {
            max-width: 700px;
            margin-top: 10px;
            font-size: 0.95rem;
        }
        .hero-chip {
            position: relative;
            z-index: 1;
            padding: 12px 14px;
            border-radius: 18px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
        }
        .hero-chip span {
            display: block;
            margin-bottom: 5px;
            color: var(--muted);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.14em;
            text-transform: uppercase;
        }
        .hero-chip strong {
            display: block;
            font-size: 0.95rem;
            color: var(--text);
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
            gap: 10px;
            margin: 0 0 20px;
        }
        .card {
            padding: 14px 16px;
            border-radius: 20px;
            border-color: rgba(255, 255, 255, 0.08);
        }
        .label,
        .muted {
            display: block;
            color: var(--muted);
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.18em;
            margin-bottom: 8px;
        }
        .value {
            font-size: 1.02rem;
            font-weight: 700;
            letter-spacing: -0.03em;
            line-height: 1.35;
        }
        .value.compact {
            font-size: 0.92rem;
            line-height: 1.45;
        }
        .value-row {
            display: flex;
            align-items: center;
            gap: 8px;
            justify-content: space-between;
        }
        .value-row .value {
            flex: 1;
            min-width: 0;
        }
        .value-row .copy-btn {
            margin-left: 0;
            padding: 4px 9px;
            font-size: 10px;
            flex-shrink: 0;
        }
        .break { word-break: break-word; }
        .panel {
            padding: 22px;
            margin-bottom: 18px;
        }
        .panel h2 {
            font-size: 1.08rem;
            letter-spacing: -0.02em;
            margin-bottom: 12px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th,
        td {
            text-align: left;
            padding: 14px 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            vertical-align: top;
        }
        th {
            color: #fb923c;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.18em;
        }
        tbody tr:hover td {
            background: rgba(255, 255, 255, 0.018);
        }
        .copy-btn {
            margin-left: 8px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(15, 23, 42, 0.72);
            color: #f8fafc;
            border-radius: 999px;
            padding: 5px 10px;
            font: inherit;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
        }
        .copy-btn:hover {
            transform: translateY(-1px);
            border-color: rgba(249, 115, 22, 0.35);
            background: rgba(249, 115, 22, 0.12);
            box-shadow: 0 10px 28px rgba(249, 115, 22, 0.16);
        }
        .invoice-section {
            padding: 22px;
            margin-bottom: 16px;
        }
        .section-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 18px;
        }
        .badge {
            border: 1px solid rgba(103, 232, 249, 0.24);
            border-radius: 999px;
            padding: 7px 12px;
            font-size: 12px;
            font-weight: 700;
            color: var(--cyan);
            background: rgba(103, 232, 249, 0.08);
        }
        .details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 16px;
            margin-bottom: 18px;
        }
        .subsection {
            margin-top: 18px;
        }
        .subsection h4 {
            margin-bottom: 10px;
            color: var(--text);
            font-size: 0.96rem;
        }
        .pill-list {
            list-style: none;
            padding: 0;
            margin: 0;
            display: grid;
            gap: 8px;
        }
        .pill-list li {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 14px;
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(15, 23, 42, 0.56);
        }
        .empty {
            color: var(--muted);
            font-style: italic;
        }
        .note {
            margin-top: 20px;
            font-size: 14px;
        }
        @media (max-width: 900px) {
            .hero {
                grid-template-columns: 1fr;
                padding: 20px;
            }
            .details-grid {
                grid-template-columns: 1fr;
            }
        }
        @media (max-width: 640px) {
            main {
                padding: 24px 14px 56px;
            }
            .panel,
            .invoice-section,
            .card {
                border-radius: 22px;
            }
            th,
            td {
                padding: 12px 8px;
            }
            .value {
                font-size: 0.95rem;
            }
            .pill-list li {
                align-items: flex-start;
                flex-direction: column;
            }
        }
    `;
}

function buildReportHero(
    eyebrow: string,
    title: string,
    accent: string,
    description: string,
    chips: Array<{ label: string; value: string }>
): string {
    const chipHtml = chips.map((chip) => `
        <div class="hero-chip">
            <span>${escapeHtml(chip.label)}</span>
            <strong>${escapeHtml(chip.value)}</strong>
        </div>
    `).join('');

    return `
        <section class="hero">
            <div class="hero-copy">
                <div class="eyebrow">${escapeHtml(eyebrow)}</div>
                <h1>${escapeHtml(title)} <span class="title-accent">${escapeHtml(accent)}</span></h1>
                <p>${escapeHtml(description)}</p>
            </div>
            <div class="hero-side">${chipHtml}</div>
        </section>
    `;
}

function summarizeItems(items?: InvoiceItem[]): string {
    const normalized = list(items).filter((item) => item && (item.name || item.quantity || item.total));
    if (!normalized.length) return 'No line items';
    return normalized
        .slice(0, 3)
        .map((item) => item.name || `Item x${item.quantity}`)
        .join(', ') + (normalized.length > 3 ? ` +${normalized.length - 3} more` : '');
}

export function downloadMerchantCreditReportHtml(input: CreditReportInput, options?: ReportOptions): void {
    const opts = {
        filename: options?.filename || `NullPay_Credit_Report_${shortHash(input.merchantAddress, 8, 6).replace('...', '_')}.html`,
        includeMerchantAddress: options?.includeMerchantAddress !== false,
        includeBurnerAddress: options?.includeBurnerAddress !== false,
        includeMemo: options?.includeMemo !== false,
        includeLineItems: options?.includeLineItems !== false,
        includeBalanceSnapshot: options?.includeBalanceSnapshot !== false,
        includeIncomingReceipts: options?.includeIncomingReceipts !== false,
        includeOutgoingReceipts: options?.includeOutgoingReceipts !== false,
        includeInvoiceAppendices: options?.includeInvoiceAppendices !== false
    };

    const snapshot = buildCreditSnapshot(input);
    const incomingReceipts = uniqueBy(
        [...list(input.merchantReceipts), ...list(input.burnerMerchantReceipts)],
        (receipt) => receipt.receiptHash
    );
    const outgoingReceipts = uniqueBy(list(input.payerReceipts), (receipt) => receipt.receiptHash);
    const invoices = [...list(input.invoices)].sort((left, right) => left.invoiceHash.localeCompare(right.invoiceHash));

    const cards = [
        ['Credit grade', snapshot.grade],
        ['Credit score', `${snapshot.score}/100`],
        ['Created invoices', String(snapshot.totals.invoices)],
        ['Settled invoices', String(snapshot.totals.settled)],
        ['Incoming receipts', String(snapshot.totals.merchantReceipts)],
        ['Outgoing receipts', String(snapshot.totals.payerReceipts)]
    ].map(([label, value]) => `
        <div class="card">
            <div class="label">${escapeHtml(label)}</div>
            <div class="value">${escapeHtml(value)}</div>
        </div>
    `).join('');

    const scoreRows = snapshot.breakdown.map((row) => `
        <tr>
            <td>${escapeHtml(row[0])}</td>
            <td>${escapeHtml(row[1])}</td>
            <td>${escapeHtml(row[2])}</td>
        </tr>
    `).join('');

    const invoiceRows = invoices.map((invoice) => `
        <tr>
            <td><code>${escapeHtml(shortHash(invoice.invoiceHash, 14, 10))}</code><button class="copy-btn" data-copy="${escapeHtml(invoice.invoiceHash)}">Copy</button></td>
            <td>${escapeHtml(normalizeStatus(invoice.status))}</td>
            <td>${escapeHtml(getTokenLabel(invoice.tokenType, invoice.invoiceType))}</td>
            <td>${escapeHtml(invoice.invoiceType === 2 && invoice.donations ? `${units(invoice.donations.credits + invoice.donations.usdcx + invoice.donations.usad)} mixed` : units(invoice.amount))}</td>
            ${opts.includeMemo ? `<td>${escapeHtml(invoice.memo || '-')}</td>` : ''}
            ${opts.includeLineItems ? `<td>${escapeHtml(summarizeItems(invoice.items))}</td>` : ''}
        </tr>
    `).join('');

    const invoiceSections = invoices.map((invoice) => {
        const relatedReceipts = incomingReceipts.filter((receipt) => receipt.invoiceHash === invoice.invoiceHash);
        const relatedOutgoingReceipts = outgoingReceipts.filter((receipt) => receipt.invoiceHash === invoice.invoiceHash);
        const receiptList = relatedReceipts.map((receipt) => `
            <li>
                <code>${escapeHtml(shortHash(receipt.receiptHash, 14, 10))}</code>
                <button class="copy-btn" data-copy="${escapeHtml(receipt.receiptHash)}">Copy</button>
            </li>
        `).join('');
        const outgoingReceiptList = relatedOutgoingReceipts.map((receipt) => `
            <li>
                <code>${escapeHtml(shortHash(receipt.receiptHash, 14, 10))}</code>
                <button class="copy-btn" data-copy="${escapeHtml(receipt.receiptHash)}">Copy</button>
            </li>
        `).join('');
        const itemRows = list(invoice.items).map((item) => `
            <tr>
                <td>${escapeHtml(item.name || 'Unnamed item')}</td>
                <td>${escapeHtml(String(item.quantity))}</td>
                <td>${escapeHtml(units(item.unitPrice))}</td>
                <td>${escapeHtml(units(item.total))}</td>
            </tr>
        `).join('');
        return `
            <section class="invoice-section">
                <div class="section-head">
                    <h3>${escapeHtml(shortHash(invoice.invoiceHash, 14, 12))}</h3>
                    <span class="badge">${escapeHtml(normalizeStatus(invoice.status))}</span>
                </div>
                <div class="details-grid">
                    <div><span class="muted">Invoice hash</span><div><code>${escapeHtml(shortHash(invoice.invoiceHash, 14, 10))}</code><button class="copy-btn" data-copy="${escapeHtml(invoice.invoiceHash)}">Copy</button></div></div>
                    ${opts.includeMemo ? `<div><span class="muted">Memo</span><span>${escapeHtml(invoice.memo || '-')}</span></div>` : ''}
                    <div><span class="muted">Token</span><span>${escapeHtml(getTokenLabel(invoice.tokenType, invoice.invoiceType))}</span></div>
                    <div><span class="muted">Amount</span><span>${escapeHtml(invoice.invoiceType === 2 && invoice.donations ? `${units(invoice.donations.credits + invoice.donations.usdcx + invoice.donations.usad)} mixed` : units(invoice.amount))}</span></div>
                </div>
                ${opts.includeLineItems ? `
                <div class="subsection">
                    <h4>Line Items</h4>
                    ${itemRows ? `
                        <table>
                            <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                            <tbody>${itemRows}</tbody>
                        </table>
                    ` : '<p class="empty">No line items stored for this invoice.</p>'}
                </div>` : ''}
                ${opts.includeIncomingReceipts ? `
                <div class="subsection">
                    <h4>Incoming Merchant Receipt Hashes</h4>
                    ${receiptList ? `<ul class="pill-list">${receiptList}</ul>` : '<p class="empty">No incoming merchant receipt hashes recorded.</p>'}
                </div>` : ''}
                ${opts.includeOutgoingReceipts ? `
                <div class="subsection">
                    <h4>Outgoing Payer Receipt Hashes</h4>
                    ${outgoingReceiptList ? `<ul class="pill-list">${outgoingReceiptList}</ul>` : '<p class="empty">No outgoing payer receipt hashes recorded.</p>'}
                </div>` : ''}
            </section>
        `;
    }).join('');

    const hero = buildReportHero(
        'Merchant Credit Center',
        'NullPay',
        'Credit Report',
        'Interactive merchant credit report with the same dark glass-and-glow feel as the NullPay dashboard. It highlights invoice activity, receipt coverage, memo visibility, and item-level detail for easy sharing.',
        [
            { label: 'Export Type', value: 'Interactive HTML' },
            { label: 'Credit Grade', value: snapshot.grade },
            { label: 'Generated', value: new Date().toLocaleString() }
        ]
    );

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>NullPay Credit Report</title>
    <style>${reportThemeCss()}</style>
</head>
<body>
    <main>
        ${hero}
        <section class="grid">${cards}</section>
        <section class="panel">
            <h2>Score Breakdown</h2>
            <table>
                <thead><tr><th>Metric</th><th>Weight</th><th>Score</th></tr></thead>
                <tbody>${scoreRows}</tbody>
            </table>
        </section>
        <section class="panel">
            <h2>Invoice Register</h2>
            <table>
                <thead><tr><th>Invoice</th><th>Status</th><th>Token</th><th>Amount</th>${opts.includeMemo ? '<th>Memo</th>' : ''}${opts.includeLineItems ? '<th>Items</th>' : ''}</tr></thead>
                <tbody>${invoiceRows || '<tr><td colspan="8">No invoices found.</td></tr>'}</tbody>
            </table>
        </section>
        <section class="panel">
            <h2>Invoice Details</h2>
            <p>Each invoice section includes memo and visible item descriptions so the report can be reviewed without leaving the export.</p>
            ${invoiceSections || '<p class="empty">No invoice details available.</p>'}
        </section>
    </main>
    <script>
        (function () {
            function fallbackCopy(text) {
                const area = document.createElement('textarea');
                area.value = text;
                area.style.position = 'fixed';
                area.style.opacity = '0';
                document.body.appendChild(area);
                area.focus();
                area.select();
                try { document.execCommand('copy'); } catch (error) {}
                document.body.removeChild(area);
            }
            document.querySelectorAll('[data-copy]').forEach(function (button) {
                button.addEventListener('click', async function () {
                    const text = button.getAttribute('data-copy') || '';
                    try {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            await navigator.clipboard.writeText(text);
                        } else {
                            fallbackCopy(text);
                        }
                        const original = button.textContent;
                        button.textContent = 'Copied';
                        setTimeout(function () { button.textContent = original; }, 1200);
                    } catch (error) {
                        fallbackCopy(text);
                    }
                });
            });
        })();
    </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = opts.filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

export function buildMerchantAuditReportHtmlAsset(input: AuditReportInput, options?: ReportOptions): { html: string; filename: string } {
    const perspective = options?.auditPerspective === 'merchant' || options?.auditPerspective === 'payer' || options?.auditPerspective === 'both'
        ? options.auditPerspective
        : 'both';
    const roleLabel = perspective === 'merchant' ? 'Merchant' : perspective === 'payer' ? 'Payer' : 'Combined';
    const showMerchantView = perspective !== 'payer';
    const showPayerView = perspective !== 'merchant';
    const opts = {
        filename: options?.filename || `NullPay_Audit_Report_${shortHash(input.merchantAddress, 8, 6).replace('...', '_')}.html`,
        includeMerchantAddress: options?.includeMerchantAddress !== false,
        includeBurnerAddress: options?.includeBurnerAddress !== false,
        includeMemo: options?.includeMemo !== false,
        includeLineItems: options?.includeLineItems !== false,
        includeBalanceSnapshot: options?.includeBalanceSnapshot !== false,
        includeIncomingReceipts: options?.includeIncomingReceipts !== false,
        includeOutgoingReceipts: options?.includeOutgoingReceipts !== false,
        includeInvoiceAppendices: options?.includeInvoiceAppendices !== false,
        auditPerspective: perspective
    };

    const incomingReceipts = uniqueBy(
        [...list(input.merchantReceipts), ...list(input.burnerMerchantReceipts)],
        (receipt) => receipt.receiptHash
    );
    const outgoingReceipts = uniqueBy(list(input.payerReceipts), (receipt) => receipt.receiptHash);
    const invoices = [...list(input.invoices)].sort((left, right) => left.invoiceHash.localeCompare(right.invoiceHash));
    const totalEarnings = sumMerchantReceiptTotals(incomingReceipts);
    const totalOutgoing = sumPayerReceiptTotals(outgoingReceipts);

    const summaryCards = [
        { label: 'Prepared as', value: roleLabel, compact: false },
        { label: 'Program ID', value: shortHash(input.programId, 12, 8), compact: true },
        ...(opts.includeMerchantAddress ? [{ label: 'Main merchant wallet', value: shortHash(input.merchantAddress, 12, 8), compact: true, copyValue: input.merchantAddress }] : []),
        ...(opts.includeBurnerAddress ? [{ label: 'Burner wallet', value: input.burnerAddress ? shortHash(input.burnerAddress, 12, 8) : 'Not configured', compact: true, copyValue: input.burnerAddress || undefined }] : []),
        ...(showMerchantView ? [{ label: 'Invoices exported', value: String(invoices.length), compact: false }] : []),
        ...(showMerchantView ? [{ label: 'Incoming merchant receipts', value: String(incomingReceipts.length), compact: false }] : []),
        ...(showMerchantView ? [{ label: 'Total credits earned', value: units(totalEarnings.credits), compact: false }] : []),
        ...(showMerchantView ? [{ label: 'Total USDCx earned', value: units(totalEarnings.usdcx), compact: false }] : []),
        ...(showMerchantView ? [{ label: 'Total USAD earned', value: units(totalEarnings.usad), compact: false }] : []),
        ...(showPayerView ? [{ label: 'Outgoing payer receipts', value: String(outgoingReceipts.length), compact: false }] : []),
        ...(showPayerView ? [{ label: 'Outgoing credits', value: units(totalOutgoing.credits), compact: false }] : []),
        ...(showPayerView ? [{ label: 'Outgoing USDCx', value: units(totalOutgoing.usdcx), compact: false }] : []),
        ...(showPayerView ? [{ label: 'Outgoing USAD', value: units(totalOutgoing.usad), compact: false }] : [])
    ].map((card) => `
        <div class="card">
            <div class="label">${escapeHtml(card.label)}</div>
            <div class="value-row">
                <div class="value ${card.compact ? 'compact' : ''} break">${escapeHtml(card.value)}</div>
                ${card.copyValue ? `<button class="copy-btn" data-copy="${escapeHtml(card.copyValue)}">Copy</button>` : ''}
            </div>
        </div>
    `).join('');

    const balanceRows = input.balances.map((balance) => `
        <tr>
            <td>${escapeHtml(balance.name)}</td>
            <td>${escapeHtml(units(balance.publicAmount))}</td>
            <td>${escapeHtml(units(balance.privateAmount))}</td>
        </tr>
    `).join('');

    const invoiceRows = invoices.map((invoice) => `
        <tr>
            <td><code>${escapeHtml(shortHash(invoice.invoiceHash, 14, 10))}</code><button class="copy-btn" data-copy="${escapeHtml(invoice.invoiceHash)}">Copy</button></td>
            <td>${escapeHtml(normalizeStatus(invoice.status))}</td>
            <td>${escapeHtml(getTokenLabel(invoice.tokenType, invoice.invoiceType))}</td>
            <td>${escapeHtml(invoice.invoiceType === 2 && invoice.donations ? `${units(invoice.donations.credits + invoice.donations.usdcx + invoice.donations.usad)} mixed` : units(invoice.amount))}</td>
            ${opts.includeMemo ? `<td>${escapeHtml(invoice.memo || '-')}</td>` : ''}
            ${opts.includeLineItems ? `<td>${escapeHtml(summarizeItems(invoice.items))}</td>` : ''}
            <td>${escapeHtml(invoice.invoiceType === 2 ? 'Donation' : invoice.invoiceType === 1 ? 'Multi Pay' : 'Standard')}</td>
            <td>${escapeHtml(invoice.walletType === 1 ? 'Burner' : 'Main')}</td>
        </tr>
    `).join('');

    const merchantReceiptRows = incomingReceipts.map((receipt) => `
        <tr>
            <td><code>${escapeHtml(shortHash(receipt.invoiceHash, 14, 10))}</code><button class="copy-btn" data-copy="${escapeHtml(receipt.invoiceHash)}">Copy</button></td>
            <td><code>${escapeHtml(shortHash(receipt.receiptHash, 14, 10))}</code><button class="copy-btn" data-copy="${escapeHtml(receipt.receiptHash)}">Copy</button></td>
            <td>${escapeHtml(getTokenLabel(receipt.tokenType))}</td>
            <td>${escapeHtml(micro(receipt.amount))}</td>
        </tr>
    `).join('');

    const payerReceiptRows = outgoingReceipts.map((receipt) => `
        <tr>
            <td><code>${escapeHtml(shortHash(receipt.invoiceHash, 14, 10))}</code><button class="copy-btn" data-copy="${escapeHtml(receipt.invoiceHash)}">Copy</button></td>
            <td><code>${escapeHtml(shortHash(receipt.receiptHash, 14, 10))}</code><button class="copy-btn" data-copy="${escapeHtml(receipt.receiptHash)}">Copy</button></td>
            <td><code>${escapeHtml(shortHash(receipt.merchant, 14, 10))}</code><button class="copy-btn" data-copy="${escapeHtml(receipt.merchant)}">Copy</button></td>
            <td>${escapeHtml(getTokenLabel(receipt.tokenType))}</td>
            <td>${escapeHtml(micro(receipt.amount))}</td>
        </tr>
    `).join('');

    const invoiceSections = invoices.map((invoice) => {
        const relatedReceipts = incomingReceipts.filter((receipt) => receipt.invoiceHash === invoice.invoiceHash);
        const paymentLinks = list(invoice.paymentTxIds).map((txId) => `
            <li>
                <code>${escapeHtml(shortHash(txId, 14, 10))}</code>
                <button class="copy-btn" data-copy="${escapeHtml(txId)}">Copy</button>
                <a href="${escapeHtml(explorerUrl(txId))}" target="_blank" rel="noreferrer">Explorer</a>
            </li>
        `).join('');
        const itemRows = list(invoice.items).map((item) => `
            <tr>
                <td>${escapeHtml(item.name || 'Unnamed item')}</td>
                <td>${escapeHtml(String(item.quantity))}</td>
                <td>${escapeHtml(units(item.unitPrice))}</td>
                <td>${escapeHtml(units(item.total))}</td>
            </tr>
        `).join('');
        const receiptList = relatedReceipts.map((receipt) => `
            <li>
                <code>${escapeHtml(shortHash(receipt.receiptHash, 14, 10))}</code>
                <button class="copy-btn" data-copy="${escapeHtml(receipt.receiptHash)}">Copy</button>
            </li>
        `).join('');

        return `
            <section class="invoice-section">
                <div class="section-head">
                    <h3>${escapeHtml(shortHash(invoice.invoiceHash, 14, 12))}</h3>
                    <span class="badge">${escapeHtml(normalizeStatus(invoice.status))}</span>
                </div>
                <div class="details-grid">
                    <div><span class="muted">Invoice hash</span><div><code>${escapeHtml(shortHash(invoice.invoiceHash, 14, 10))}</code><button class="copy-btn" data-copy="${escapeHtml(invoice.invoiceHash)}">Copy</button></div></div>
                    <div><span class="muted">Owner</span><div><code>${escapeHtml(invoice.owner ? shortHash(invoice.owner, 14, 10) : '-')}</code>${invoice.owner ? `<button class="copy-btn" data-copy="${escapeHtml(invoice.owner)}">Copy</button>` : ''}</div></div>
                    <div><span class="muted">Salt</span><div><code>${escapeHtml(invoice.salt ? shortHash(invoice.salt, 14, 10) : '-')}</code>${invoice.salt ? `<button class="copy-btn" data-copy="${escapeHtml(invoice.salt)}">Copy</button>` : ''}</div></div>
                    <div><span class="muted">Token</span><span>${escapeHtml(getTokenLabel(invoice.tokenType, invoice.invoiceType))}</span></div>
                    <div><span class="muted">Amount</span><span>${escapeHtml(invoice.invoiceType === 2 && invoice.donations ? `${units(invoice.donations.credits + invoice.donations.usdcx + invoice.donations.usad)} mixed` : units(invoice.amount))}</span></div>
                    <div><span class="muted">Wallet</span><span>${escapeHtml(invoice.walletType === 1 ? 'Burner wallet' : 'Main wallet')}</span></div>
                    ${opts.includeMemo ? `<div><span class="muted">Memo</span><span>${escapeHtml(invoice.memo || '-')}</span></div>` : ''}
                    <div><span class="muted">Creation tx</span>${invoice.creationTx ? `<div><code>${escapeHtml(shortHash(invoice.creationTx, 14, 10))}</code><button class="copy-btn" data-copy="${escapeHtml(invoice.creationTx)}">Copy</button><a href="${escapeHtml(explorerUrl(invoice.creationTx))}" target="_blank" rel="noreferrer">Explorer</a></div>` : '<span>-</span>'}</div>
                </div>
                <div class="subsection">
                    <h4>Payment Transaction IDs</h4>
                    ${paymentLinks ? `<ul class="pill-list">${paymentLinks}</ul>` : '<p class="empty">No payment transaction IDs recorded.</p>'}
                </div>
                ${opts.includeIncomingReceipts ? `
                <div class="subsection">
                    <h4>Merchant Receipt Hashes</h4>
                    ${receiptList ? `<ul class="pill-list">${receiptList}</ul>` : '<p class="empty">No merchant receipt hashes recorded for this invoice.</p>'}
                </div>` : ''}
                ${opts.includeLineItems ? `
                <div class="subsection">
                    <h4>Line Items</h4>
                    ${itemRows ? `
                        <table>
                            <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                            <tbody>${itemRows}</tbody>
                        </table>
                    ` : '<p class="empty">No line items stored for this invoice.</p>'}
                </div>` : ''}
            </section>
        `;
    }).join('');

    const hero = buildReportHero(
        `${roleLabel} Audit Center`,
        'NullPay',
        'Audit Report',
        'Detailed operational export for third-party review, styled to match the live NullPay product. This report now highlights total earnings across all invoices so auditors can review the full picture without reading invoice totals one by one.',
        [
            { label: 'Export Type', value: 'Interactive HTML' },
            { label: 'Prepared As', value: roleLabel },
            { label: 'Program ID', value: shortHash(input.programId, 12, 8) },
            { label: 'Generated', value: new Date().toLocaleString() }
        ]
    );

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>NullPay Audit Report</title>
    <style>${reportThemeCss()}</style>
</head>
<body>
    <main>
        ${hero}

        <section class="grid">${summaryCards}</section>

        <section class="panel">
            <h2>Aggregate Flow Summary</h2>
            <p>This summary shows the total visible flow across all invoices included in this export.</p>
            <table>
                <thead><tr><th>Token</th>${showMerchantView ? '<th>Total Earnings</th>' : ''}${showPayerView ? '<th>Total Outgoing</th>' : ''}</tr></thead>
                <tbody>
                    <tr><td>Credits</td>${showMerchantView ? `<td>${escapeHtml(units(totalEarnings.credits))}</td>` : ''}${showPayerView ? `<td>${escapeHtml(units(totalOutgoing.credits))}</td>` : ''}</tr>
                    <tr><td>USDCx</td>${showMerchantView ? `<td>${escapeHtml(units(totalEarnings.usdcx))}</td>` : ''}${showPayerView ? `<td>${escapeHtml(units(totalOutgoing.usdcx))}</td>` : ''}</tr>
                    <tr><td>USAD</td>${showMerchantView ? `<td>${escapeHtml(units(totalEarnings.usad))}</td>` : ''}${showPayerView ? `<td>${escapeHtml(units(totalOutgoing.usad))}</td>` : ''}</tr>
                </tbody>
            </table>
        </section>

        ${opts.includeBalanceSnapshot ? `
        <section class="panel">
            <h2>Balance Snapshot</h2>
            <table>
                <thead><tr><th>Asset</th><th>Public</th><th>Private</th></tr></thead>
                <tbody>${balanceRows}</tbody>
            </table>
        </section>` : ''}

        <section class="panel">
            <h2>Invoice Register</h2>
            <table>
                <thead><tr><th>Invoice</th><th>Status</th><th>Token</th><th>Amount</th>${opts.includeMemo ? '<th>Memo</th>' : ''}${opts.includeLineItems ? '<th>Items</th>' : ''}<th>Type</th><th>Wallet</th></tr></thead>
                <tbody>${invoiceRows || '<tr><td colspan="8">No invoices found.</td></tr>'}</tbody>
            </table>
        </section>

        ${opts.includeIncomingReceipts ? `
        <section class="panel">
            <h2>Incoming Merchant Receipts</h2>
            <table>
                <thead><tr><th>Invoice</th><th>Receipt Hash</th><th>Token</th><th>Amount</th></tr></thead>
                <tbody>${merchantReceiptRows || '<tr><td colspan="4">No merchant receipts found.</td></tr>'}</tbody>
            </table>
        </section>` : ''}

        ${opts.includeOutgoingReceipts ? `
        <section class="panel">
            <h2>Outgoing Payer Receipts</h2>
            <table>
                <thead><tr><th>Invoice</th><th>Receipt Hash</th><th>Merchant</th><th>Token</th><th>Amount</th></tr></thead>
                <tbody>${payerReceiptRows || '<tr><td colspan="5">No payer receipts found.</td></tr>'}</tbody>
            </table>
        </section>` : ''}

        ${opts.includeInvoiceAppendices ? `
        <section class="panel">
            <h2>Invoice Appendices</h2>
            <p>Each invoice appendix includes the full invoice hash, owner/salt details when available, all creation and payment transaction IDs, related merchant receipt hashes, and stored line items.</p>
            ${invoiceSections || '<p class="empty">No invoice appendix data available.</p>'}
        </section>` : ''}

        <section class="panel note">
            <h2>Report Note</h2>
            <p>This export packages the merchant-visible evidence currently available in NullPay: wallet records, receipt hashes, invoice metadata, and transaction references. Chain-side selective disclosure packages and audit authorization anchors are not yet part of the current NullPay contract.</p>
        </section>
    </main>
    <script>
        (function () {
            function fallbackCopy(text) {
                const area = document.createElement('textarea');
                area.value = text;
                area.style.position = 'fixed';
                area.style.opacity = '0';
                document.body.appendChild(area);
                area.focus();
                area.select();
                try { document.execCommand('copy'); } catch (error) {}
                document.body.removeChild(area);
            }
            document.querySelectorAll('[data-copy]').forEach(function (button) {
                button.addEventListener('click', async function () {
                    const text = button.getAttribute('data-copy') || '';
                    try {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            await navigator.clipboard.writeText(text);
                        } else {
                            fallbackCopy(text);
                        }
                        const original = button.textContent;
                        button.textContent = 'Copied';
                        setTimeout(function () { button.textContent = original; }, 1200);
                    } catch (error) {
                        fallbackCopy(text);
                    }
                });
            });
        })();
    </script>
</body>
</html>`;

    return { html, filename: opts.filename };
}

export function downloadMerchantAuditReportHtml(input: AuditReportInput, options?: ReportOptions): void {
    const report = buildMerchantAuditReportHtmlAsset(input, options);
    const blob = new Blob([report.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = report.filename;
    anchor.click();
    URL.revokeObjectURL(url);
}
