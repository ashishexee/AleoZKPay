import { getTokenLabel } from './tokens';
import type { AuditReportInput, AuditReportPerspective, ReportInvoice, ReportOptions } from './generateMerchantReportsPdf';
import type { MerchantReceipt, PayerReceipt } from './aleo-utils';

export interface AuditTokenTotals {
    credits: number;
    usdcx: number;
    usad: number;
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
    summary: {
        invoices: number;
        incomingMerchantReceipts: number;
        outgoingPayerReceipts: number;
        totalEarnings: AuditTokenTotals;
        totalOutgoing: AuditTokenTotals;
    };
    balances: Array<{ name: string; publicAmount: number; privateAmount: number }>;
    invoices: Array<{
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
        relatedReceiptHashes?: string[];
        items?: Array<{
            name: string;
            quantity: number;
            unitPrice: number;
            total: number;
        }>;
    }>;
    incomingMerchantReceipts: Array<{ invoiceHash: string; receiptHash: string; tokenLabel: string; amountLabel: string; amount: number }>;
    outgoingPayerReceipts: Array<{ invoiceHash: string; receiptHash: string; merchant: string; tokenLabel: string; amountLabel: string; amount: number }>;
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
    signature: string | null;
    signatureBase64: string | null;
    encryption: {
        algorithm: 'AES-GCM';
        iv: string;
        ciphertext: string;
    };
    disclosure: Required<Omit<ReportOptions, 'filename'>>;
    summary: MerchantAuditPayload['summary'];
}

