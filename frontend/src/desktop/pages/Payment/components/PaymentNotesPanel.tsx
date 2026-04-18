import { useState } from 'react';
import { Button } from '../../../../shared/components/ui/Button';
import { LEO_PAYMENT_NOTE_MAX_BYTES } from '../../../../shared/utils/core/leoInputLimits';
import { PROGRAM_ID } from '../../../../shared/utils/aleo/aleoUtils';

interface PaymentNotesPanelProps {
    error: string | null;
    status: string | null;
    step: string;
    programId?: string;
    receiptHash?: string | null;
    receiptSearchFailed?: boolean;
    txId?: string | null;
    payerNote: string;
    setPayerNote: (value: string) => void;
    payerNoteBytes: number;
    payerNoteTooLong: boolean;
    shareMerchantNote: boolean;
    setShareMerchantNote: (value: boolean | ((current: boolean) => boolean)) => void;
    merchantNote: string;
    setMerchantNote: (value: string) => void;
    merchantNoteBytes: number;
    merchantNoteTooLong: boolean;
}

export const PaymentNotesPanel = ({
    error,
    status,
    step,
    programId,
    receiptHash,
    receiptSearchFailed,
    txId,
    payerNote,
    setPayerNote,
    payerNoteBytes,
    payerNoteTooLong,
    shareMerchantNote,
    setShareMerchantNote,
    merchantNote,
    setMerchantNote,
    merchantNoteBytes,
    merchantNoteTooLong,
}: PaymentNotesPanelProps) => {
    const [copiedHash, setCopiedHash] = useState(false);
    const isMultiPay = programId === PROGRAM_ID;

    return (
        <div className="bg-black/20 rounded-[28px] p-6 lg:p-8 border border-white/5 shadow-[0_20px_70px_rgba(0,0,0,0.28)] flex flex-col space-y-6 h-full justify-center">
            {error && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                    <p className="text-white text-sm font-medium">{error}</p>
                </div>
            )}

            {status && !status.startsWith('at1') && !error && step !== 'ALREADY_PAID' && step !== 'SUCCESS' && (
                <div className="text-center rounded-xl border border-white/20 bg-white/10 p-3">
                    <p className="text-white text-sm font-mono animate-pulse">{status}</p>
                </div>
            )}

            {(step === 'SUCCESS' || step === 'ALREADY_PAID') ? (
                <div className="text-center space-y-4 mb-auto mt-auto">
                    <p className="text-gray-400">
                        {step === 'ALREADY_PAID'
                            ? 'This invoice has already been settled on-chain.'
                            : 'The transaction has been settled on-chain.'}
                    </p>
                    {isMultiPay && step !== 'ALREADY_PAID' && (
                        <div className="bg-black/40 border border-orange-400/20 p-4 rounded-xl text-left space-y-3">
                            <p className="text-xs text-white uppercase font-bold mb-1">Your Receipt Hash</p>

                            {receiptHash ? (
                                <div className="bg-white/10 border border-white/20 p-2 rounded break-all font-mono text-xs text-white relative cursor-copy hover:bg-white/15 transition-colors" onClick={() => {
                                    navigator.clipboard.writeText(receiptHash);
                                    setCopiedHash(true);
                                    setTimeout(() => setCopiedHash(false), 2000);
                                }}>
                                    {receiptHash}
                                    <div className={`absolute top-1 right-2 text-[10px] font-bold transition-colors ${copiedHash ? 'text-white' : 'opacity-70 text-gray-400'}`}>
                                        {copiedHash ? 'COPIED!' : 'COPY'}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white/5 border border-white/10 p-3 rounded-lg text-center">
                                    {receiptSearchFailed ? (
                                        <p className="text-xs text-gray-400 italic">
                                            You can get your payment receipt from the profiles page in paid invoices section.
                                        </p>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-3 h-3 border-2 border-orange-300 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-xs text-gray-400">Syncing Receipt...</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {receiptHash && (
                                <p className="text-[10px] text-gray-500 mt-1">Provide this Hash to the merchant for verification.</p>
                            )}
                        </div>
                    )}
                    {txId && (
                        <Button
                            variant="primary"
                            onClick={() => window.open(`https://testnet.explorer.provable.com/transaction/${txId}`, '_blank')}
                        >
                            View Transaction
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-6 mb-auto mt-auto w-full">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Payer Note</label>
                        <textarea
                            value={payerNote}
                            onChange={(e) => setPayerNote(e.target.value)}
                            rows={3}
                            placeholder="Private note for your own paid-invoice history"
                            className={`w-full resize-none rounded-xl border bg-black/40 px-4 py-3 text-sm text-white outline-none transition-colors ${payerNoteTooLong ? 'border-red-500/60' : 'border-white/10 focus:border-neon-primary/40'}`}
                        />
                        <p className={`mt-2 text-[11px] ${payerNoteTooLong ? 'text-red-400' : 'text-gray-500'}`}>
                            Payer note uses one Leo field: {payerNoteBytes}/{LEO_PAYMENT_NOTE_MAX_BYTES} bytes.
                        </p>
                    </div>
                    <div className={`rounded-2xl border transition-all duration-300 ${shareMerchantNote ? 'border-neon-primary/30 bg-neon-primary/[0.03] shadow-[0_0_20px_rgba(var(--neon-primary-rgb),0.05)]' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'} p-5`}>
                        <div className="flex items-center justify-between gap-6">
                            <div className="flex-1">
                                <h4 className={`text-sm font-bold transition-colors duration-300 ${shareMerchantNote ? 'text-white' : 'text-gray-300'}`}>Share note with merchant</h4>
                                <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">Enable this to send a separate, private message directly to the merchant's dashboard.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShareMerchantNote((current) => !current)}
                                className={`group relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-all duration-300 ease-in-out outline-none focus:ring-2 focus:ring-neon-primary/20 ${
                                    shareMerchantNote
                                        ? 'bg-white border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                                        : 'bg-white/10 border-white/10'
                                    }`}
                            >
                                <span
                                    className={`pointer-events-none block h-5 w-5 rounded-full shadow-lg transition-all duration-500 ease-in-out transform ${
                                        shareMerchantNote
                                            ? 'translate-x-[24px] scale-90 bg-black'
                                            : 'translate-x-1 scale-90 opacity-40 bg-white group-hover:opacity-60'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                    {shareMerchantNote && (
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Merchant Note</label>
                            <textarea
                                value={merchantNote}
                                onChange={(e) => setMerchantNote(e.target.value)}
                                rows={3}
                                placeholder="Optional note visible to the merchant"
                                className={`w-full resize-none rounded-xl border bg-black/40 px-4 py-3 text-sm text-white outline-none transition-colors ${merchantNoteTooLong ? 'border-red-500/60' : 'border-white/10 focus:border-neon-primary/40'}`}
                            />
                            <p className={`mt-2 text-[11px] ${merchantNoteTooLong ? 'text-red-400' : 'text-gray-500'}`}>
                                Merchant note: {merchantNoteBytes}/{LEO_PAYMENT_NOTE_MAX_BYTES} bytes.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
