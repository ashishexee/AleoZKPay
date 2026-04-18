import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useBurnerWallet } from '../wallet/BurnerWalletProvider';
import { useTransactions } from '../transactions/useTransactions';
import { useWalletErrorHandler } from '../wallet/WalletErrorBoundary';
import {
    PROGRAM_ID,
    WALLET_PROGRAM_ID,
    parseMerchantReceipt,
    parseInvoice,
    parsePayerReceipt,
    fetchBurnerRecordsFromTx
} from '../../utils/aleo-utils';
import { InvoiceRecord } from '../../types/invoice';
import { MerchantReceipt, PayerReceipt } from '../../types/receipt';

export function useProfileData(publicKey: string | undefined | null) {
    const { requestRecords, decrypt } = useWallet();
    const { handleWalletError } = useWalletErrorHandler();
    const { decryptedBurnerKey, decryptedBurnerAddress } = useBurnerWallet();

    const { transactions: mainTransactions, loading: loadingTransactions, fetchTransactions } = useTransactions(publicKey || undefined);
    const [burnerDbTransactions, setBurnerDbTransactions] = useState<any[]>([]);

    const [createdInvoices, setCreatedInvoices] = useState<InvoiceRecord[]>([]);
    const [merchantReceipts, setMerchantReceipts] = useState<MerchantReceipt[]>([]);
    const [payerReceipts, setPayerReceipts] = useState<PayerReceipt[]>([]);
    const [burnerCreatedInvoices, setBurnerCreatedInvoices] = useState<InvoiceRecord[]>([]);
    const [burnerMerchantReceipts, setBurnerMerchantReceipts] = useState<MerchantReceipt[]>([]);

    const [loadingCreated, setLoadingCreated] = useState(false);
    const [loadingReceipts, setLoadingReceipts] = useState(false);
    const [loadingPayerReceipts, setLoadingPayerReceipts] = useState(false);
    const [loadingBurner, setLoadingBurner] = useState(true);

    const [profileMainHash, setProfileMainHash] = useState<string | null>(null);
    const [profileBurnerHash, setProfileBurnerHash] = useState<string | null>(null);
    const fetchPayerReceiptsRef = useRef(0);

    const transactions = useMemo(() => {
        const merged = [...mainTransactions];
        const existingHashes = new Set(mainTransactions.map(t => t.invoice_hash));
        burnerDbTransactions.forEach(t => {
            if (!existingHashes.has(t.invoice_hash)) {
                merged.push(t);
            }
        });
        return merged;
    }, [mainTransactions, burnerDbTransactions]);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (publicKey) {
                try {
                    const { getUserProfile } = await import('../../services/api');
                    const profile = await getUserProfile(publicKey);
                    if (profile) {
                        setProfileMainHash(profile.profile_main_invoice_hash || null);
                        setProfileBurnerHash(profile.profile_burner_invoice_hash || null);
                    }
                } catch (e) {
                    console.error("Failed to fetch profile hashes", e);
                }
            }
        };
        fetchProfileData();
    }, [publicKey]);

    useEffect(() => {
        const fetchBurnerDbInvoices = async () => {
            if (!decryptedBurnerAddress) {
                setBurnerDbTransactions([]);
                return;
            }
            try {
                const { fetchInvoicesByMerchant } = await import('../../services/api');
                const data = await fetchInvoicesByMerchant(decryptedBurnerAddress);
                setBurnerDbTransactions(data);
            } catch (e) {
                console.error('Failed to fetch burner DB invoices', e);
            }
        };
        fetchBurnerDbInvoices();
    }, [decryptedBurnerAddress]);

    const fetchCreatedInvoices = useCallback(async () => {
        if (!requestRecords || !publicKey) return;
        setLoadingCreated(true);
        try {
            const records = await requestRecords(PROGRAM_ID, true);
            const validInvoices: InvoiceRecord[] = [];
            if (records) {
                for (const r of (records as any[])) {
                    if (r.spent) continue;
                    let plaintext = r.plaintext;
                    const cipher = r.recordCiphertext || r.ciphertext;
                    if (!plaintext && cipher && decrypt) {
                        try { plaintext = await decrypt(cipher); } catch (e) { }
                    }
                    const invoice = parseInvoice({ ...r, plaintext });
                    if (invoice) validInvoices.push(invoice);
                }
            }
            setCreatedInvoices(validInvoices.reverse());
        } catch (e) {
            handleWalletError(e);
        } finally {
            setLoadingCreated(false);
        }
    }, [requestRecords, publicKey, decrypt, handleWalletError]);

    const fetchMerchantReceipts = useCallback(async () => {
        if (!requestRecords || !publicKey) return;
        setLoadingReceipts(true);
        try {
            const [coreRecords, walletRecords] = await Promise.all([
                requestRecords(PROGRAM_ID, true),
                requestRecords(WALLET_PROGRAM_ID, true)
            ]);
            const validReceipts: MerchantReceipt[] = [];
            const allRecords = [...((coreRecords as any[]) || []), ...((walletRecords as any[]) || [])];
            if (allRecords.length > 0) {
                for (const r of allRecords) {
                    if (r.spent) continue;
                    let plaintext = r.plaintext;
                    const cipher = r.recordCiphertext || r.ciphertext;
                    if (!plaintext && cipher && decrypt) {
                        try { plaintext = await decrypt(cipher); } catch (e) { }
                    }
                    const receipt = parseMerchantReceipt({ ...r, plaintext });
                    if (receipt) validReceipts.push(receipt);
                }
            }
            const dedupedReceipts = Array.from(new Map(validReceipts.map((r) => [r.receiptHash, r])).values());
            setMerchantReceipts(dedupedReceipts.reverse());
        } catch (e) {
            handleWalletError(e);
        } finally {
            setLoadingReceipts(false);
        }
    }, [requestRecords, publicKey, decrypt, handleWalletError]);

    const fetchPayerReceipts = useCallback(async () => {
        if (!requestRecords || !publicKey) return;
        const fetchId = ++fetchPayerReceiptsRef.current;
        setLoadingPayerReceipts(true);
        try {
            const [coreRecords, walletRecords] = await Promise.all([
                requestRecords(PROGRAM_ID, true),
                requestRecords(WALLET_PROGRAM_ID, true)
            ]);
            if (fetchId !== fetchPayerReceiptsRef.current) return;
            const allRecords = [...((coreRecords as any[]) || []), ...((walletRecords as any[]) || [])];
            const validReceipts: PayerReceipt[] = [];
            for (const r of allRecords) {
                let plaintext = r.plaintext;
                const cipher = r.recordCiphertext || r.ciphertext;
                if (!plaintext && cipher && decrypt) {
                    try { plaintext = await decrypt(cipher); } catch (e) { }
                }
                const receipt = parsePayerReceipt({ ...r, plaintext });
                if (receipt) validReceipts.push(receipt);
            }
            setPayerReceipts([...validReceipts].reverse());
        } catch (e) {
            handleWalletError(e);
        } finally {
            if (fetchId === fetchPayerReceiptsRef.current) {
                setLoadingPayerReceipts(false);
            }
        }
    }, [requestRecords, publicKey, decrypt, handleWalletError]);

    useEffect(() => {
        const fetchBurnerData = async () => {
            if (!decryptedBurnerKey || transactions.length === 0) {
                if (!decryptedBurnerKey) setLoadingBurner(false);
                return;
            }
            setLoadingBurner(true);
            const burnerTxIds = new Set<string>();
            transactions.forEach(tx => {
                if (tx.is_burner) {
                    if (tx.invoice_transaction_id) burnerTxIds.add(tx.invoice_transaction_id);
                    if (tx.payment_tx_ids && Array.isArray(tx.payment_tx_ids)) {
                        tx.payment_tx_ids.forEach((id: string) => burnerTxIds.add(id));
                    }
                }
            });
            if (burnerTxIds.size === 0) {
                setLoadingBurner(false);
                return;
            }
            const newCreated: InvoiceRecord[] = [];
            const newReceipts: MerchantReceipt[] = [];
            for (const txId of Array.from(burnerTxIds)) {
                const records = await fetchBurnerRecordsFromTx(txId, decryptedBurnerKey);
                for (const r of records) {
                    const invoice = parseInvoice(r);
                    if (invoice) newCreated.push(invoice);
                    const receipt = parseMerchantReceipt(r);
                    if (receipt) newReceipts.push(receipt);
                }
            }
            setBurnerCreatedInvoices(newCreated);
            setBurnerMerchantReceipts(newReceipts);
            setLoadingBurner(false);
        };
        fetchBurnerData();
    }, [transactions, decryptedBurnerKey]);

    useEffect(() => {
        if (publicKey) {
            fetchTransactions();
            fetchCreatedInvoices();
            fetchMerchantReceipts();
            fetchPayerReceipts();
        }
    }, [publicKey, fetchTransactions, fetchCreatedInvoices, fetchMerchantReceipts, fetchPayerReceipts]);

    const refreshPaymentTimeline = useCallback(async () => {
        if (!publicKey) return;
        await Promise.all([
            fetchTransactions(),
            fetchMerchantReceipts()
        ]);
    }, [publicKey, fetchTransactions, fetchMerchantReceipts]);

    return {
        transactions,
        loadingTransactions,
        createdInvoices,
        merchantReceipts,
        payerReceipts,
        burnerCreatedInvoices,
        burnerMerchantReceipts,
        loadingCreated,
        loadingReceipts,
        loadingPayerReceipts,
        loadingBurner,
        decryptedBurnerKey,
        decryptedBurnerAddress,
        profileMainHash,
        profileBurnerHash,
        fetchCreatedInvoices,
        fetchMerchantReceipts,
        fetchPayerReceipts,
        fetchTransactions,
        refreshPaymentTimeline
    };
}