export interface MerchantAuditBundle {
    auditPackage: MerchantAuditPackage;
    packageJson: string;
    packageFilename: string;
    auditKey: string;
    auditKeyFilename: string;
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

function units(amount: number): string {
    return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

function micro(amount: number): string {
    return units(amount / 1_000_000);
}

function normalizeStatus(status: string | number): string {
    if (typeof status === 'number') return status === 1 ? 'SETTLED' : status === 0 ? 'PENDING' : String(status);
    return String(status || 'UNKNOWN').toUpperCase();
}

function summarizeItems(items?: Array<{ name: string; quantity: number }>): string {
    const normalized = list(items).filter((item) => item && (item.name || item.quantity));
    if (!normalized.length) return 'No line items';
    return normalized.slice(0, 3).map((item) => item.name || `Item x${item.quantity}`).join(', ') + (normalized.length > 3 ? ` +${normalized.length - 3} more` : '');
}

function normalizePerspective(value?: AuditReportPerspective): AuditReportPerspective {
    return value === 'merchant' || value === 'payer' || value === 'both' ? value : 'both';
}

function resolveOptions(options?: ReportOptions): Required<Omit<ReportOptions, 'filename'>> {
    return {
        includeMerchantAddress: options?.includeMerchantAddress !== false,
        includeBurnerAddress: options?.includeBurnerAddress !== false,
        includeMemo: options?.includeMemo !== false,
        includeLineItems: options?.includeLineItems !== false,
        includeBalanceSnapshot: options?.includeBalanceSnapshot !== false,
        includeIncomingReceipts: options?.includeIncomingReceipts !== false,
        includeOutgoingReceipts: options?.includeOutgoingReceipts !== false,
        includeInvoiceAppendices: options?.includeInvoiceAppendices !== false,
        auditPerspective: normalizePerspective(options?.auditPerspective)
    };
}

function sumReceiptTotals<T extends MerchantReceipt | PayerReceipt>(receipts: T[]): AuditTokenTotals {
    return receipts.reduce<AuditTokenTotals>((totals, receipt) => {
        const amount = Number(receipt.amount || 0) / 1_000_000;
        if (receipt.tokenType === 1) totals.usdcx += amount;
        else if (receipt.tokenType === 2) totals.usad += amount;
        else totals.credits += amount;
        return totals;
    }, { credits: 0, usdcx: 0, usad: 0 });
}

function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
    const binary = window.atob(value);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function parseStoredAleoSignature(signatureBase64: string | null, signatureString: string | null) {
    const { Signature } = await import('@provablehq/sdk');

    if (signatureString) {
        try {
            return Signature.from_string(signatureString);
        } catch (error) {
            // fall through to the base64 path
        }
    }

    if (!signatureBase64) {
        throw new Error('Signature payload is empty.');
    }

    const signatureBytes = base64ToBytes(signatureBase64);
    const decodedString = new TextDecoder().decode(signatureBytes).trim();

    if (decodedString) {
        try {
            return Signature.from_string(decodedString);
        } catch (error) {
            // fall through to raw little-endian bytes
        }
    }

    return Signature.fromBytesLe(signatureBytes);
}

async function sha256Hex(value: string): Promise<string> {
    const buffer = await window.crypto.subtle.digest('SHA-256', toArrayBuffer(new TextEncoder().encode(value)));
    return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function createAuditKey(): string {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    return bytesToBase64(bytes);
}

async function importAuditKey(auditKey: string): Promise<CryptoKey> {
    return window.crypto.subtle.importKey('raw', toArrayBuffer(base64ToBytes(auditKey)), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function buildPayload(input: AuditReportInput, options?: ReportOptions, generatedAt = new Date().toISOString(), reportId = `audit_${Date.now()}`): MerchantAuditPayload {
    const disclosure = resolveOptions(options);
    const includeMerchantView = disclosure.auditPerspective !== 'payer';
    const includePayerView = disclosure.auditPerspective !== 'merchant';
    const incomingReceipts = uniqueBy([...list(input.merchantReceipts), ...list(input.burnerMerchantReceipts)], (receipt) => receipt.receiptHash);
    const outgoingReceipts = uniqueBy(list(input.payerReceipts), (receipt) => receipt.receiptHash);
    const invoices = includeMerchantView ? [...list(input.invoices)] : [];
    const normalizeInvoice = (invoice: ReportInvoice) => ({
        invoiceHash: invoice.invoiceHash,
        status: normalizeStatus(invoice.status),
        tokenLabel: getTokenLabel(invoice.tokenType, invoice.invoiceType),
        amountLabel: invoice.invoiceType === 2 && invoice.donations
            ? `${units(invoice.donations.credits + invoice.donations.usdcx + invoice.donations.usad)} mixed`
            : units(invoice.amount),
        invoiceTypeLabel: invoice.invoiceType === 2 ? 'Donation' : invoice.invoiceType === 1 ? 'Multi Pay' : 'Standard',
        walletLabel: invoice.walletType === 1 ? 'Burner wallet' : 'Main wallet',
        memo: disclosure.includeMemo ? (invoice.memo || '-') : undefined,
        lineItemsSummary: disclosure.includeLineItems ? summarizeItems(invoice.items) : undefined,
        owner: disclosure.includeInvoiceAppendices ? (invoice.owner || undefined) : undefined,
        salt: disclosure.includeInvoiceAppendices ? (invoice.salt || undefined) : undefined,
        creationTx: disclosure.includeInvoiceAppendices ? (invoice.creationTx || null) : undefined,
        paymentTxIds: disclosure.includeInvoiceAppendices ? list(invoice.paymentTxIds) : undefined,
        relatedReceiptHashes: disclosure.includeInvoiceAppendices && disclosure.includeIncomingReceipts
            ? incomingReceipts.filter((receipt) => receipt.invoiceHash === invoice.invoiceHash).map((receipt) => receipt.receiptHash)
            : undefined,
        items: disclosure.includeLineItems
            ? list(invoice.items).map((item) => ({
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total
            }))
            : undefined
    });

    return {
        version: '1.0.0',
        reportId,
        role: disclosure.auditPerspective,
        generatedAt,
        programId: input.programId,
        merchantAddress: disclosure.includeMerchantAddress ? input.merchantAddress : null,
        burnerAddress: disclosure.includeBurnerAddress ? (input.burnerAddress || null) : null,
        disclosure,
        summary: {
            invoices: invoices.length,
            incomingMerchantReceipts: includeMerchantView && disclosure.includeIncomingReceipts ? incomingReceipts.length : 0,
            outgoingPayerReceipts: includePayerView && disclosure.includeOutgoingReceipts ? outgoingReceipts.length : 0,
            totalEarnings: sumReceiptTotals(incomingReceipts),
            totalOutgoing: sumReceiptTotals(outgoingReceipts)
        },
        balances: disclosure.includeBalanceSnapshot ? input.balances.map((balance) => ({ name: balance.name, publicAmount: balance.publicAmount, privateAmount: balance.privateAmount })) : [],
        invoices: invoices.sort((left, right) => left.invoiceHash.localeCompare(right.invoiceHash)).map(normalizeInvoice),
        incomingMerchantReceipts: includeMerchantView && disclosure.includeIncomingReceipts ? incomingReceipts.map((receipt) => ({ invoiceHash: receipt.invoiceHash, receiptHash: receipt.receiptHash, tokenLabel: getTokenLabel(receipt.tokenType), amountLabel: micro(receipt.amount), amount: Number(receipt.amount) / 1_000_000 })) : [],
        outgoingPayerReceipts: includePayerView && disclosure.includeOutgoingReceipts ? outgoingReceipts.map((receipt) => ({ invoiceHash: receipt.invoiceHash, receiptHash: receipt.receiptHash, merchant: receipt.merchant, tokenLabel: getTokenLabel(receipt.tokenType), amountLabel: micro(receipt.amount), amount: Number(receipt.amount) / 1_000_000 })) : []
    };
}

async function encryptPayload(payload: MerchantAuditPayload, auditKey: string): Promise<MerchantAuditPackage['encryption']> {
    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(iv);
    const key = await importAuditKey(auditKey);
    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: toArrayBuffer(iv) },
        key,
        toArrayBuffer(new TextEncoder().encode(JSON.stringify(payload)))
    );
    return { algorithm: 'AES-GCM', iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(encrypted)) };
}

function triggerDownload(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

export async function generateMerchantAuditPackage(
    input: AuditReportInput,
    options?: ReportOptions,
    signMessage?: (message: string) => Promise<{ signature?: string | null; signatureBase64?: string | null } | null>
): Promise<MerchantAuditBundle> {
    const filename = options?.filename || `NullPay_Audit_Report_${input.merchantAddress.slice(0, 8)}.html`;
    const generatedAt = new Date().toISOString();
    const reportId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payload = buildPayload(input, options, generatedAt, reportId);
    const payloadHash = await sha256Hex(JSON.stringify(payload));
    const auditKey = createAuditKey();
    const auditKeyHash = await sha256Hex(auditKey);
    const signatureMessage = `NULLPAY_AUDIT_V1|${reportId}|${payload.role}|${generatedAt}|${payloadHash}|${auditKeyHash}`;
    const signatureResult = signMessage ? await signMessage(signatureMessage) : null;
    const auditPackage: MerchantAuditPackage = {
        version: '1.0.0',
        packageType: 'nullpay_audit_report',
        reportId,
        role: payload.role,
        filename,
        generatedAt,
        signerAddress: input.merchantAddress,
        auditKeyHash,
        payloadHash,
        signatureMessage,
        signature: signatureResult?.signature || null,
        signatureBase64: signatureResult?.signatureBase64 || null,
        encryption: await encryptPayload(payload, auditKey),
        disclosure: payload.disclosure,
        summary: payload.summary
    };
    const baseName = filename.replace(/\.[^/.]+$/, '');
    const packageJson = JSON.stringify(auditPackage, null, 2);

    return {
        auditPackage,
        packageJson,
        packageFilename: `${baseName}.audit.json`,
        auditKey,
        auditKeyFilename: `${baseName}.audit-key.txt`
    };
}

export function downloadMerchantAuditPackage(bundle: MerchantAuditBundle): void {
    triggerDownload(bundle.packageJson, bundle.packageFilename, 'application/json;charset=utf-8');
}

export function downloadMerchantAuditKey(bundle: MerchantAuditBundle): void {
    triggerDownload(`${bundle.auditKey}\n`, bundle.auditKeyFilename, 'text/plain;charset=utf-8');
}

export async function verifyMerchantAuditPackage(auditPackage: MerchantAuditPackage, auditKey: string): Promise<{ payload: MerchantAuditPayload; signatureStatus: 'verified' | 'missing' | 'invalid' }> {
    if (!auditPackage || auditPackage.packageType !== 'nullpay_audit_report') {
        throw new Error('Unsupported audit package format.');
    }
    if (await sha256Hex(auditKey.trim()) !== auditPackage.auditKeyHash) {
        throw new Error('The supplied audit key does not match this package.');
    }

    const key = await importAuditKey(auditKey.trim());
    const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: toArrayBuffer(base64ToBytes(auditPackage.encryption.iv)) },
        key,
        toArrayBuffer(base64ToBytes(auditPackage.encryption.ciphertext))
    );
    const payload = JSON.parse(new TextDecoder().decode(decrypted)) as MerchantAuditPayload;

    if (await sha256Hex(JSON.stringify(payload)) !== auditPackage.payloadHash) {
        throw new Error('This audit package failed the payload integrity check.');
    }
    if (payload.reportId !== auditPackage.reportId) {
        throw new Error('This audit package report ID does not match its decrypted payload.');
    }

    let signatureStatus: 'verified' | 'missing' | 'invalid' = 'missing';
    if ((auditPackage.signatureBase64 || auditPackage.signature) && auditPackage.signatureMessage) {
        try {
            const { Address } = await import('@provablehq/sdk');
            const address = Address.from_string(auditPackage.signerAddress);
            const messageBytes = new TextEncoder().encode(auditPackage.signatureMessage);
            const signatureObject = await parseStoredAleoSignature(auditPackage.signatureBase64, auditPackage.signature);

            signatureStatus = address.verify(messageBytes, signatureObject) ? 'verified' : 'invalid';
        } catch (error) {
            signatureStatus = 'invalid';
        }
        if (signatureStatus !== 'verified') {
            throw new Error('This audit package failed the wallet signature check.');
        }
    }

    return { payload, signatureStatus };
}
