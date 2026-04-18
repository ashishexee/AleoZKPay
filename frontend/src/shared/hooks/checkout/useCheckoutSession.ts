import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CheckoutSession } from '../../types/checkout';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const useCheckoutSession = (sessionId: string | undefined) => {
    const [session, setSession] = useState<CheckoutSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!sessionId) {
            setError("Invalid checkout URL.");
            setLoading(false);
            return;
        }

        const fetchSession = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
                const response = await fetch(`${API_URL}/checkout/sessions/${sessionId}`);

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
                        const redirectUrl = session.success_url;
                        if (newStatus === 'SETTLED' && redirectUrl) {
                            console.log(`[useCheckoutSession] Scheduling redirect to: ${redirectUrl} in 3 seconds...`);
                            setTimeout(() => {
                                try {
                                    const url = new URL(redirectUrl as string);
                                    url.searchParams.set('session_id', sessionId);
                                    window.location.href = url.toString();
                                } catch (e) {
                                    window.location.href = redirectUrl as string + `?session_id=${sessionId}`;
                                }
                            }, 3000);
                        }
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Connected to Checkout real-time monitor');
                }
            });

        // Fallback Polling Mechanism (in case Supabase Realtime requires DB config)
        const intervalId = setInterval(async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
                const response = await fetch(`${API_URL}/checkout/sessions/${sessionId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'SETTLED' && session.status !== 'SETTLED') {
                        console.log(`📡 [Polling] Checkout Session status updated to SETTLED`);
                        setSession(prev => prev ? { ...prev, status: 'SETTLED' } : prev);
                        const redirectUrl = data.success_url;
                        if (redirectUrl) {
                            console.log(`[useCheckoutSession] Scheduling redirect to: ${redirectUrl} in 3 seconds...`);
                            setTimeout(() => {
                                try {
                                    const url = new URL(redirectUrl as string);
                                    url.searchParams.set('session_id', sessionId);
                                    window.location.href = url.toString();
                                } catch (e) {
                                    window.location.href = redirectUrl as string + (redirectUrl.includes('?') ? '&' : '?') + `session_id=${sessionId}`;
                                }
                            }, 3000);
                        }
                    } else if (data.status === 'FAILED') {
                        setSession(prev => prev ? { ...prev, status: 'FAILED' } : prev);
                    }
                }
            } catch (e) {}
        }, 3000);

        return () => {
            channel.unsubscribe();
            clearInterval(intervalId);
        };
    }, [sessionId, session?.status, supabaseUrl]);

    return { session, loading, error };
};
