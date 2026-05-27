import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { createClient } from '@supabase/supabase-js';
import { PROGRAM_ID, WALLET_PROGRAM_ID, parseMerchantReceipt } from '../../utils/aleo/aleoUtils';
import { hashAddress } from '../../utils/core/crypto';
import { useWalletErrorHandler } from '../wallet/WalletErrorBoundary';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const RECORD_CACHE_TTL_MS = 15_000;
const RECORD_SCAN_THROTTLE_MS = 10_000;

// Module-level state persists across provider mount/unmount cycles
const moduleNotifiedInvoices = new Set<string>();
const moduleLastSoundPlayed = new Map<string, number>();
let moduleCachedRecords: { fetchedAt: number; records: any[] } | null = null;
let moduleRecordsRequestInFlight: Promise<any[]> | null = null;
let moduleScanThrottleUntil = 0;

function playPaymentSound() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

        const playTone = (freq: number, start: number, duration: number, gain: number) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            g.gain.setValueAtTime(gain, ctx.currentTime + start);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + duration);
        };

        playTone(523.25, 0, 0.15, 0.3);
        playTone(659.25, 0.12, 0.15, 0.3);
        playTone(783.99, 0.24, 0.25, 0.25);

        setTimeout(() => ctx.close(), 1000);
    } catch (e) {
        console.warn('Could not play notification sound:', e);
    }
}

function formatAmount(amountRaw: number | string | null | undefined, isMicro: boolean = false): string {
    if (amountRaw === null || amountRaw === undefined) return '';
    const num = Number(amountRaw);
    if (isNaN(num) || num === 0) return '';
    const actualNum = isMicro ? num / 1_000_000 : num;
    return ` - ${actualNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} `;
}

