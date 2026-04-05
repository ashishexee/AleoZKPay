function normalizePaymentTxIds(value) {
    const source = Array.isArray(value) ? value : (value ? [value] : []);
    const flattened = [];

    for (const item of source) {
        if (!item) continue;

        if (Array.isArray(item)) {
            flattened.push(...normalizePaymentTxIds(item));
            continue;
        }

        if (typeof item === 'string') {
            const trimmed = item.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                    flattened.push(...normalizePaymentTxIds(JSON.parse(trimmed)));
                    continue;
                } catch {
                    // Fall through and keep the string as-is.
                }
            }

            flattened.push(trimmed);
            continue;
        }

        flattened.push(String(item));
    }

    return Array.from(new Set(flattened.filter(Boolean)));
}

function deriveInvoiceAmount(invoice) {
    if (!invoice) return null;

    if (invoice.amount !== undefined && invoice.amount !== null && invoice.amount !== '') {
        const numericAmount = Number(invoice.amount);
        if (Number.isFinite(numericAmount)) {
            return numericAmount;
        }
    }

    if (Array.isArray(invoice.invoice_items)) {
        const total = invoice.invoice_items.reduce((sum, item) => {
            const next = Number(item?.total ?? item?.price ?? 0);
            return Number.isFinite(next) ? sum + next : sum;
        }, 0);

        if (total > 0) {
            return total;
        }
    }

    return null;
}

function tokenTypeToCode(tokenType) {
    if (tokenType === 1) return 'USDCX';
    if (tokenType === 2) return 'USAD';
    if (tokenType === 3) return 'ANY';
    return 'CREDITS';
}

function tokenTypeToLabel(tokenType) {
    if (tokenType === 1) return 'USDCX';
    if (tokenType === 2) return 'USAD';
    if (tokenType === 3) return 'ANY';
    return 'CREDITS';
}

function invoiceTypeToLabel(invoiceType) {
    if (invoiceType === 1) return 'multipay';
    if (invoiceType === 2) return 'donation';
    return 'standard';
}

module.exports = {
    normalizePaymentTxIds,
    deriveInvoiceAmount,
    tokenTypeToCode,
    tokenTypeToLabel,
    invoiceTypeToLabel
};
