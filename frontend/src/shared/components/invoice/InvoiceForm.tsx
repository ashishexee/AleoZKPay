import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { InvoiceType } from '../../hooks/invoice/useCreateInvoice';
import { InvoiceItem } from '../../types/invoice';
import { getUtf8ByteLength, LEO_INVOICE_TITLE_MAX_BYTES, LEO_MEMO_MAX_BYTES } from '../../utils/core/leoInputLimits';
import { getTokenLabel } from '../../utils/payments/tokens';
import { Info, HelpCircle } from 'lucide-react';

interface InvoiceFormProps {
    amount: number | '';
    setAmount: (val: number | '') => void;
    invoiceTitle: string;
    setInvoiceTitle: (val: string) => void;
    memo: string;
    setMemo: (val: string) => void;
    handleCreate: () => void;
    loading: boolean;
    publicKey: string | null;
    status: string;
    invoiceType: InvoiceType;
    setInvoiceType: (val: InvoiceType) => void;
    tokenType: number;
    setTokenType: (val: number) => void;
    walletType: number;
    setWalletType: (val: number) => void;
    forSdk: boolean;
    setForSdk: (val: boolean) => void;
    selectedAllowedTokens?: string[];
    setSelectedAllowedTokens?: (tokens: string[]) => void;
    hasBurnerWallet: boolean;
    items: InvoiceItem[];
    showItems: boolean;
    setShowItems: (val: boolean) => void;
    addItem: () => void;
    updateItem: (index: number, field: keyof InvoiceItem, value: string | number) => void;
    removeItem: (index: number) => void;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
    amount,
    setAmount,
    invoiceTitle,
    setInvoiceTitle,
    memo,
    setMemo,
    handleCreate,
    loading,
    publicKey,
    status,
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
    hasBurnerWallet,
    items,
    showItems,
    setShowItems,
    addItem,
    updateItem,
    removeItem
}) => {
    const invoiceTitleBytes = getUtf8ByteLength(invoiceTitle);
    const invoiceTitleTooLong = invoiceTitleBytes > LEO_INVOICE_TITLE_MAX_BYTES;
    const memoBytes = getUtf8ByteLength(memo);
    const memoTooLong = memoBytes > LEO_MEMO_MAX_BYTES;

    return (
        <GlassCard variant="heavy" className="p-8">
            <div className="space-y-6">

                {/* INVOICE TYPE TOGGLE */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Invoice Type</label>
                        <div className="relative group/type-info flex items-center justify-center">
                            <HelpCircle size={14} className="text-gray-500 hover:text-white cursor-help transition-colors" />
                            <div className="absolute left-0 top-full mt-2 w-64 opacity-0 invisible group-hover/type-info:opacity-100 group-hover/type-info:visible transition-all duration-300 z-50">
                                <div className="bg-[#0A0A0A] backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-[10px] space-y-2">
                                    <div className="text-gray-400">
                                        <span className="text-white font-bold block mb-0.5">Standard</span>
                                        Through this type of invoice you can get only one payment. Invoice closes after success.
                                    </div>
                                    <div className="text-gray-400 border-t border-white/5 pt-2">
                                        <span className="text-purple-400 font-bold block mb-0.5">Multi Pay</span>
                                        Allows multiple payments. Ideal for recurring billing or community campaigns.
                                    </div>
                                    <div className="text-gray-400 border-t border-white/5 pt-2">
                                        <span className="text-pink-400 font-bold block mb-0.5">Donation</span>
                                        Open-amount fundraising where payer and receiver identities remain private.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-1 bg-black/20 rounded-xl flex gap-1 border border-white/5">
                        <button
                            onClick={() => {
                                setInvoiceType('standard');
                            }}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${invoiceType === 'standard'
                                ? 'bg-neon-primary text-black shadow-lg shadow-neon-primary/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Standard
                        </button>
                        <button
                            onClick={() => {
                                setInvoiceType('multipay');
                            }}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${invoiceType === 'multipay'
                                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Multi Pay
                        </button>
                        <button
                            onClick={() => setInvoiceType('donation')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${invoiceType === 'donation'
                                ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Donation
                        </button>
                    </div>
                </div>

                {/* WALLET TYPE TOGGLE */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Receiving Wallet</label>
                        <div className="relative group/wallet-info flex items-center justify-center">
                            <HelpCircle size={14} className="text-gray-500 hover:text-white cursor-help transition-colors" />
                            <div className="absolute left-0 top-full mt-2 w-64 opacity-0 invisible group-hover/wallet-info:opacity-100 group-hover/wallet-info:visible transition-all duration-300 z-50">
                                <div className="bg-[#0A0A0A] backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-[10px] space-y-2">
                                    <div className="text-gray-400">
                                        <span className="text-white font-bold block mb-0.5">Main Wallet</span>
                                        Settles directly to your primary Aleo address. Simple and direct.
                                    </div>
                                    <div className="text-gray-400 border-t border-white/5 pt-2">
                                        <span className="text-emerald-400 font-bold block mb-0.5">Burner Wallet</span>
                                        Enhanced Privacy — Payer will not see your real address. Highly recommended.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-1 bg-black/20 rounded-xl flex gap-1 border border-white/5">
                        <button
                            onClick={() => setWalletType(0)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${walletType === 0
                                ? 'bg-white text-black shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            Main Wallet
                        </button>
                        <button
                            onClick={() => hasBurnerWallet ? setWalletType(1) : null}
                            disabled={!hasBurnerWallet}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${walletType === 1
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                : !hasBurnerWallet
                                    ? 'text-gray-600 cursor-not-allowed'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            🔒 Burner Wallet
                        </button>
                    </div>
                    {walletType === 1 && (
                        <div className="mt-2 text-xs text-emerald-400/80 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2 text-center">
                            🛡️ Enhanced Privacy — Payer will not see your real address.
                        </div>
                    )}
                    {!hasBurnerWallet && walletType === 0 && (
                        <div className="mt-2 text-xs text-gray-500 text-center">
                            No Burner Wallet found. Create one from your <span className="text-neon-primary">Dashboard</span>.
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">SDK Dashboard</label>
                    <button
                        onClick={() => {
                            if (walletType === 1) return;
                            setForSdk(!forSdk);
                        }}
                        disabled={walletType === 1}
                        className={`w-full rounded-xl border p-4 text-left transition-all duration-300 ${walletType === 1
                            ? 'cursor-not-allowed border-white/5 bg-white/[0.02] text-gray-600'
                            : forSdk
                                ? 'border-cyan-400/30 bg-cyan-400/10 text-white shadow-[0_0_20px_rgba(34,211,238,0.08)]'
                                : 'border-white/10 bg-black/20 text-gray-400 hover:border-white/20 hover:text-white'
                            }`}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="text-sm font-semibold">Create For SDK Dashboard</div>
                                <div className="mt-1 text-xs leading-relaxed text-inherit/80">
                                    Tag this invoice for the SDK dashboard so only SDK invoices and receipts show there.
                                </div>
                            </div>
                            <div className={`h-6 w-11 rounded-full border transition-colors ${forSdk ? 'border-cyan-300/60 bg-cyan-300/20' : 'border-white/10 bg-white/5'
                                }`}>
                                <div className={`mt-0.5 h-5 w-5 rounded-full transition-all ${forSdk ? 'ml-5 bg-cyan-300' : 'ml-0.5 bg-gray-500'
                                    }`} />
                            </div>
                        </div>
                    </button>
                    {walletType === 1 && (
                        <div className="mt-2 text-xs text-amber-400/80 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2 text-center">
                            SDK invoices are main-wallet only. Switch back to Main Wallet to enable this tag.
                        </div>
                    )}
                </div>

                {/* CURRENCY & SETTLEMENT SECTION */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Currency & Settlement</label>
                            <p className="text-[10px] text-gray-500">Pick your quote currency and enable multi-token payments.</p>
                        </div>
                        
                        {tokenType !== 3 && setSelectedAllowedTokens && (
                            <div className="relative group/tooltip">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold cursor-help hover:bg-orange-500/20 transition-all">
                                    <Info size={12} />
                                    <span>ORACLE POWERED</span>
                                </div>
                                
                                <div className="absolute bottom-full right-0 mb-3 w-72 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-300 z-50">
                                    <div className="bg-[#0A0A0A] backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-l-orange-500/40 border-l-4">
                                        <div className="text-orange-400 font-bold text-xs mb-2 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                            Real-time Oracle Conversion
                                        </div>
                                        <p className="text-[11px] leading-relaxed text-gray-400 mb-3">
                                            Payer selects their preferred token. Amounts are converted via <span className="text-white font-medium">Provable Oracles</span> and verified on-chain with <span className="text-white font-medium">ZK Proofs</span>.
                                        </p>
                                        <div className="bg-orange-500/5 rounded-xl p-3 border border-orange-500/10">
                                            <span className="text-[10px] text-orange-300/80 font-semibold uppercase tracking-wider block mb-1">Market Volatility</span>
                                            <p className="text-[10px] text-orange-200/60 leading-normal">
                                                Slight variations in conversion may occur during settlement due to market movements.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`grid grid-cols-1 ${invoiceType === 'donation' ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-3`}>
                        {['CREDITS', 'USDCX', 'USAD', ...(invoiceType === 'donation' ? ['ANY'] : [])].map((t, idx) => {
                            const isBase = tokenType === idx;
                            const allowedTokens = selectedAllowedTokens || [];
                            const isSelected = allowedTokens.includes(t);
                            
                            const label = t === 'CREDITS' ? 'Aleo Credits' : 
                                         t === 'USDCX' ? 'USDCx' : 
                                         t === 'USAD' ? 'USAD' : 'Any Token';
                                         
                            return (
                                <div 
                                    key={t}
                                    className={`relative group overflow-hidden rounded-2xl border transition-all duration-300 ${
                                        isBase 
                                            ? idx === 3 
                                                ? 'bg-pink-500/10 border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.1)]'
                                                : 'bg-white/10 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]' 
                                            : 'bg-black/40 border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    {/* Selection Glow */}
                                    {isBase && (
                                        <div className={`absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none ${idx === 3 ? 'from-pink-500/10' : ''}`} />
                                    )}
                                    
                                    <div className="relative z-10">
                                        {/* TOP SECTION: Base Currency Toggle */}
                                        <div 
                                            onClick={() => setTokenType(idx)}
                                            className="p-3.5 pb-2 cursor-pointer hover:bg-white/[0.02] transition-colors"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex flex-col">
                                                    <div className={`text-sm font-bold ${isBase ? idx === 3 ? 'text-pink-400' : 'text-white' : 'text-gray-400'}`}>{label}</div>
                                                </div>
                                                {isBase && (
                                                    <div className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${idx === 3 ? 'bg-pink-500 text-white' : 'bg-white text-black'}`}>
                                                        {idx === 3 ? 'Active' : 'Base'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* BOTTOM SECTION: Acceptance Toggle */}
                                        {setSelectedAllowedTokens && idx !== 3 ? (
                                            <div 
                                                onClick={() => {
                                                    if (isBase) return;
                                                    const newSelected = isSelected
                                                        ? allowedTokens.filter(x => x !== t)
                                                        : [...allowedTokens, t];
                                                    setSelectedAllowedTokens(newSelected);
                                                }}
                                                className={`px-3.5 py-3 border-t border-white/5 flex items-center justify-between transition-colors ${isBase ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/[0.05]'}`}
                                            >
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Accept as payment</span>
                                                <div
                                                    className={`w-10 h-5 rounded-full relative transition-all duration-300 ${
                                                        isSelected
                                                            ? 'bg-orange-500/30 border-orange-500/50'
                                                            : 'bg-white/5 border-white/10'
                                                    } border`}
                                                >
                                                    <div className={`absolute top-1 w-3 h-3 rounded-full transition-all duration-300 ${
                                                        isSelected
                                                            ? 'left-6 bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.5)]'
                                                            : 'left-1 bg-gray-600'
                                                    }`} />
                                                </div>
                                            </div>
                                        ) : (
                                            idx === 3 && (
                                                <div className="px-3.5 pb-3 pt-1 border-t border-white/5 text-[10px] text-gray-500 font-medium leading-tight">
                                                    Payer chooses any supported token.
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>



                <div className="text-xs text-gray-400 text-center bg-white/5 p-3 rounded-lg border border-white/5">
                    {invoiceType === 'standard' && 'Single payment only. Invoice closes after payment.'}
                    {invoiceType === 'multipay' && 'Allows multiple payments. Ideal for campaigns.'}
                    {invoiceType === 'donation' && (
                        <span>
                            <strong className="text-pink-400 block mb-1">Donation Mode</strong>
                            Used by NGOs, fundraising platforms, developers, and for crowd funding where the info of payer and receiver shall be kept private using records in Aleo.
                        </span>
                    )}
                </div>



                {invoiceType !== 'donation' && (
                    <Input
                        label={`Amount (${getTokenLabel(tokenType, invoiceType === 'multipay' ? 1 : 0)})`}
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    />
                )}

                {/* LINE ITEMS TOGGLE — Standard Invoice only */}
                {invoiceType === 'standard' && (
                    <div>
                        <label
                            className="flex items-center gap-3 cursor-pointer select-none group"
                            onClick={() => {
                                if (!showItems) addItem();
                                setShowItems(!showItems);
                            }}
                        >
                            <div className={`w-10 h-5 rounded-full relative transition-all duration-300 ${showItems
                                ? 'bg-neon-primary/30 border-neon-primary/50'
                                : 'bg-white/10 border-white/10'
                                } border`}>
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300 ${showItems
                                    ? 'left-[22px] bg-neon-primary shadow-[0_0_8px_rgba(0,243,255,0.5)]'
                                    : 'left-0.5 bg-gray-500'
                                    }`} />
                            </div>
                            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Add Line Items</span>
                        </label>
                    </div>
                )}

                {/* LINE ITEMS TABLE */}
                {invoiceType === 'standard' && showItems && (
                    <div className="bg-black/30 rounded-xl border border-white/5 overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-2 px-4 py-3 bg-white/5 border-b border-white/5">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Item</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Qty</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Unit Price</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Total</span>
                            <span></span>
                        </div>

                        {/* Table Rows */}
                        {items.map((item, index) => (
                            <div key={index} className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-2 px-4 py-2 border-b border-white/5 last:border-b-0 items-center group hover:bg-white/[0.02] transition-colors">
                                <input
                                    type="text"
                                    placeholder="Item name"
                                    value={item.name}
                                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                                    className="bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none focus:placeholder:text-gray-500 w-full"
                                />
                                <input
                                    type="number"
                                    min="1"
                                    value={item.quantity || ''}
                                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                    className="bg-white/5 rounded-lg text-sm text-white text-center py-1 focus:outline-none focus:ring-1 focus:ring-neon-primary/30 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.unitPrice || ''}
                                    onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                                    className="bg-white/5 rounded-lg text-sm text-white text-center py-1 focus:outline-none focus:ring-1 focus:ring-neon-primary/30 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-sm text-neon-primary font-mono text-right">
                                    {item.total > 0 ? item.total.toFixed(2) : '—'}
                                </span>
                                <button
                                    onClick={() => removeItem(index)}
                                    className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}

                        {/* Add Item Button */}
                        <button
                            onClick={addItem}
                            className="w-full py-3 text-sm text-gray-400 hover:text-neon-primary hover:bg-neon-primary/5 transition-all flex items-center justify-center gap-2 border-t border-white/5"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Item
                        </button>

                        {/* Items Total */}
                        {items.length > 0 && items.some(i => i.total > 0) && (
                            <div className="flex justify-between items-center px-4 py-3 bg-neon-primary/5 border-t border-neon-primary/20">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total</span>
                                <span className="text-lg font-bold text-neon-primary font-mono">
                                    {items.reduce((sum, i) => sum + i.total, 0).toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <Input
                        label="Invoice Title (Optional)"
                        type="text"
                        placeholder={invoiceType === 'donation' ? "e.g., Monsoon Relief Drive" : "e.g., April Retainer"}
                        value={invoiceTitle}
                        error={invoiceTitleTooLong ? `Keep title within ${LEO_INVOICE_TITLE_MAX_BYTES} bytes for a single Leo field.` : undefined}
                        onChange={(e) => setInvoiceTitle(e.target.value)}
                    />
                    <div className={`mt-2 text-xs ${invoiceTitleTooLong ? 'text-red-400' : 'text-gray-500'}`}>
                        This title is shared with the payer and stored in one Leo `field`: {invoiceTitleBytes}/{LEO_INVOICE_TITLE_MAX_BYTES} bytes.
                    </div>
                </div>

                <div>
                    <Input
                        label="Memo (Optional)"
                        type="text"
                        placeholder={invoiceType === 'donation' ? "e.g., Save the Whales Campaign" : "e.g., Dinner Bill"}
                        value={memo}
                        error={memoTooLong ? `Keep memo within ${LEO_MEMO_MAX_BYTES} bytes for a single Leo field.` : undefined}
                        onChange={(e) => setMemo(e.target.value)}
                    />
                    <div className={`mt-2 text-xs ${memoTooLong ? 'text-red-400' : 'text-gray-500'}`}>
                        Memo is optional to share and stored in one Leo `field`: {memoBytes}/{LEO_MEMO_MAX_BYTES} bytes. Regular letters usually count as 1 byte.
                    </div>
                </div>

                <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleCreate}
                    disabled={loading || !publicKey || invoiceTitleTooLong || memoTooLong}
                    glow={!loading && !!publicKey}
                >
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Creating...
                        </span>
                    ) : !publicKey ? (
                        'Connect Wallet to Continue'
                    ) : (
                        invoiceType === 'standard' ? 'Generate Invoice Link' :
                            invoiceType === 'multipay' ? 'Create Multi Pay Link' :
                                'Create Donation Link'
                    )}
                </Button>

                {status && (
                    <div className={`p-4 rounded-xl text-center text-sm font-medium border ${status.includes('Error')
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : 'bg-neon-primary/10 border-neon-primary/20 text-neon-primary'
                        }`}>
                        {status}
                    </div>
                )}
            </div>
        </GlassCard>
    );
};
