"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCurrency = normalizeCurrency;
exports.normalizePaymentCurrency = normalizePaymentCurrency;
exports.normalizeInvoiceType = normalizeInvoiceType;
exports.tokenTypeLabel = tokenTypeLabel;
exports.invoiceTypeLabel = invoiceTypeLabel;
exports.currencyToTokenType = currencyToTokenType;
exports.linkTokenToCurrency = linkTokenToCurrency;
exports.linkTypeToInvoiceType = linkTypeToInvoiceType;
exports.parseAmount = parseAmount;
exports.shouldMarkInvoiceSettled = shouldMarkInvoiceSettled;
exports.formatInvoiceSummary = formatInvoiceSummary;
exports.getAmountSource = getAmountSource;
exports.buildAmountLookupHint = buildAmountLookupHint;
function normalizeCurrency(value) {
    const normalized = (value || 'CREDITS').toUpperCase();
    if (normalized === 'USDCX' || normalized === 'USAD' || normalized === 'ANY') {
        return normalized;
    }
    return 'CREDITS';
}
function normalizePaymentCurrency(value) {
    if (!value) {
        return undefined;
    }
    const normalized = value.toUpperCase();
    if (normalized === 'USDCX' || normalized === 'USAD') {
        return normalized;
    }
    return 'CREDITS';
}
function normalizeInvoiceType(value) {
    if (value === 'multipay' || value === 'donation')
        return value;
    return 'standard';
}
function tokenTypeLabel(tokenType) {
    if (tokenType === 1)
        return 'USDCX';
    if (tokenType === 2)
        return 'USAD';
    if (tokenType === 3)
        return 'ANY';
    return 'CREDITS';
}
function invoiceTypeLabel(invoiceType) {
    if (invoiceType === 1)
        return 'multipay';
    if (invoiceType === 2)
        return 'donation';
    return 'standard';
}
function currencyToTokenType(currency) {
    if (currency === 'USDCX')
        return 1;
    if (currency === 'USAD')
        return 2;
    if (currency === 'ANY')
        return 3;
    return 0;
}
function linkTokenToCurrency(token) {
    if (!token) {
        return undefined;
    }
    const normalized = token.trim().toLowerCase();
    if (normalized === 'usdcx')
        return 'USDCX';
    if (normalized === 'usad')
        return 'USAD';
    if (normalized === 'any')
        return 'ANY';
    return 'CREDITS';
}
function linkTypeToInvoiceType(type) {
    if (type === 'multipay' || type === 'donation') {
        return type;
    }
    return 'standard';
}
function parseAmount(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined;
    }
    if (!value) {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function shouldMarkInvoiceSettled(invoiceType) {
    return invoiceType !== 1 && invoiceType !== 2;
}
function formatInvoiceSummary(invoice) {
    const paymentIds = Array.isArray(invoice.payment_tx_ids) && invoice.payment_tx_ids.length > 0
        ? invoice.payment_tx_ids.join(', ')
        : 'none';
    const amount = invoice.amount ?? 0;
    return [
        `invoice=${invoice.invoice_hash}`,
        `status=${invoice.status}`,
        `amount=${amount}`,
        `token=${tokenTypeLabel(invoice.token_type)}`,
        `type=${invoiceTypeLabel(invoice.invoice_type)}`,
        `created=${invoice.created_at || 'unknown'}`,
        `invoice_tx=${invoice.invoice_transaction_id || 'none'}`,
        `payment_txs=${paymentIds}`
    ].join(' | ');
}
function getAmountSource(invoice) {
    if (typeof invoice.amount_micro === 'number') {
        return 'record';
    }
    if (typeof invoice.amount === 'number' && invoice.amount > 0) {
        return 'database';
    }
    return 'missing';
}
function buildAmountLookupHint(invoice, hasInvoiceLookupKey) {
    const amountSource = getAmountSource(invoice);
    if (amountSource === 'record') {
        return ' | amount_source=record';
    }
    if (amountSource === 'database') {
        return ' | amount_source=database';
    }
    if (hasInvoiceLookupKey) {
        return ' | amount_source=missing | record_lookup=not_found_or_unreadable_for_selected_wallet';
    }
    return ' | amount_source=db_only (private key missing to fetch record-backed amount)';
}
