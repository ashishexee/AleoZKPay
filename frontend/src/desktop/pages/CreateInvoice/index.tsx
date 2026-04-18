import React from 'react';
import { motion } from 'framer-motion';
import { pageVariants } from '../../../shared/utils/animations';
import { useCreateInvoice } from '../../../shared/hooks/useCreateInvoice';
import { InvoiceForm } from '../../../shared/components/invoice/InvoiceForm';
import { InvoiceCard } from '../../../shared/components/invoice/InvoiceCard';
import { USDCxInfo } from '../../components/USDCxInfo';
import { useBurnerWallet } from '../../../shared/hooks/BurnerWalletProvider';

export const CreateInvoice: React.FC = () => {
    const {
        amount, setAmount,
        invoiceTitle, setInvoiceTitle,
        memo, setMemo,
        status, loading,
        invoiceData,
        handleCreate,
        resetInvoice,
        publicKey,
        invoiceType,
        setInvoiceType,
        tokenType,
        setTokenType,
        walletType,
        setWalletType,
        forSdk,
        setForSdk,
        selectedAllowedTokens,
        setSelectedAllowedTokens,
        items,
        showItems,
        setShowItems,
        addItem,
        updateItem,
        removeItem
    } = useCreateInvoice();

    const { burnerAddress } = useBurnerWallet();
    const hasBurnerWallet = !!burnerAddress;
    const invoiceTypeLabel = invoiceType === 'standard' ? 'Standard invoice' : invoiceType === 'multipay' ? 'Multi-pay invoice' : 'Donation invoice';
    const walletTypeLabel = walletType === 1 ? 'Burner wallet' : 'Main wallet';
    const baseCurrencyLabel = tokenType === 0 ? 'CREDITS' : tokenType === 1 ? 'USDCX' : tokenType === 2 ? 'USAD' : 'ANY';
    const acceptsMultipleCurrencies = tokenType !== 3 && !!selectedAllowedTokens && selectedAllowedTokens.length > 1;

    return (
        <motion.div
            className="page-container relative min-h-screen"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 rounded-full blur-[120px] animate-float" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-zinc-800/20 rounded-full blur-[100px] animate-float-delayed" />
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-white/5 rounded-full blur-[120px] animate-pulse-slow" />
            </div>

            {/* ALEO GLOBE BACKGROUND */}
            <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-screen h-[800px] z-0 pointer-events-none flex justify-center overflow-hidden">
                <img
                    src="/assets/aleo_globe.png"
                    alt="Aleo Globe"
                    className="w-full h-full object-cover opacity-50 mix-blend-screen mask-image-gradient-b"
                    style={{
                        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                    }}
                />
            </div>
            <div className="w-full max-w-7xl mx-auto pt-12 px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center text-center mb-8"
                >
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter leading-tight text-white">
                        Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">Null Invoice</span>
                    </h1>
                    <p className="text-gray-300 text-xl leading-relaxed max-w-2xl mb-2">
                        Generate a privacy-preserving Null Invoice link to receive payments securely on the Aleo network.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 gap-8 items-start max-w-2xl lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="w-full"
                    >
                        {!invoiceData ? (
                            <InvoiceForm
                                amount={amount}
                                setAmount={setAmount}
                                invoiceTitle={invoiceTitle}
                                setInvoiceTitle={setInvoiceTitle}
                                memo={memo}
                                setMemo={setMemo}
                                handleCreate={handleCreate}
                                loading={loading}
                                publicKey={publicKey}
                                status={status}
                                invoiceType={invoiceType}
                                setInvoiceType={setInvoiceType}
                                tokenType={tokenType}
                                setTokenType={setTokenType}
                                walletType={walletType}
                                setWalletType={setWalletType}
                                forSdk={forSdk}
                                setForSdk={setForSdk}
                                selectedAllowedTokens={selectedAllowedTokens}
                                setSelectedAllowedTokens={setSelectedAllowedTokens}
                                hasBurnerWallet={hasBurnerWallet}
                                items={items}
                                showItems={showItems}
                                setShowItems={setShowItems}
                                addItem={addItem}
                                updateItem={updateItem}
                                removeItem={removeItem}
                            />
                        ) : (
                            <InvoiceCard
                                invoiceData={invoiceData}
                                resetInvoice={resetInvoice}
                                invoiceTitle={invoiceTitle}
                                memo={memo}
                            />
                        )}
                    </motion.div>

<motion.aside
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="hidden lg:flex lg:flex-col lg:gap-4 lg:sticky lg:top-8"
                    >
                        <div className="rounded-[28px] border border-white/10 bg-black/30 backdrop-blur-xl p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gray-500">Live Preview</p>
                            <div className="mt-6 space-y-3">
                                <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3">
                                    <span className="text-xs uppercase tracking-[0.22em] text-gray-500">Title</span>
                                    <span className="text-sm font-medium text-white text-right max-w-[160px] truncate">{invoiceTitle || 'Untitled'}</span>
                                </div>
                                {memo && (
                                    <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3">
                                        <span className="text-xs uppercase tracking-[0.22em] text-gray-500">Memo</span>
                                        <span className="text-sm font-medium text-white text-right max-w-[160px] truncate">{memo}</span>
                                    </div>
                                )}
                                <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3">
                                    <span className="text-xs uppercase tracking-[0.22em] text-gray-500">Amount</span>
                                    <span className="text-sm font-medium text-white text-right">{amount ? `$${amount}` : 'Variable'}</span>
                                </div>
                                <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3">
                                    <span className="text-xs uppercase tracking-[0.22em] text-gray-500">Currency</span>
                                    <span className="text-sm font-medium text-white text-right">{baseCurrencyLabel}</span>
                                </div>
                                <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3">
                                    <span className="text-xs uppercase tracking-[0.22em] text-gray-500">Type</span>
                                    <span className="text-sm font-medium text-white text-right">{invoiceTypeLabel}</span>
                                </div>
                                <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3">
                                    <span className="text-xs uppercase tracking-[0.22em] text-gray-500">Wallet</span>
                                    <span className="text-sm font-medium text-white text-right">{walletTypeLabel}</span>
                                </div>
                                <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3">
                                    <span className="text-xs uppercase tracking-[0.22em] text-gray-500">Settlement</span>
                                    <span className="text-sm font-medium text-white text-right">{acceptsMultipleCurrencies ? 'Multi-token' : 'Single-token'}</span>
                                </div>
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-xs uppercase tracking-[0.22em] text-gray-500">Line Items</span>
                                    <span className="text-sm font-medium text-white text-right">{showItems ? `Enabled (${items.length})` : 'Disabled'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-6">
                            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gray-500">Guidance</p>
                            <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-300">
                                <p>
                                    Use a <span className="text-orange-400 font-medium">short, clear title</span> so payers instantly know what they're paying for.
                                </p>
                                <p>
                                    <span className="text-orange-400 font-medium">Standard</span> invoices are best for fixed one-time payments with a set amount. <span className="text-orange-400 font-medium">Multi-pay</span> suits recurring or installment-based collections. <span className="text-orange-400 font-medium">Donation</span> mode lets the payer choose any amount — ideal for tips or contributions.
                                </p>
                                <p>
                                    The <span className="text-orange-400 font-medium">memo field</span> is optional but recommended — it appears on the invoice and helps payers reference their purchase.
                                </p>
                                <p>
                                    <span className="text-orange-400 font-medium">Burner wallet</span> keeps your main Aleo wallet separate and adds a layer of privacy. <span className="text-orange-400 font-medium">Main wallet</span> uses your primary address directly.
                                </p>
                                <p>
                                    <span className="text-orange-400 font-medium">Multi-token settlement</span> lets payers choose from several supported tokens (USDCX, CREDITS, USAD). Only enable it when you genuinely want to offer currency flexibility — otherwise <span className="text-orange-400 font-medium">single-token</span> keeps things simpler.
                                </p>
                                <p>
                                    <span className="text-orange-400 font-medium">Line items</span> break down a total into multiple line items — useful for itemized billing or splitting a payment across several categories.
                                </p>
                                <p>
                                    For SDK integration, enable the <span className="text-orange-400 font-medium">for SDK</span> flag to get a programmatic integration token for custom workflows.
                                </p>
                            </div>
                        </div>
                    </motion.aside>
                </div>
            </div>

            <USDCxInfo />
        </motion.div>
    );
};

export default CreateInvoice;
