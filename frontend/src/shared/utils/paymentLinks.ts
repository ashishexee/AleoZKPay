export interface ParsedPaymentLink {
    merchant: string | null;
    amount: string | null;
    salt: string | null;
    hash: string | null;
    memo: string;
    tokenType: number;
    invoiceType: number;
    raw: string;
    href: string;
}

export const parsePaymentLink = (rawValue: string): ParsedPaymentLink | null => {
    const trimmed = rawValue.trim();
    if (!trimmed) return null;

    try {
        let url: URL;
        try {
            url = new URL(trimmed);
        } catch {
            if (trimmed.startsWith('http')) return null;
            url = new URL(trimmed, window.location.origin);
        }

        const merchant = url.searchParams.get('merchant');
        const amount = url.searchParams.get('amount');
        const salt = url.searchParams.get('salt');
        const hash = url.searchParams.get('hash');
        const memo = url.searchParams.get('memo') || '';
        const tokenParam = url.searchParams.get('token');
        const typeParam = url.searchParams.get('type');

        if (!hash && !(merchant && salt)) return null;

        return {
            merchant,
            amount,
            salt,
            hash,
            memo,
            tokenType: tokenParam === 'usdcx' ? 1 : tokenParam === 'usad' ? 2 : tokenParam === 'any' ? 3 : 0,
            invoiceType: typeParam === 'donation' ? 2 : typeParam === 'multipay' ? 1 : 0,
            raw: trimmed,
            href: url.toString(),
        };
    } catch {
        return null;
    }
};
