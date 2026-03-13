import { useEffect, useRef } from 'react';
import { io } from "socket.io-client";
import toast from 'react-hot-toast';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { createClient } from '@supabase/supabase-js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const SOCKET_BASE_URL = new URL(API_URL).origin;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const usePaymentMonitor = (listenInvoiceHash?: string) => {
    const { address: publicKey } = useWallet();

    // Track notified invoices to prevent overlap between Supabase and Socket.IO
    const notifiedInvoices = useRef<Set<string>>(new Set());

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
                                    notifiedInvoices.current.add(newRecord.invoice_hash);

                                    toast.success(
                                        `Payment received for invoice ${newRecord.invoice_hash.slice(0, 6)}...`,
                                        { duration: 5000, position: 'top-right' }
                                    );
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

                toast.success(`Invoice ${data.invoiceHash.slice(0, 6)}... settled!`, {
                    duration: 5000,
                    position: 'top-right',
                });
            } else {
                // Since Socket.IO backend event doesn't tell us exactly *which* payment it was,
                // we debounce by adding a generic hash flag and clearing it after 2 seconds
                // so we don't double-fire if the backend emits multiple rapid events for one payment.
                if (notifiedInvoices.current.has(data.invoiceHash)) return;
                notifiedInvoices.current.add(data.invoiceHash);

                toast.success(`Payment received for invoice ${data.invoiceHash.slice(0, 6)}...`, {
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
