import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { InvoiceData } from '../../types/invoice';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

interface InvoiceCardProps {
    invoiceData: InvoiceData;
    resetInvoice: () => void;
    invoiceTitle: string;
    memo: string;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
    invoiceData,
    invoiceTitle,
    resetInvoice
}) => {

    const [copied, setCopied] = useState(false);
    const [copiedHash, setCopiedHash] = useState(false);
    const [copiedSalt, setCopiedSalt] = useState(false);
    const [isPaid, setIsPaid] = useState(false);

    useEffect(() => {
        if (invoiceData.type === 2 || invoiceData.type === 3) return;
        
        if (!supabaseUrl || !supabaseKey) return;
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        const channel = supabase.channel(`invoice_card_listener_${invoiceData.hash}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'invoices' },
                (payload) => {
                    const newRecord = payload.new;
                    if (newRecord.invoice_hash === invoiceData.hash) {
                        let newTxIds = [];
                        try { newTxIds = Array.isArray(newRecord.payment_tx_ids) ? newRecord.payment_tx_ids : JSON.parse(newRecord.payment_tx_ids || '[]'); } catch (e) { }

                        if (newRecord.status === 'SETTLED' || newTxIds.length > 0) {
                            setIsPaid(true);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [invoiceData.hash, invoiceData.type]);

    const handleCopy = () => {
        navigator.clipboard.writeText(invoiceData.link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <GlassCard className="text-center p-8 bg-gradient-to-b from-glass-surface to-black/40">
            <h3 className="mb-6 text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-primary to-neon-accent animate-pulse-glow">
                {isPaid ? 'Payment Received!' : 'Invoice Ready!'}
            </h3>

            <AnimatePresence mode="wait">
                {isPaid ? (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                        transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
                        className="flex flex-col items-center justify-center p-8 bg-black/40 rounded-xl border border-white/10 mb-8 min-h-[250px]"
                    >
                        <motion.svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 50 50"
                            className="w-24 h-24 mb-4"
                        >
                            <motion.circle
                                cx="25"
                                cy="25"
                                r="20"
                                stroke="#ffffff"
                                strokeWidth="3"
                                fill="none"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                            />
                            <motion.path
                                d="M15 25 L22 32 L35 15"
                                stroke="#ffffff"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.5, delay: 0.6, type: "spring", bounce: 0.5 }}
                            />
                        </motion.svg>
                        <motion.p
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.9, type: "spring" }}
                            className="text-white font-bold text-lg"
                        >
                            Standard Invoice Settled
                        </motion.p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="qr"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                        transition={{ duration: 0.4 }}
                        className="flex flex-col items-center justify-center mb-8 min-h-[250px]"
                    >
                        <div className="relative p-4 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] mb-4">
                            <QRCodeSVG
                                value={invoiceData.link}
                                size={180}
                                level="H"
                                includeMargin={false}
                            />
                            <div className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-white p-1.5 shadow-[0_8px_22px_rgba(0,0,0,0.2)]">
                                <img
                                    src="/assets/nullpay_logo.png"
                                    alt="NullPay"
                                    className="h-full w-full object-contain"
                                    style={{ filter: 'brightness(0)' }}
                                />
                            </div>
                        </div>
                        {(!invoiceData.type || invoiceData.type === 1) && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="flex items-center gap-2 mt-2"
                            >
                                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                <span className="text-sm font-medium text-gray-400 tracking-wide">Waiting for payment...</span>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
            {/* ... other code ... */}
            <div className="mb-8">
                {invoiceTitle && (
                    <div className="mb-4 rounded-xl border border-white/5 bg-black/30 px-4 py-3 text-left">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Invoice Title</span>
                        <span className="text-sm font-medium text-white">{invoiceTitle}</span>
                    </div>
                )}
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 text-left ml-1">Payment Link</label>
                <div className="flex gap-2">
                    <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-gray-300 truncate">
                        {invoiceData.link}
                    </div>
                    <Button
                        variant={copied ? "primary" : "secondary"}
                        size="md"
                        onClick={handleCopy}
                    >
                        {copied ? 'Copied!' : 'Copy'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-left">
                <div
                    onClick={() => {
                        navigator.clipboard.writeText(invoiceData.hash);
                        setCopiedHash(true);
                        setTimeout(() => setCopiedHash(false), 2000);
                    }}
                    className="p-4 rounded-xl border border-white/5 bg-black/30 hover:border-neon-primary/30 transition-colors group cursor-pointer active:scale-95"
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Hash</span>
                        {copiedHash ? (
                            <span className="text-[10px] text-neon-primary font-bold">Copied!</span>
                        ) : (
                            <svg className="w-3 h-3 text-gray-600 group-hover:text-neon-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        )}
                    </div>
                    <span className="font-mono text-neon-accent truncate block text-xs group-hover:text-neon-primary transition-colors" title={invoiceData.hash}>
                        {invoiceData.hash.slice(0, 8)}...{invoiceData.hash.slice(-8)}
                    </span>
                </div>
                <div
                    onClick={() => {
                        navigator.clipboard.writeText(invoiceData.salt);
                        setCopiedSalt(true);
                        setTimeout(() => setCopiedSalt(false), 2000);
                    }}
                    className="p-4 rounded-xl border border-white/5 bg-black/30 hover:border-purple-500/30 transition-colors group cursor-pointer active:scale-95"
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Salt</span>
                        {copiedSalt ? (
                            <span className="text-[10px] text-purple-400 font-bold">Copied!</span>
                        ) : (
                            <svg className="w-3 h-3 text-gray-600 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        )}
                    </div>
                    <span className="font-mono text-purple-400 truncate block text-xs group-hover:text-purple-300 transition-colors" title={invoiceData.salt}>
                        {invoiceData.salt.slice(0, 8)}...{invoiceData.salt.slice(-4)}
                    </span>
                </div>
            </div>

            <p className="text-gray-500 text-xs text-center mb-8">
                💡 You can verify this transaction in our <span className="text-neon-primary hover:underline cursor-pointer">Explorer</span> using these credentials.
            </p>

            <Button
                variant="outline"
                className="w-full"
                onClick={resetInvoice}
            >
                Create Another Invoice
            </Button>
        </GlassCard>
    );
};
