import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CheckoutSession } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const useCheckoutSession = (sessionId: string | undefined) => {
    const [session, setSession] = useState<CheckoutSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [executingRelayer, setExecutingRelayer] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!sessionId) {
            setError("Invalid checkout URL.");
            setLoading(false);
            return;
        }

        const fetchSession = async () => {
            try {
                // In production, use the actual backend API URL from env
                const response = await fetch(`http://localhost:3000/v1/checkout/sessions/${sessionId}`);

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error("Checkout session not found or expired.");
                    }
                    throw new Error("Failed to load checkout details.");
                }

                const data = await response.json();
                setSession(data);
            } catch (err: any) {
                setError(err.message || 'An unexpected error occurred.');
            } finally {
                setLoading(false);
            }
        };

        fetchSession();
    }, [sessionId]);

    const triggerRelayer = async () => {
        if (!sessionId || !session || session.status !== 'PROCESSING') return;
        setExecutingRelayer(true);
        try {
            const response = await fetch(`http://localhost:3000/v1/checkout/sessions/${sessionId}/execute-relayer`, {
                method: 'POST'
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to execute invoice.");
            }
            // Update local session with new hash and status
            setSession(prev => prev ? { ...prev, status: 'PENDING', invoice_hash: data.invoice_hash } : prev);
        } catch (err: any) {
            setError(err.message || 'Error generating invoice.');
        } finally {
            setExecutingRelayer(false);
        }
    };

    // Real-Time Supabase Listener
    useEffect(() => {
        if (!sessionId || !session || !supabaseUrl || !supabaseKey) return;
        if (session.status === 'SETTLED' || session.status === 'FAILED') return;

        const supabase = createClient(supabaseUrl, supabaseKey);

        const channel = supabase.channel(`checkout_session_${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'payment_intents',
                    filter: `id=eq.${sessionId}`
                },
                (payload) => {
                    const newStatus = payload.new.status;
                    if (newStatus !== session.status) {
                        console.log(`📡 [Real-Time] Checkout Session status updated: ${newStatus}`);
                        setSession(prev => prev ? { ...prev, status: newStatus as any } : prev);

                        // If it settled, handle the automatic redirect
                        const redirectUrl = payload.new.success_url || session.success_url;
                        console.log(`[useCheckoutSession] Status changed to ${newStatus}. Payload success_url: ${payload.new.success_url}, Local: ${session.success_url}, Chosen: ${redirectUrl}`);
                        if (newStatus === 'SETTLED' && redirectUrl) {
                            console.log(`[useCheckoutSession] Scheduling WebSocket redirect to: ${redirectUrl} in 3 seconds...`);
                            setTimeout(() => {
                                console.log(`[useCheckoutSession] Executing WebSocket redirect now!`);
                                try {
                                    const url = new URL(redirectUrl as string);
                                    url.searchParams.set('session_id', sessionId);
                                    window.location.href = url.toString();
                                } catch (e) {
                                    window.location.href = redirectUrl as string + `?session_id=${sessionId}`;
                                }
                            }, 3000); // Wait 3 seconds to show the pretty success screen
                        }
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Connected to Checkout real-time monitor');
                }
            });

        return () => {
            channel.unsubscribe();
        };
    }, [sessionId, session?.status, supabaseUrl]);

    return { session, loading, error, triggerRelayer, executingRelayer };
};
