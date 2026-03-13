import { useEffect, useRef } from 'react';
import { io } from "socket.io-client";
import toast from 'react-hot-toast';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { createClient } from '@supabase/supabase-js';
import { PROGRAM_ID, parseMerchantReceipt } from '../utils/aleo-utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const SOCKET_BASE_URL = new URL(API_URL).origin;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// ─── Notification Sound (Web Audio API — no external file needed) ───
function playPaymentSound() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Two-tone chime: ascending notes
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

        playTone(523.25, 0, 0.15, 0.3);      // C5
        playTone(659.25, 0.12, 0.15, 0.3);    // E5
        playTone(783.99, 0.24, 0.25, 0.25);   // G5

        // Close context after sounds finish
        setTimeout(() => ctx.close(), 1000);
    } catch (e) {
        console.warn('Could not play notification sound:', e);
    }
}

// ─── Format amount for display ───
function formatAmount(amountRaw: number | string | null | undefined, isMicro: boolean = false): string {
    if (amountRaw === null || amountRaw === undefined) return '';
    const num = Number(amountRaw);
    if (isNaN(num) || num === 0) return '';
    // If micro, divide by 1M to get major units
    const actualNum = isMicro ? num / 1_000_000 : num;
    return ` — ${actualNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} `;
}

