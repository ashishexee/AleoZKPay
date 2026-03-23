import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { PrivateKey } from '@provablehq/sdk';
import { Copy, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { FloatingGiftCard } from './FloatingGiftCard';

const toHex = (str: string) => Array.from(new TextEncoder().encode(str)).map(b => b.toString(16).padStart(2, '0')).join('');

export const CreateGiftCard: React.FC = () => {
    const { address, executeTransaction, transactionStatus, requestRecords, decrypt } = useWallet();
    const [amounts, setAmounts] = useState({ ALEO: '', USDCx: '', USAD: '' });
    const [isGenerating, setIsGenerating] = useState(false);
    const [step, setStep] = useState<'INPUT' | 'FUNDING' | 'SUCCESS'>('INPUT');
    const [fundingStatus, setFundingStatus] = useState<string>('');
    const [giftCode, setGiftCode] = useState<string>('');
    const [copied, setCopied] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const aleoAmt = Number(amounts.ALEO || 0);
        const usdcxAmt = Number(amounts.USDCx || 0);
        const usadAmt = Number(amounts.USAD || 0);

        if (aleoAmt <= 0 && usdcxAmt <= 0 && usadAmt <= 0) {
            toast.error('Please enter an amount for at least one asset.');
            return;
        }

        if (!address || !executeTransaction) {
            toast.error('Please connect your wallet first.');
            return;
        }

        try {
            setIsGenerating(true);
            setStep('FUNDING');
            setFundingStatus('Generating secure private key...');

            // 1. Generate new PrivateKey
            // A simple pause makes the UI feel more premium during generation
            await new Promise(r => setTimeout(r, 800));
            const newKey = new PrivateKey();
            const newAddress = newKey.to_address().to_string();
            const rawPk = newKey.to_string();
            const code = `gift-${toHex(rawPk)}`;

            // 2. Fund the address (Sequential Transactions)
            const assetsToFund = [
                { symbol: 'ALEO', amount: aleoAmt, program: 'credits.aleo', suffix: 'u64' },
                { symbol: 'USDCx', amount: usdcxAmt, program: 'test_usdcx_stablecoin.aleo', suffix: 'u128' },
                { symbol: 'USAD', amount: usadAmt, program: 'test_usad_stablecoin.aleo', suffix: 'u128' }
            ].filter(a => a.amount > 0);

            for (let i = 0; i < assetsToFund.length; i++) {
                const asset = assetsToFund[i];
                setFundingStatus(`Preparing ${asset.symbol} (${i + 1}/${assetsToFund.length})...`);
                
                const amountMicro = Math.round(asset.amount * 1_000_000);

                if (!requestRecords) throw new Error("Wallet does not support requestRecords.");
                const records = await requestRecords(asset.program, false);
                const isCredits = asset.program === 'credits.aleo';

                const processRecord = async (r: any): Promise<number> => {
                    try {
                        const field = isCredits ? 'microcredits' : 'amount';
                        if (r.data && r.data[field]) return parseInt(r.data[field].replace(asset.suffix, ''));
                        if (r.plaintext) {
                            const match = r.plaintext.match(new RegExp(`${field}:\\s*([\\d_]+)${asset.suffix}`));
                            if (match && match[1]) return parseInt(match[1].replace(/_/g, ''));
                        }
                        if (r.recordCiphertext && !r.plaintext && decrypt) {
                            try {
                                const decrypted = await decrypt(r.recordCiphertext);
                                if (decrypted) {
                                    r.plaintext = decrypted;
                                    const match = decrypted.match(new RegExp(`${field}:\\s*([\\d_]+)${asset.suffix}`));
                                    if (match && match[1]) return parseInt(match[1].replace(/_/g, ''));
                                }
                            } catch (e) { }
                        }
                        return 0;
                    } catch { return 0; }
                };

                let payRecord: any = null;
                for (const r of (records as any[])) {
                    if (r.spent) continue;
                    const val = await processRecord(r);
                    if (val >= amountMicro) {
                        payRecord = r;
                        break;
                    }
                }

                if (!payRecord) {
                    throw new Error(`Insufficient private ${asset.symbol} balance. Please convert public to private or merge records.`);
                }

                let recordInput = payRecord.plaintext;
                if (!recordInput) {
                    if (payRecord.ciphertext) recordInput = payRecord.ciphertext;
                    else throw new Error(`Could not read ${asset.symbol} record plaintext.`);
                }

                let inputs: string[] = [];
                if (isCredits) {
                    inputs = [recordInput, newAddress, `${amountMicro}u64`];
                } else {
                    setFundingStatus(`Generating compliance proof for ${asset.symbol}...`);
                    const { generateFreezeListProof, getFreezeListIndex } = await import('../../../utils/aleo-utils');
                    const { Address } = await import('@provablehq/wasm');
                    const firstIndex = await getFreezeListIndex(0);
                    let index0FieldStr: string | undefined;
                    if (firstIndex) {
                        try { index0FieldStr = Address.from_string(firstIndex).toGroup().toXCoordinate().toString(); } catch { }
                    }
                    const proof = await generateFreezeListProof(1, index0FieldStr);
                    const proofsInput = `[${proof}, ${proof}]`;

                    inputs = [newAddress, `${amountMicro}u128`, recordInput, proofsInput];
                }

                setFundingStatus(`Funding ${asset.symbol} (${i + 1}/${assetsToFund.length}). Please approve in wallet...`);
                const tx = {
                    program: asset.program,
                    function: 'transfer_private',
                    inputs: inputs,
                    fee: 100_000,
                    privateFee: false
                };

                const result = await executeTransaction(tx);
                if (!result || !result.transactionId) {
                    throw new Error(`Transaction failed for ${asset.symbol}`);
                }

                setFundingStatus(`Waiting for ${asset.symbol} confirmation on-chain...`);
                let isPending = true;
                let attempts = 0;
                while (isPending && attempts < 120 && transactionStatus) {
                    attempts++;
                    await new Promise(r => setTimeout(r, 1000));
                    try {
                        const statusResp = await transactionStatus(result.transactionId);
                        const statusStr = typeof (statusResp as any) === 'string' 
                            ? (statusResp as any).toLowerCase() 
                            : (statusResp as any)?.status?.toLowerCase();
                        
                        if (statusStr === 'completed' || statusStr === 'finalized' || statusStr === 'accepted') {
                            isPending = false;
                        } else if (statusStr === 'failed' || statusStr === 'rejected') {
                            throw new Error(`${asset.symbol} funding rejected by network.`);
                        }
                    } catch (err: any) {
                        if (err.message?.includes('rejected')) throw err;
                    }
                }
            }

            setGiftCode(code);
            setStep('SUCCESS');
            toast.success('Gift Card created successfully!');

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to generate gift card.');
            setStep('INPUT');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(giftCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const reset = () => {
        setAmounts({ ALEO: '', USDCx: '', USAD: '' });
        setGiftCode('');
        setStep('INPUT');
    };

    return (
        <div className="w-full">
            <AnimatePresence mode="wait">
                {step === 'INPUT' && (
                    <motion.form
                        key="input"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onSubmit={handleCreate}
                        className="space-y-5"
                    >
                        {/* Preview card */}
                        <div className="mb-2">
                            <FloatingGiftCard amounts={{ ALEO: amounts.ALEO, USDCx: amounts.USDCx, USAD: amounts.USAD }} />
                        </div>

                        {/* Amount inputs */}
                        <div className="space-y-3">
                            {(['ALEO', 'USDCx', 'USAD'] as const).map((token) => (
                                <div
                                    key={token}
                                    className="relative flex items-center bg-white/[0.02] rounded-2xl overflow-hidden group h-14"
                                >
                                    <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent group-focus-within:via-orange-500/50 transition-all duration-500" />
                                    <span className="pl-5 text-xs font-semibold text-white/30 uppercase tracking-[0.2em] w-24 shrink-0 transition-colors group-focus-within:text-white/50">
                                        {token === 'ALEO' ? 'Credits' : token}
                                    </span>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        min="0"
                                        value={amounts[token]}
                                        onChange={(e) => setAmounts({ ...amounts, [token]: e.target.value })}
                                        className="flex-1 h-full bg-transparent px-5 text-right text-lg text-white font-light focus:outline-none placeholder-white/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="0.00"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4">
                            <p className="text-[10px] uppercase tracking-widest text-white/20">
                                Powered by <span className="font-semibold text-white/40">Aleo Zk</span>
                            </p>
                            <button
                                type="submit"
                                disabled={isGenerating || !address || (!amounts.ALEO && !amounts.USDCx && !amounts.USAD)}
                                className="px-6 py-4 text-sm font-semibold bg-white text-black rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] shrink-0 group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="relative z-10">{isGenerating ? 'Minting...' : 'Mint Card'}</span>
                            </button>
                        </div>
                        {!address && (
                            <p className="text-xs text-red-400/70 text-center">Connect your wallet to mint.</p>
                        )}
                    </motion.form>
                )}

                {step === 'FUNDING' && (
                    <motion.div
                        key="funding"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center py-10 text-center gap-6"
                    >
                        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
                        <div>
                            <h3 className="text-base font-semibold text-white mb-1">Forging Card</h3>
                            <p className="text-sm text-white/40 font-mono max-w-xs">{fundingStatus}</p>
                        </div>
                        <div className="w-full pointer-events-none opacity-50">
                            <FloatingGiftCard amounts={{ ALEO: amounts.ALEO, USDCx: amounts.USDCx, USAD: amounts.USAD }} isInteractive={false} />
                        </div>
                    </motion.div>
                )}

                {step === 'SUCCESS' && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center text-center gap-6"
                    >
                        <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-1">Gift Card Ready</h3>
                            <p className="text-sm text-white/40">Share this code with the recipient — they can redeem it instantly.</p>
                        </div>

                        <div className="w-full cursor-pointer" onClick={copyCode}>
                            <FloatingGiftCard giftCode={giftCode} amounts={{ ALEO: amounts.ALEO, USDCx: amounts.USDCx, USAD: amounts.USAD }} isInteractive={false} />
                            <p className="mt-3 text-xs text-white/25 flex items-center justify-center gap-1.5">
                                <Copy className="w-3 h-3" />
                                {copied ? 'Copied!' : 'Click to copy code'}
                            </p>
                        </div>

                        <button
                            onClick={reset}
                            className="text-sm text-white/30 hover:text-white/60 transition-colors"
                        >
                            Create another card
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
