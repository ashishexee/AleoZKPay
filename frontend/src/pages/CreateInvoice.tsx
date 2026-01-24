import React from 'react';
import { motion } from 'framer-motion';
import { useCreateInvoice } from '../hooks/useCreateInvoice';
import { InvoiceForm } from '../components/invoice/InvoiceForm';
import { InvoiceCard } from '../components/invoice/InvoiceCard';

export const CreateInvoice: React.FC = () => {
    const {
        amount, setAmount,
        expiry, setExpiry,
        memo, setMemo,
        status, loading,
        invoiceData,
        handleCreate,
        resetInvoice,
        publicKey
    } = useCreateInvoice();

    return (
        <div className="page-container min-h-screen">
            <div className="w-full max-w-6xl mx-auto pt-20 px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

                    {/* LEFT SIDE - HEADING & INFO */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-left sticky top-24"
                    >
                        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tighter loading-none">
                            Create <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-primary to-neon-accent">Invoice</span>
                        </h1>
                        <p className="text-gray-400 text-xl leading-relaxed max-w-md mb-8">
                            Generate a privacy-preserving invoice link to receive payments securely on the Aleo network.
                        </p>

                        {!invoiceData && (
                            <div className="hidden lg:block p-6 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md">
                                <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-neon-primary animate-pulse" />
                                    How it works
                                </h3>
                                <ul className="text-sm text-gray-400 space-y-3 pl-4 list-disc marker:text-neon-primary">
                                    <li>Enter the amount you wish to receive.</li>
                                    <li>Set an expiry time for the invoice.</li>
                                    <li>Share the generated link with the payer.</li>
                                    <li>Receive funds privately via ZK proofs.</li>
                                </ul>
                            </div>
                        )}
                    </motion.div>

                    {/* RIGHT SIDE - FORM OR RESULT */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="w-full"
                    >
                        {!invoiceData ? (
                            <InvoiceForm
                                amount={amount}
                                setAmount={setAmount}
                                expiry={expiry}
                                setExpiry={setExpiry}
                                memo={memo}
                                setMemo={setMemo}
                                handleCreate={handleCreate}
                                loading={loading}
                                publicKey={publicKey}
                                status={status}
                            />
                        ) : (
                            <InvoiceCard
                                invoiceData={invoiceData}
                                resetInvoice={resetInvoice}
                                expiry={expiry}
                                memo={memo}
                            />
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default CreateInvoice;