export const usePaymentMonitor = () => {
    const { address: publicKey, requestRecords, decrypt } = useWallet();

    // Track notified invoices to prevent overlap between Supabase and Socket.IO
    const notifiedInvoices = useRef<Set<string>>(new Set());
    // Track known receipt count per invoice to detect new payments
    const receiptCountPerInvoice = useRef<Map<string, number>>(new Map());

    // Fetch the latest payment amount from on-chain MerchantReceipt records.
    // Uses count-based tracking: compares current receipt count vs stored count
    // to identify the newest receipt without race conditions.
    const fetchOnChainAmount = async (invoiceHash: string): Promise<{ amount: string, token: string } | null> => {
        try {
            if (!requestRecords || !decrypt) return null;

            console.log(`🔍 [PaymentMonitor] Searching on-chain records for invoice ${invoiceHash.slice(0, 8)}...`);
            const records = await requestRecords(PROGRAM_ID, true);
            if (!records || records.length === 0) {
                console.log(`🔍 [PaymentMonitor] No records returned`);
                return null;
            }
            console.log(`🔍 [PaymentMonitor] Got ${records.length} records, parsing...`);

            // Normalize the DB hash for comparison (strip 'field' suffix if present)
            const normalizedHash = invoiceHash.replace('field', '');

            // Collect ALL matching receipts for this invoice
            const matchingReceipts: { amount: number, tokenType: number }[] = [];

            for (const r of (records as any[])) {
                if (r.spent) continue;

                let plaintext = r.plaintext;
                const cipher = r.recordCiphertext || r.ciphertext;
                if (!plaintext && cipher) {
                    try { plaintext = await decrypt(cipher); } catch (e) { continue; }
                }
                if (!plaintext) continue;

                const receipt = parseMerchantReceipt({ ...r, plaintext });
                if (!receipt) continue;

                const receiptInvHash = receipt.invoiceHash.replace('field', '');
                if (receiptInvHash === normalizedHash) {
                    matchingReceipts.push({ amount: receipt.amount, tokenType: receipt.tokenType });
                }
            }

            console.log(`🔍 [PaymentMonitor] Found ${matchingReceipts.length} matching receipts for invoice ${normalizedHash.slice(0, 8)}`);

            const previousCount = receiptCountPerInvoice.current.get(normalizedHash) ?? (matchingReceipts.length - 1);
            receiptCountPerInvoice.current.set(normalizedHash, matchingReceipts.length);

            if (matchingReceipts.length > previousCount) {
                // The newest receipt is the last one in the list
                const newest = matchingReceipts[matchingReceipts.length - 1];
                const token = newest.tokenType === 1 ? 'USDCx' : newest.tokenType === 2 ? 'USAD' : 'Credits';
                const amountStr = formatAmount(newest.amount, true);
                console.log(`✅ [PaymentMonitor] New payment detected! Amount: ${amountStr} ${token} (receipt #${matchingReceipts.length})`);
                return { amount: amountStr, token };
            }

            console.log(`⚠️ [PaymentMonitor] No new receipts (count: ${matchingReceipts.length}, previous: ${previousCount})`);
        } catch (error) {
            console.warn('Failed to fetch on-chain records:', error);
        }
        return null;
    };

    useEffect(() => {
        if (!publicKey) return;

        let socket: any = null;
        let supabaseChannel: any = null;
        let isSupabaseActive = false;

        // --- SUPABASE REALTIME (Primary) ---
        const setupSupabase = () => {
            if (!supabaseUrl || !supabaseKey) {
                console.log('⚠️ Supabase credentials missing. Falling back to Socket.IO only.');
                return;
            }

            const supabase = createClient(supabaseUrl, supabaseKey);

            supabaseChannel = supabase.channel('invoices_changes')
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'invoices' },
                    async (payload) => {
                        const oldRecord = payload.old;
                        const newRecord = payload.new;

                        let oldTxIds: string[] = [];
                        let newTxIds: string[] = [];

                        try { oldTxIds = Array.isArray(oldRecord.payment_tx_ids) ? oldRecord.payment_tx_ids : JSON.parse(oldRecord.payment_tx_ids || '[]'); } catch (e) { }
                        try { newTxIds = Array.isArray(newRecord.payment_tx_ids) ? newRecord.payment_tx_ids : JSON.parse(newRecord.payment_tx_ids || '[]'); } catch (e) { }

                        if (newTxIds.length > oldTxIds.length) {

                            // Prevent duplicate notifications for the exact same transaction hash count
                            const dedupKey = `${newRecord.invoice_hash}_${newTxIds.length}`;
                            if (notifiedInvoices.current.has(dedupKey)) return;

                            try {
                                const response = await fetch(`${API_URL}/invoice/${newRecord.invoice_hash}`);
                                if (!response.ok) return;
                                const invoiceData = await response.json();

                                if (invoiceData.merchant_address === publicKey || (listenInvoiceHash && newRecord.invoice_hash === listenInvoiceHash)) {
                                    notifiedInvoices.current.add(dedupKey);
                                    // Add base hash as well so WebSocket knows it's been handled recently
                                    // For Profile QRs (Type 2), fetch actual amount from records
                                    let amountStr = '';
                                    let tokenLabel = newRecord.token_type === 1 ? 'USDCx' : newRecord.token_type === 2 ? 'USAD' : 'Credits';

                                    if (newRecord.invoice_type === 2) {
                                        const onChain = await fetchOnChainAmount(newRecord.invoice_hash);
                                        if (onChain) {
                                            amountStr = onChain.amount;
                                            tokenLabel = onChain.token;
                                        } else {
                                            amountStr = formatAmount(newRecord.amount);
                                        }
                                    } else {
                                        amountStr = formatAmount(newRecord.amount);
                                    }

                                    const msg = amountStr
                                        ? `Payment received${amountStr}${tokenLabel} for invoice ${newRecord.invoice_hash.slice(0, 6)}...`
                                        : `Payment received for invoice ${newRecord.invoice_hash.slice(0, 6)}...`;

                                    playPaymentSound();
                                    toast.success(msg, { duration: 5000, position: 'top-right' });
                                }
                            } catch (error) {
                                console.error('Failed to verify merchant address:', error);
                            }
                        } else if (newRecord.status === 'SETTLED' && oldRecord.status !== 'SETTLED') {
                            const dedupKey = `${newRecord.invoice_hash}_SETTLED`;
                            if (notifiedInvoices.current.has(dedupKey)) return;

                            try {
                                const response = await fetch(`${API_URL}/invoice/${newRecord.invoice_hash}`);
                                if (!response.ok) return;
                                const invoiceData = await response.json();

                                if (invoiceData.merchant_address === publicKey || (listenInvoiceHash && newRecord.invoice_hash === listenInvoiceHash)) {
                                    notifiedInvoices.current.add(dedupKey);
                                    notifiedInvoices.current.add(newRecord.invoice_hash);

                                    playPaymentSound();
                                    toast.success(
                                        `Invoice ${newRecord.invoice_hash.slice(0, 6)}... settled!`,
                                        { duration: 5000, position: 'top-right' }
                                    );
                                }
                            } catch (error) { }
                        }
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        isSupabaseActive = true;
                        console.log('✅ Connected to payment monitor (Supabase Primary)');
                    } else if (status === 'CHANNEL_ERROR') {
                        isSupabaseActive = false;
                        console.log('❌ Supabase Realtime failed, relying on Socket.IO fallback');
                    }
                });
        };

        setupSupabase();

        // --- SOCKET.IO (Fallback) ---
        socket = io(SOCKET_BASE_URL);

        socket.on('connect', () => {
            // Only log WebSocket connection if we aren't using Supabase
            if (!isSupabaseActive) {
                console.log('✅ Connected to payment monitor (Socket.IO Fallback)');
            }
        });

        socket.on('payment_received', (data: any) => {
            if (data.merchantAddress !== publicKey && (!listenInvoiceHash || data.invoiceHash !== listenInvoiceHash)) return;

            // If Supabase is active, it handles ALL notifications. We completely ignore Socket.IO events
            // to prevent race conditions where Socket.IO fires slightly before Supabase's async fetch completes.
            if (isSupabaseActive) {
                return;
            }

            if (data.status === 'SETTLED') {
                const dedupKey = `${data.invoiceHash}_SETTLED`;
                if (notifiedInvoices.current.has(dedupKey)) return;
                notifiedInvoices.current.add(dedupKey);

                playPaymentSound();
                toast.success(`Invoice ${data.invoiceHash.slice(0, 6)}... settled!`, {
                    duration: 5000,
                    position: 'top-right',
                });
            } else {
                // Since Socket.IO backend event doesn't tell us exactly *which* payment it was,
                // we debounce by adding a generic hash flag and clearing it after 2 seconds
                // so we don't double-fire if the backend emits multiple rapid events for one payment.
                if (notifiedInvoices.current.has(data.invoiceHash) && data.invoiceType !== 2) return;
                notifiedInvoices.current.add(data.invoiceHash);

                let amountStr = '';
                let tokenLabel = data.tokenType === 1 ? 'USDCx' : data.tokenType === 2 ? 'USAD' : 'Credits';

                if (data.invoiceType === 2) {
                    const onChain = await fetchOnChainAmount(data.invoiceHash);
                    if (onChain) {
                        amountStr = onChain.amount;
                        tokenLabel = onChain.token;
                    } else {
                        amountStr = formatAmount(data.amount);
                    }
                } else {
                    amountStr = formatAmount(data.amount);
                }

                const msg = amountStr
                    ? `Payment received${amountStr}${tokenLabel} for invoice ${data.invoiceHash.slice(0, 6)}...`
                    : `Payment received for invoice ${data.invoiceHash.slice(0, 6)}...`;

                playPaymentSound();
                toast.success(msg, {
                    duration: 5000,
                    position: 'top-right',
                });

                // Clear the generic hash block after a short delay so future distinct payments 
                // on the same invoice can still trigger a fallback toast if needed.
                setTimeout(() => {
                    notifiedInvoices.current.delete(data.invoiceHash);
                }, 2000);
            }
        });

        return () => {
            if (socket) socket.disconnect();
            if (supabaseChannel) supabaseChannel.unsubscribe();
        };
    }, [publicKey, listenInvoiceHash]);
};