export const usePaymentMonitor = () => {
    let publicKey: string | null = null;
    let requestRecords: ((program: string, unspent: boolean) => Promise<any>) | undefined = undefined;
    let decrypt: ((cipher: string) => Promise<string>) | undefined = undefined;
    let handleWalletError: ((error: unknown) => boolean) = () => false;

    try {
        const wallet = useWallet();
        publicKey = wallet.address || null;
        requestRecords = wallet.requestRecords;
        decrypt = wallet.decrypt;
    } catch {
        // Wallet providers not mounted — landing page, skip monitoring
        return;
    }

    try {
        const errorHandler = useWalletErrorHandler();
        handleWalletError = errorHandler.handleWalletError;
    } catch {
        // Wallet error boundary not mounted — use no-op fallback
    }

    // Module-level persistence across provider mount/unmount cycles
    const notifiedInvoices = useRef<Set<string>>(moduleNotifiedInvoices);
    const lastSoundPlayed = useRef<Map<string, number>>(moduleLastSoundPlayed);
    const cachedRecords = useRef<{ fetchedAt: number; records: any[] } | null>(moduleCachedRecords);
    const recordsRequestInFlight = useRef<Promise<any[]> | null>(moduleRecordsRequestInFlight);
    const scanThrottleUntil = useRef(moduleScanThrottleUntil);

    const getMergedWalletRecords = async (forceFresh: boolean = false): Promise<any[]> => {
        if (!requestRecords) return [];

        const now = Date.now();
        if (!forceFresh && cachedRecords.current && now - cachedRecords.current.fetchedAt < RECORD_CACHE_TTL_MS) {
            return cachedRecords.current.records;
        }

        if (recordsRequestInFlight.current) {
            return recordsRequestInFlight.current;
        }

        const request = Promise.all([
            requestRecords(PROGRAM_ID, true),
            requestRecords(WALLET_PROGRAM_ID, true)
        ]).then(([baseRecords, walletRecords]) => {
            const records = [
                ...(baseRecords ? (baseRecords as any[]) : []),
                ...(walletRecords ? (walletRecords as any[]) : [])
            ];
            cachedRecords.current = { fetchedAt: Date.now(), records };
            return records;
        }).finally(() => {
            recordsRequestInFlight.current = null;
        });

        recordsRequestInFlight.current = request;
        return request;
    };

    const fetchOnChainAmount = async (invoiceHash: string, expectedCount: number): Promise<{ amount: string; token: string } | null> => {
        try {
            if (!requestRecords || !decrypt) return null;

            const normalizedHash = invoiceHash.replace('field', '');
            const retryDelays = [3000, 5000, 8000, 12000];

            for (let attempt = 0; attempt < retryDelays.length; attempt++) {
                console.log(`🔍 [PaymentMonitor] Attempt ${attempt + 1}/${retryDelays.length}: waiting ${retryDelays[attempt]}ms for on-chain sync...`);
                await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));

                const shouldForceFresh = attempt > 0 || Date.now() >= scanThrottleUntil.current;
                const records = await getMergedWalletRecords(shouldForceFresh);
                if (shouldForceFresh) {
                    scanThrottleUntil.current = Date.now() + RECORD_SCAN_THROTTLE_MS;
                }

                if (records.length === 0) continue;

                const matchingReceipts: { amount: number; tokenType: number }[] = [];

                for (const record of records) {
                    if (record.spent) continue;

                    let plaintext = record.plaintext;
                    const cipher = record.recordCiphertext || record.ciphertext;
                    if (!plaintext && cipher) {
                        try {
                            plaintext = await decrypt(cipher);
                        } catch {
                            continue;
                        }
                    }
                    if (!plaintext) continue;

                    const receipt = parseMerchantReceipt({ ...record, plaintext });
                    if (!receipt) continue;

                    const receiptInvHash = receipt.invoiceHash.replace('field', '');
                    if (receiptInvHash === normalizedHash) {
                        matchingReceipts.push({ amount: receipt.amount, tokenType: receipt.tokenType });
                    }
                }

                console.log(`🔍 [PaymentMonitor] Attempt ${attempt + 1}: found ${matchingReceipts.length} receipts (expected: ${expectedCount})`);

                if (matchingReceipts.length >= expectedCount) {
                    const newest = matchingReceipts[matchingReceipts.length - 1];
                    const token = newest.tokenType === 1 ? 'USDCx' : newest.tokenType === 2 ? 'USAD' : 'Credits';
                    return { amount: formatAmount(newest.amount, true), token };
                }
            }
        } catch (error) {
            handleWalletError(error);
            console.warn('Failed to fetch on-chain records:', error);
        }

        return null;
    };

    useEffect(() => {
        if (!publicKey || !supabaseUrl || !supabaseKey) return;
        if (window.location.pathname === '/') return; // skip on home page

        let cancelled = false;
        let supabaseChannel: { unsubscribe: () => void } | null = null;
        let notifyOnSettled = false;

        const triggerNotification = (message: string, invoiceHash: string, withSound: boolean = true) => {
            console.log(`📣 [Notification Triggered]: ${message} | Sound: ${withSound}`);

            if (withSound) {
                const now = Date.now();
                const lastPlayed = lastSoundPlayed.current.get(invoiceHash) || 0;
                if (now - lastPlayed > 5000) {
                    playPaymentSound();
                    lastSoundPlayed.current.set(invoiceHash, now);
                }
            }

            toast.success(message, {
                id: invoiceHash,
                duration: 6000,
                position: 'top-right'
            });
        };

        const setupSupabase = async () => {
            try {
                const currentHash = await hashAddress(publicKey);
                if (cancelled) return;

                try {
                    const { getNotificationPreferences } = await import('../../services/api');
                    const prefs = await getNotificationPreferences(publicKey);
                    notifyOnSettled = prefs.notify_on_settled;
                } catch {}

                const supabase = createClient(supabaseUrl, supabaseKey);
                supabaseChannel = supabase
                    .channel(`invoices_changes_${currentHash}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'invoices',
                            filter: `merchant_address_hash=eq.${currentHash}`
                        },
                        async (payload) => {
                            const oldRecord = payload.old;
                            const newRecord = payload.new;

                            let oldTxIds: string[] = [];
                            let newTxIds: string[] = [];

                            try {
                                oldTxIds = Array.isArray(oldRecord.payment_tx_ids) ? oldRecord.payment_tx_ids : JSON.parse(oldRecord.payment_tx_ids || '[]');
                            } catch {}
                            try {
                                newTxIds = Array.isArray(newRecord.payment_tx_ids) ? newRecord.payment_tx_ids : JSON.parse(newRecord.payment_tx_ids || '[]');
                            } catch {}

                            if (newTxIds.length > oldTxIds.length) {
                                const dedupKey = `${newRecord.invoice_hash}_TX_${newTxIds.length}`;
                                if (notifiedInvoices.current.has(dedupKey)) return;
                                notifiedInvoices.current.add(dedupKey);

                                try {
                                    const initializingMsg = `Payment processing for invoice ${newRecord.invoice_hash.slice(0, 6)}... fetching exact amount...`;
                                    triggerNotification(initializingMsg, newRecord.invoice_hash, true);

                                    let amountStr = '';
                                    let tokenLabel = newRecord.token_type === 1 ? 'USDCx' : newRecord.token_type === 2 ? 'USAD' : 'Credits';

                                    if (newRecord.invoice_type === 2) {
                                        const onChain = await fetchOnChainAmount(newRecord.invoice_hash, newTxIds.length);
                                        if (onChain) {
                                            amountStr = onChain.amount;
                                            tokenLabel = onChain.token;
                                        } else {
                                            amountStr = formatAmount(newRecord.amount);
                                        }
                                    } else {
                                        amountStr = formatAmount(newRecord.amount);
                                    }

                                    const finalMsg = amountStr
                                        ? `Payment received${amountStr}${tokenLabel} for invoice ${newRecord.invoice_hash.slice(0, 6)}!`
                                        : `Payment received for invoice ${newRecord.invoice_hash.slice(0, 6)}!`;

                                    triggerNotification(finalMsg, newRecord.invoice_hash, false);
                                } catch (error) {
                                    console.error('Failed to process payment event:', error);
                                }
                            } else if (notifyOnSettled && newRecord.status === 'SETTLED' && oldRecord.status !== 'SETTLED') {
                                const dedupKey = `${newRecord.invoice_hash}_SETTLED`;
                                if (notifiedInvoices.current.has(dedupKey)) return;
                                notifiedInvoices.current.add(dedupKey);

                                try {
                                    triggerNotification(`Invoice ${newRecord.invoice_hash.slice(0, 6)}... settled!`, newRecord.invoice_hash, false);
                                } catch (error) {
                                    console.error('Failed to process settled event:', error);
                                }
                            }
                        }
                    )
                    .subscribe();
            } catch (error) {
                console.error('Failed to initialize payment monitor:', error);
            }
        };

        void setupSupabase();

        return () => {
            cancelled = true;
            supabaseChannel?.unsubscribe();
        };
    }, [decrypt, handleWalletError, publicKey, requestRecords]);
};
