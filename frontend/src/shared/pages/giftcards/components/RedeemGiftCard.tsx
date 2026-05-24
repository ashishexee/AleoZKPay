import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { PrivateKey, AleoNetworkClient, AleoKeyProvider, ProgramManager, NetworkRecordProvider } from '@provablehq/sdk';
import { Search, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getScannerSession, fetchAllPrivateBalances, findSpendableRecord } from '../../profile/components/burnerwallet/scanner';
import type { PrivateBalances } from '../../../types/burner';
import { FloatingGiftCard } from './FloatingGiftCard';
import { ScratchReveal } from './ScratchReveal';
import { PaymentActivityConsole } from '../../../components/payments/PaymentActivityConsole';

const fromHex = (hex: string) => new TextDecoder().decode(new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))));

export const RedeemGiftCard: React.FC = () => {
    const { address } = useWallet();
    const [giftCode, setGiftCode] = useState('');
    const [privateKeyStr, setPrivateKeyStr] = useState('');
    const [step, setStep] = useState<'INPUT' | 'SCANNING' | 'BALANCES' | 'SWEEPING' | 'SUCCESS'>('INPUT');
    const [isRevealed, setIsRevealed] = useState(false);
    const [balances, setBalances] = useState<PrivateBalances>({ ALEO: -1, USDCx: -1, USAD: -1 });
    const [sweepToken, setSweepToken] = useState<'ALEO' | 'USDCx' | 'USAD'>('ALEO');
    const [sweepAmount, setSweepAmount] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [txId, setTxId] = useState<string | null>(null);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!giftCode.startsWith('gift-')) {
            toast.error('Invalid Gift Card format. Must start with "gift-".');
            return;
        }

        // ── Reset all stale state BEFORE the async fetch ─────────────────────
        setBalances({ ALEO: -1, USDCx: -1, USAD: -1 });
        setIsRevealed(false);
        setLogs([]);
        setTxId(null);
        setSweepAmount('');
        // ─────────────────────────────────────────────────────────────────────

        try {
            const hex = giftCode.replace('gift-', '');
            const pkStr = fromHex(hex);

            // Validate it's a real private key
            PrivateKey.from_string(pkStr);
            setPrivateKeyStr(pkStr);

            setStep('SCANNING');
            const foundBalances = await fetchAllPrivateBalances(pkStr);
            setBalances(foundBalances);

            // Auto-select the first token with a balance > 0
            if (foundBalances.ALEO > 0) setSweepToken('ALEO');
            else if (foundBalances.USDCx > 0) setSweepToken('USDCx');
            else if (foundBalances.USAD > 0) setSweepToken('USAD');

            setStep('BALANCES');
        } catch (err) {
            toast.error('Invalid Gift Card code or corrupted data.');
            setStep('INPUT');
        }
    };

    const handleSweep = async () => {
        if (!address) {
            toast.error('Please connect your destination wallet first.');
            return;
        }

        const amtNum = Number(sweepAmount);
        if (isNaN(amtNum) || amtNum <= 0 || amtNum > balances[sweepToken]) {
            toast.error('Please enter a valid amount up to your available balance.');
            return;
        }

        setStep('SWEEPING');
        setLogs([]);
        setTxId(null);

        try {
            addLog('Initializing DPS Relayer connection...');
            const host = 'https://api.explorer.provable.com/v1';
            const networkClient = new AleoNetworkClient(host);
            const keyProvider = new AleoKeyProvider();
            keyProvider.useCache(true);

            addLog('Authenticating Gift Card with Record Scanner...');
            const session = await getScannerSession(privateKeyStr);
            addLog(`✓ Scanner registered. UUID: ${session.scannerUuid.substring(0, 20)}...`);

            const recordProvider = new NetworkRecordProvider(session.account, networkClient);
            const programManager = new ProgramManager(host, keyProvider, recordProvider);
            programManager.setAccount(session.account);

            const microcreditsRequired = amtNum * 1_000_000;
            let programName: string;
            const functionName = 'transfer_private';
            let amountFormatted: string;
            let inputs: string[];

            if (sweepToken === 'ALEO') {
                programName = 'credits.aleo';
                amountFormatted = microcreditsRequired.toString() + 'u64';
                addLog(`Scanning for private ALEO record (need ≥${amtNum} ALEO)...`);
                const recordPt = await findSpendableRecord(session, programName, 'credits', microcreditsRequired, true);
                if (!recordPt) throw new Error(`We couldn't find a single record large enough. Please try a smaller amount.`);
                addLog('✓ Found private ALEO record!');
                inputs = [recordPt, address, amountFormatted]; // Source record first for credits.aleo transfer_private
            } else {
                programName = sweepToken === 'USDCx' ? 'test_usdcx_stablecoin.aleo' : 'test_usad_stablecoin.aleo';
                amountFormatted = microcreditsRequired.toString() + 'u128';

                addLog(`Checking compliance subsystem for ${sweepToken}...`);
                let proofsInput = '';
                try {
                    const { generateFreezeListProof, getFreezeListIndex } = await import('../../../utils/aleo/aleoUtils');
                    const { Address } = await import('@provablehq/wasm');
                    const firstIndex = await getFreezeListIndex(0);
                    let index0FieldStr: string | undefined;
                    if (firstIndex) {
                        try { index0FieldStr = Address.from_string(firstIndex).toGroup().toXCoordinate().toString(); } catch { }
                    }
                    const proof = await generateFreezeListProof(1, index0FieldStr);
                    proofsInput = `[${proof}, ${proof}]`;
                    addLog('✓ Compliance active.');
                } catch {
                    throw new Error('Compliance subsystem unreachable — cannot generate transfer proofs.');
                }

                addLog(`Scanning for private ${sweepToken} record...`);
                // Wait, 'Token' record types...
                const recordPt = await findSpendableRecord(session, programName, 'Token', microcreditsRequired, false);
                if (!recordPt) throw new Error(`We couldn't find a single record large enough for ${sweepToken}.`);
                addLog(`✓ Found private ${sweepToken} record!`);
                
                // test_usdcx_stablecoin transfer_private: (receiver, amount, input_record, proofs)
                inputs = [address, amountFormatted, recordPt, proofsInput];
            }

            addLog(`Building Zero-Knowledge execution payload...`);
            const authorization = await programManager.buildAuthorization({ programName, functionName, inputs });
            addLog('✓ Proofs generated locally. Requesting Relayer sponsorship...');

            const apiUrl = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
            const sponsorRes = await fetch(`${apiUrl}/dps/sponsor-sweep`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ execution_authorization_string: authorization.toString(), programName }),
            });
            const response = await sponsorRes.json();
            if (!sponsorRes.ok) throw new Error(response?.error || response?.message || 'Sponsorship failed.');

            const transactionId = response.transaction?.id || response.transactionId || '';
            addLog(`✓ Sweep accepted by network! TxID: ${transactionId}`);
            setTxId(transactionId);
            setStep('SUCCESS');

        } catch (err: any) {
            console.error('DPS Sweep Failed:', err);
            addLog(`✗ Error: ${err.message}`);
            toast.error(err.message || 'Failed to sweep funds.');
            // We do not revert step unless user wants to go back. Let them see logs.
        }
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
                        onSubmit={handleScan}
                        className="space-y-4"
                    >
                        <div>
                            <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Gift Code</p>
                            <input
                                type="text"
                                value={giftCode}
                                onChange={(e) => {
                                    setGiftCode(e.target.value);
                                    // Clear any stale balances when the code changes
                                    setBalances({ ALEO: -1, USDCx: -1, USAD: -1 });
                                    setIsRevealed(false);
                                }}
                                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl py-3.5 px-4 text-sm text-white font-mono placeholder-white/20 focus:outline-none focus:border-white/20 transition-all"
                                placeholder="gift-..."
                                spellCheck={false}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!giftCode}
                            className="w-full py-3 text-sm font-semibold bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-lg hover:from-orange-400 hover:to-orange-300 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(249,115,22,0.25)]"
                        >
                            <Search className="w-4 h-4" /> Scan Card
                        </button>
                    </motion.form>
                )}

                {step === 'SCANNING' && (
                    <motion.div
                        key="scanning"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center py-12 gap-4 text-center"
                    >
                        <Loader2 className="w-7 h-7 text-white/40 animate-spin" />
                        <div>
                            <p className="text-sm font-medium text-white">Scanning network</p>
                            <p className="text-xs text-white/30 mt-1">Checking Aleo blockchain for private records</p>
                        </div>
                    </motion.div>
                )}

                {step === 'BALANCES' && (
                    <motion.div
                        key="balances"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-5"
                    >
                        {/* Scratch card */}
                        <div className="w-full">
                             <ScratchReveal onReveal={() => setIsRevealed(true)}>
                                 <FloatingGiftCard amounts={{ ALEO: balances.ALEO, USDCx: balances.USDCx, USAD: balances.USAD }} isInteractive={false} />
                             </ScratchReveal>
                        </div>
                        
                        <AnimatePresence>
                            {isRevealed && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4"
                                >
                                    {/* Token balances - Ultra Minimalist Design */}
                                    <div className="flex flex-col gap-3 py-2">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-semibold px-2">Available Assets</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {([
                                                { key: 'ALEO', label: 'Credits', activeBg: 'bg-white/[0.08] shadow-[0_4px_20px_rgba(255,255,255,0.05)]' },
                                                { key: 'USDCx', label: 'USDCx', activeBg: 'bg-white/[0.08] shadow-[0_4px_20px_rgba(255,255,255,0.05)]' },
                                                { key: 'USAD', label: 'USAD', activeBg: 'bg-white/[0.08] shadow-[0_4px_20px_rgba(255,255,255,0.05)]' },
                                            ] as const).map(({ key, label, activeBg }) => {
                                                const bal = balances[key as 'ALEO' | 'USDCx' | 'USAD'];
                                                const isSelected = sweepToken === (key as 'ALEO' | 'USDCx' | 'USAD');
                                                const hasBalance = bal > 0;
                                                return (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        disabled={!hasBalance}
                                                        onClick={() => {
                                                            if (hasBalance) {
                                                                setSweepToken(key as 'ALEO' | 'USDCx' | 'USAD');
                                                                setSweepAmount(String(bal));
                                                            }
                                                        }}
                                                        className={`relative overflow-hidden flex flex-col items-center justify-center p-5 rounded-2xl transition-all duration-300 group disabled:opacity-40 disabled:cursor-not-allowed ${
                                                            isSelected
                                                                ? `border border-white/20 ${activeBg}`
                                                                : 'border border-transparent bg-white/[0.02] hover:bg-white/[0.04]'
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <div className="absolute top-0 w-12 h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                                                        )}
                                                        <p className={`text-xs uppercase tracking-[0.15em] mb-2 transition-colors ${isSelected ? 'text-white/60' : 'text-white/30'}`}>
                                                            {label}
                                                        </p>
                                                        <div className="flex items-baseline gap-1">
                                                            <p className={`text-2xl font-light font-sans tracking-tight transition-colors ${
                                                                hasBalance ? (isSelected ? 'text-white' : 'text-white/80') : 'text-white/20'
                                                            }`}>
                                                                {hasBalance ? bal.toFixed(2) : '0.00'}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Withdraw row */}
                                    <div className="flex gap-3 pt-2">
                                        <div className="relative flex-1 bg-white/[0.02] rounded-xl overflow-hidden group">
                                            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent group-focus-within:via-orange-500/50 transition-all duration-500" />
                                            <input
                                                type="number"
                                                value={sweepAmount}
                                                onChange={(e) => setSweepAmount(e.target.value)}
                                                className="w-full h-full bg-transparent px-5 py-4 text-lg text-white font-light focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-white/10"
                                                placeholder={`Max: ${balances[sweepToken].toFixed(2)}`}
                                            />
                                        </div>
                                        <button
                                            onClick={handleSweep}
                                            disabled={!address || !sweepAmount}
                                            className="px-6 py-4 text-sm font-semibold bg-white text-black rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] shrink-0 group relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <span className="relative z-10">Withdraw</span>
                                            <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                    {!address && (
                                        <p className="text-xs text-red-400/70 text-center">Connect your wallet to receive funds.</p>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={() => {
                                setStep('INPUT');
                                // Clear balances so re-scanning always fetches fresh data
                                setBalances({ ALEO: -1, USDCx: -1, USAD: -1 });
                                setIsRevealed(false);
                            }}
                            className="w-full text-xs text-white/25 hover:text-white/50 pt-2 transition-colors"
                        >Cancel</button>
                    </motion.div>
                )}

                {step === 'SWEEPING' && (
                    <motion.div
                        key="sweeping"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-6 space-y-4"
                    >
                        <div className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 text-white/40 animate-spin shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-white">Generating ZK Proofs</p>
                                <p className="text-xs text-white/30">Your private key never leaves your browser.</p>
                            </div>
                        </div>
                        <PaymentActivityConsole
                            method="giftcard"
                            statusLog={logs}
                            title="Redemption Progress"
                            compact
                        />
                        <button onClick={() => setStep('BALANCES')} className="text-xs text-white/25 hover:text-white/50">Go back</button>
                    </motion.div>
                )}

                {step === 'SUCCESS' && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center text-center gap-5 py-4"
                    >
                        <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-1">Funds Redeemed</h3>
                            <p className="text-sm text-white/40">Funds are on their way to your connected wallet.</p>
                        </div>
                        {txId && (
                            <a
                                href={`https://testnet.explorer.provable.com/transaction/${txId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-white/40 font-mono bg-white/[0.04] border border-white/[0.07] px-4 py-2 rounded-lg hover:border-white/15 transition-colors"
                            >
                                Tx: {txId.substring(0, 20)}...
                            </a>
                        )}
                        <button
                            onClick={() => { setGiftCode(''); setStep('INPUT'); }}
                            className="text-sm text-white/30 hover:text-white/60 transition-colors"
                        >
                            Redeem another card
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
