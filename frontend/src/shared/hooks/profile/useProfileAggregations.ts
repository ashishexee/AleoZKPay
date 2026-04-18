import { useMemo } from 'react';
import { InvoiceRecord } from '../../types/invoice';
import { MerchantReceipt, PayerReceipt } from '../../types/receipt';

interface UseProfileAggregationsProps {
    transactions: any[];
    createdInvoices: InvoiceRecord[];
    merchantReceipts: MerchantReceipt[];
    payerReceipts: PayerReceipt[];
    burnerCreatedInvoices: InvoiceRecord[];
    burnerMerchantReceipts: MerchantReceipt[];
    profileMainHash: string | null;
    profileBurnerHash: string | null;
}

const normalizeHash = (hash?: string | null) => (hash || '').replace(/field$/, '');

export function useProfileAggregations({
    transactions,
    createdInvoices,
    merchantReceipts,
    payerReceipts,
    burnerCreatedInvoices,
    burnerMerchantReceipts,
    profileMainHash,
    profileBurnerHash
}: UseProfileAggregationsProps) {

    const paymentTimestampsByTxId = useMemo(() => {
        const timestamps: Record<string, string> = {};
        transactions.forEach((tx: any) => {
            const paymentTimestamps = tx.payment_timestamps;
            if (!paymentTimestamps || typeof paymentTimestamps !== 'object' || Array.isArray(paymentTimestamps)) {
                return;
            }
            Object.entries(paymentTimestamps).forEach(([txId, timestamp]) => {
                if (typeof timestamp === 'string' && timestamp && !timestamps[txId]) {
                    timestamps[txId] = timestamp;
                }
            });
        });
        return timestamps;
    }, [transactions]);

    const timelineReceipts = useMemo(() => {
        const invoiceTimestampMap = new Map<string, string[]>();

        transactions.forEach((tx: any) => {
            const paymentTimestamps = tx.payment_timestamps;
            if (!tx.invoice_hash || !paymentTimestamps || typeof paymentTimestamps !== 'object' || Array.isArray(paymentTimestamps)) {
                return;
            }

            const timestamps = Object.values(paymentTimestamps)
                .filter((timestamp): timestamp is string => typeof timestamp === 'string' && !Number.isNaN(Date.parse(timestamp)))
                .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

            if (timestamps.length > 0) {
                invoiceTimestampMap.set(tx.invoice_hash, timestamps);
            }
        });

        const enrichReceipts = (receipts: MerchantReceipt[]) => {
            const receiptsByInvoice = new Map<string, MerchantReceipt[]>();
            receipts.forEach((receipt) => {
                const bucket = receiptsByInvoice.get(receipt.invoiceHash) || [];
                bucket.push(receipt);
                receiptsByInvoice.set(receipt.invoiceHash, bucket);
            });

            return Array.from(receiptsByInvoice.entries()).flatMap(([invoiceHash, invoiceReceipts]) => {
                const invoiceTimestamps = invoiceTimestampMap.get(invoiceHash) || [];
                const sortedReceipts = [...invoiceReceipts].sort((a, b) => {
                    const timeA = a.created_at ? new Date(a.created_at).getTime() : (a.timestamp || 0);
                    const timeB = b.created_at ? new Date(b.created_at).getTime() : (b.timestamp || 0);
                    if (timeA !== timeB) return timeA - timeB;
                    return a.receiptHash.localeCompare(b.receiptHash);
                });

                return sortedReceipts.map((receipt, index) => {
                    if (receipt.transactionId && paymentTimestampsByTxId[receipt.transactionId]) {
                        return receipt;
                    }

                    const fallbackTimestamp = invoiceTimestamps[Math.min(index, invoiceTimestamps.length - 1)];
                    if (!fallbackTimestamp) {
                        return receipt;
                    }

                    return {
                        ...receipt,
                        created_at: receipt.created_at || fallbackTimestamp,
                        timestamp: receipt.timestamp && receipt.timestamp > 0
                            ? receipt.timestamp
                            : new Date(fallbackTimestamp).getTime()
                    };
                });
            });
        };

        return enrichReceipts([...merchantReceipts, ...burnerMerchantReceipts]);
    }, [burnerMerchantReceipts, merchantReceipts, paymentTimestampsByTxId, transactions]);

    const sdkHashSet = useMemo(() => {
        return new Set(transactions.filter(tx => tx.for_sdk).map(tx => normalizeHash(tx.invoice_hash)));
    }, [transactions]);

    const mainDashboardPayerReceipts = useMemo(() => {
        return payerReceipts.filter((receipt) => !sdkHashSet.has(normalizeHash(receipt.invoiceHash)));
    }, [payerReceipts, sdkHashSet]);

    const uniqueMainReceipts = useMemo(() => {
        return Array.from(new Map(merchantReceipts.map((receipt) => [receipt.receiptHash, receipt])).values())
            .filter((receipt) => normalizeHash(receipt.invoiceHash) !== normalizeHash(profileMainHash) && normalizeHash(receipt.invoiceHash) !== normalizeHash(profileBurnerHash) && !sdkHashSet.has(normalizeHash(receipt.invoiceHash)));
    }, [merchantReceipts, profileMainHash, profileBurnerHash, sdkHashSet]);

    const uniqueBurnerReceipts = useMemo(() => {
        return Array.from(new Map(burnerMerchantReceipts.map((receipt) => [receipt.receiptHash, receipt])).values())
            .filter((receipt) => normalizeHash(receipt.invoiceHash) !== normalizeHash(profileMainHash) && normalizeHash(receipt.invoiceHash) !== normalizeHash(profileBurnerHash) && !sdkHashSet.has(normalizeHash(receipt.invoiceHash)));
    }, [burnerMerchantReceipts, profileMainHash, profileBurnerHash, sdkHashSet]);

    const combinedInvoices = useMemo(() => {
        const merged = new Map<string, any>();
        
        const dbMap = new Map<string, any>();
        transactions.forEach(tx => {
            if (tx.invoice_hash) dbMap.set(normalizeHash(tx.invoice_hash), tx);
        });

        const processInvoice = (record: InvoiceRecord, walletType: number) => {
            if (normalizeHash(record.invoiceHash) === normalizeHash(profileMainHash) || normalizeHash(record.invoiceHash) === normalizeHash(profileBurnerHash)) return;
            if (sdkHashSet.has(normalizeHash(record.invoiceHash))) return; 

            const dbTx = dbMap.get(normalizeHash(record.invoiceHash));
            if (!dbTx) return;

            merged.set(record.invoiceHash, {
                invoiceHash: record.invoiceHash,
                amount: record.amount / 1_000_000,
                tokenType: record.tokenType,
                invoiceType: record.invoiceType,
                walletType: walletType,
                owner: record.owner,
                salt: record.salt,
                title: record.title || '',
                status: dbTx?.status === 'SETTLED' ? 'SETTLED' : 'PENDING',
                createdAt: dbTx?.created_at || null,
                creationTx: dbTx?.invoice_transaction_id || null,
                paymentTxIds: dbTx?.payment_tx_ids || (dbTx?.payment_tx_id ? [dbTx.payment_tx_id] : []),
                memo: record.memo || dbTx?.memo || '',
                isPending: false,
                source: 'chain',
                isValidOnChain: true
            });
        };

        createdInvoices.forEach(record => processInvoice(record, 0));
        burnerCreatedInvoices.forEach(record => processInvoice(record, 1));

        const allReceipts = [...merchantReceipts, ...burnerMerchantReceipts];
        const receiptTotals = new Map<string, { credits: number, usdcx: number, usad: number }>();
        const receiptNotes = new Map<string, string[]>();
        
        allReceipts.forEach(receipt => {
            const hash = normalizeHash(receipt.invoiceHash);
            if (!receiptTotals.has(hash)) {
                receiptTotals.set(hash, { credits: 0, usdcx: 0, usad: 0 });
            }
            if (!receiptNotes.has(hash)) {
                receiptNotes.set(hash, []);
            }
            const totals = receiptTotals.get(hash)!;
            const amt = receipt.amount / 1_000_000;
            if (receipt.tokenType === 0) totals.credits += amt;
            else if (receipt.tokenType === 1) totals.usdcx += amt;
            else if (receipt.tokenType === 2) totals.usad += amt;

            const note = (receipt.merchantNote || '').trim();
            if (note) {
                const currentNotes = receiptNotes.get(hash)!;
                if (!currentNotes.includes(note)) {
                    currentNotes.push(note);
                }
            }
        });

        merged.forEach((inv, hash) => {
            const normalizedHash = normalizeHash(hash);
            const totals = receiptTotals.get(normalizedHash);
            const notes = receiptNotes.get(normalizedHash) || [];
            inv.earnings = totals || { credits: 0, usdcx: 0, usad: 0 };
            inv.merchantNotes = notes;
            inv.latestMerchantNote = notes[notes.length - 1] || '';

            if (inv.invoiceType === 2 || !inv.amount) {
                if (totals) {
                    inv.donations = totals;
                    inv.amount = totals.credits + totals.usdcx + totals.usad;
                }
            }
        });

        return Array.from(merged.values());
    }, [transactions, createdInvoices, merchantReceipts, burnerCreatedInvoices, burnerMerchantReceipts, profileMainHash, profileBurnerHash, sdkHashSet]);

    const merchantStats = useMemo(() => {
        const totalInvoices = combinedInvoices.length;
        const settledCount = combinedInvoices.filter((invoice) => invoice.status === 'SETTLED' || invoice.status === 1).length;
        const pendingCount = combinedInvoices.filter((invoice) => invoice.status === 'PENDING' || invoice.status === 0).length;
        const totalPayments = uniqueMainReceipts.length + uniqueBurnerReceipts.length;
        const settlementRate = totalInvoices > 0 ? (settledCount / totalInvoices) * 100 : 0;
        const averagePaymentsPerInvoice = totalInvoices > 0 ? totalPayments / totalInvoices : 0;
        const mainPaymentShare = totalPayments > 0 ? (uniqueMainReceipts.length / totalPayments) * 100 : 0;
        const burnerPaymentShare = totalPayments > 0 ? (uniqueBurnerReceipts.length / totalPayments) * 100 : 0;
        const nonDonationInvoices = combinedInvoices.filter((invoice) => invoice.invoiceType !== 2 && Number(invoice.amount) > 0);
        
        const averageInvoiceAmountForToken = (tokenType: number) => {
            const matchingInvoices = nonDonationInvoices.filter((invoice) => invoice.tokenType === tokenType);
            if (matchingInvoices.length === 0) return '0.00';
            const totalAmount = matchingInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
            return (totalAmount / matchingInvoices.length).toFixed(2);
        };
        
        const mainInvoiceCount = combinedInvoices.filter((invoice) => invoice.walletType !== 1).length;
        const burnerInvoiceCount = combinedInvoices.filter((invoice) => invoice.walletType === 1).length;
        const mainInvoiceShare = totalInvoices > 0 ? (mainInvoiceCount / totalInvoices) * 100 : 0;
        const burnerInvoiceShare = totalInvoices > 0 ? (burnerInvoiceCount / totalInvoices) * 100 : 0;
        const receiptCountByInvoice = [...uniqueMainReceipts, ...uniqueBurnerReceipts].reduce((counts, receipt) => {
            counts.set(receipt.invoiceHash, (counts.get(receipt.invoiceHash) || 0) + 1);
            return counts;
        }, new Map<string, number>());
        const multipayInvoices = combinedInvoices.filter((invoice) => invoice.invoiceType === 1);
        const engagedMultipayInvoices = multipayInvoices.filter((invoice) => (receiptCountByInvoice.get(invoice.invoiceHash) || 0) > 1).length;
        const multipayParticipationRate = multipayInvoices.length > 0 ? (engagedMultipayInvoices / multipayInvoices.length) * 100 : 0;

        return {
            mainCredits: uniqueMainReceipts.filter((receipt) => receipt.tokenType !== 1 && receipt.tokenType !== 2).reduce((acc, curr) => acc + (Number(curr.amount) / 1_000_000 || 0), 0).toFixed(2),
            mainUSDCx: uniqueMainReceipts.filter((receipt) => receipt.tokenType === 1).reduce((acc, curr) => acc + (Number(curr.amount) / 1_000_000 || 0), 0).toFixed(2),
            mainUSAD: uniqueMainReceipts.filter((receipt) => receipt.tokenType === 2).reduce((acc, curr) => acc + (Number(curr.amount) / 1_000_000 || 0), 0).toFixed(2),
            burnerCredits: uniqueBurnerReceipts.filter((receipt) => receipt.tokenType !== 1 && receipt.tokenType !== 2).reduce((acc, curr) => acc + (Number(curr.amount) / 1_000_000 || 0), 0).toFixed(2),
            burnerUSDCx: uniqueBurnerReceipts.filter((receipt) => receipt.tokenType === 1).reduce((acc, curr) => acc + (Number(curr.amount) / 1_000_000 || 0), 0).toFixed(2),
            burnerUSAD: uniqueBurnerReceipts.filter((receipt) => receipt.tokenType === 2).reduce((acc, curr) => acc + (Number(curr.amount) / 1_000_000 || 0), 0).toFixed(2),
            invoices: totalInvoices,
            settled: settledCount,
            pending: pendingCount,
            totalPayments,
            settlementRate: settlementRate.toFixed(1),
            averagePaymentsPerInvoice: averagePaymentsPerInvoice.toFixed(2),
            mainPaymentShare: mainPaymentShare.toFixed(1),
            burnerPaymentShare: burnerPaymentShare.toFixed(1),
            averageInvoiceAmountCredits: averageInvoiceAmountForToken(0),
            averageInvoiceAmountUSDCx: averageInvoiceAmountForToken(1),
            averageInvoiceAmountUSAD: averageInvoiceAmountForToken(2),
            mainInvoiceShare: mainInvoiceShare.toFixed(1),
            burnerInvoiceShare: burnerInvoiceShare.toFixed(1),
            multipayParticipationRate: multipayParticipationRate.toFixed(1),
            multipayInvoiceCount: multipayInvoices.length,
            engagedMultipayInvoices
        };
    }, [combinedInvoices, uniqueBurnerReceipts, uniqueMainReceipts]);

    return {
        paymentTimestampsByTxId,
        timelineReceipts,
        mainDashboardPayerReceipts,
        uniqueMainReceipts,
        uniqueBurnerReceipts,
        combinedInvoices,
        merchantStats
    };
}
