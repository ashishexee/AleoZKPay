import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Copy, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchAllPrivateBalances } from '../../Profile/components/BurnerWallet/scanner';
import type { PrivateBalances } from '../../../types/burner';
import { parseGiftCardRecord, privateKeyToGiftCode } from '../../../utils/gift-card-chain';
import { WALLET_PROGRAM_ID } from '../../../utils/aleo-utils';

interface CreatedGiftCardEntry {
    id: string;
    giftCardAddress: string;
    giftPrivateKey: string;
    giftCode: string;
    label: string;
    balances: PrivateBalances | null;
    isLoadingBalances: boolean;
}

function hasAnyBalance(balances: PrivateBalances | null) {
    if (!balances) {
        return false;
    }
    return balances.ALEO > 0 || balances.USDCx > 0 || balances.USAD > 0;
}

function shortenAddress(value: string) {
    if (value.length <= 16) {
        return value;
    }
    return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export const CreatedGiftCards: React.FC = () => {
    const { address, requestRecords, decrypt } = useWallet();
    const [entries, setEntries] = useState<CreatedGiftCardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const fetchIdRef = React.useRef(0);

    const loadCreatedGiftCards = useCallback(async () => {
        if (!address || !requestRecords) {
            setEntries([]);
            setHasLoaded(true);
            return;
        }

        const currentFetchId = ++fetchIdRef.current;

        try {
            setIsLoading(true);
            const records = await requestRecords(WALLET_PROGRAM_ID, true);
            if (currentFetchId !== fetchIdRef.current) return;
            
            const nextEntries: CreatedGiftCardEntry[] = [];

            for (const record of (records as any[]) || []) {
                let plaintext = record.plaintext;
                const ciphertext = record.recordCiphertext || record.ciphertext;
                if (!plaintext && ciphertext && decrypt) {
                    try {
                        plaintext = await decrypt(ciphertext);
                    } catch {
                        continue;
                    }
                }

                const parsed = parseGiftCardRecord({ plaintext });
                if (!parsed) {
                    continue;
                }

                nextEntries.push({
                    id: `${parsed.giftCardAddress}:${nextEntries.length}`,
                    giftCardAddress: parsed.giftCardAddress,
                    giftPrivateKey: parsed.giftPrivateKey,
                    giftCode: privateKeyToGiftCode(parsed.giftPrivateKey),
                    label: parsed.label,
                    balances: null,
                    isLoadingBalances: true
                });
            }

            setEntries(nextEntries);
            setHasLoaded(true);

            for (const entry of nextEntries) {
                try {
                    const balances = await fetchAllPrivateBalances(entry.giftPrivateKey);
                    if (currentFetchId !== fetchIdRef.current) return;
                    setEntries((current) => current.map((item) => (
                        item.id === entry.id
                            ? { ...item, balances, isLoadingBalances: false }
                            : item
                    )));
                } catch {
                    if (currentFetchId !== fetchIdRef.current) return;
                    setEntries((current) => current.map((item) => (
                        item.id === entry.id
                            ? { ...item, balances: { ALEO: 0, USDCx: 0, USAD: 0 }, isLoadingBalances: false }
                            : item
                    )));
                }
            }
        } catch (error: any) {
            if (currentFetchId !== fetchIdRef.current) return;
            console.error('Failed to load created gift cards', error);
            toast.error(error?.message || 'Failed to load created gift cards.');
            setEntries([]);
            setHasLoaded(true);
        } finally {
            if (currentFetchId === fetchIdRef.current) {
                setIsLoading(false);
            }
        }
    }, [address, requestRecords, decrypt]);

    useEffect(() => {
        loadCreatedGiftCards();
    }, [loadCreatedGiftCards]);

    const totalCount = entries.length;
    const usedCount = useMemo(
        () => entries.filter((entry) => !entry.isLoadingBalances && !hasAnyBalance(entry.balances)).length,
        [entries]
    );

    const copyGiftCode = async (giftCode: string, entryId: string) => {
        await navigator.clipboard.writeText(giftCode);
        setCopiedId(entryId);
        toast.success('Gift code copied.');
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (!address) {
        return (
            <div className="py-10 text-center">
                <p className="text-sm text-white/70">Connect your wallet to view created gift cards.</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/30">On-Chain History</p>
                    <p className="mt-1 text-sm font-medium text-orange-100/90">
                        {hasLoaded ? (
                            <>
                                <span className="text-white">{totalCount}</span> created card{totalCount === 1 ? '' : 's'} / <span className="text-white">{usedCount}</span> used
                            </>
                        ) : 'Loading created cards...'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => loadCreatedGiftCards()}
                    disabled={isLoading}
                    className="group inline-flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-md px-3.5 py-2.5 text-xs font-semibold text-white/70 transition-all duration-300 hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-300 disabled:opacity-50 hover:shadow-[0_0_15px_rgba(249,115,22,0.15)]"
                >
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 transition-transform duration-500 group-hover:rotate-180" />}
                    Refresh
                </button>
            </div>

            {!isLoading && hasLoaded && entries.length === 0 ? (
                <div className="rounded-[1.8rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl px-5 py-12 text-center shadow-inner">
                    <p className="text-sm font-medium text-white/75">No gift-card history found yet.</p>
                    <p className="mt-2 text-xs text-white/40">
                        Newly created cards will appear here securely.
                    </p>
                </div>
            ) : null}

            <div className="space-y-3">
                {entries.map((entry) => {
                    const isUsed = !entry.isLoadingBalances && !hasAnyBalance(entry.balances);

                    return (
                        <div
                            key={entry.id}
                            className="group relative overflow-hidden rounded-[1.8rem] border border-white/5 bg-white/[0.02] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/20 hover:bg-white/[0.03] hover:shadow-[0_20px_40px_rgba(249,115,22,0.08)]"
                        >
                            {/* Subtle top glare/gradient */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    {(entry.isLoadingBalances || isUsed) && (
                                        <div className="mb-4 flex items-center gap-2">
                                            {entry.isLoadingBalances ? (
                                                <div className="h-[26px] w-[68px] animate-pulse rounded-full bg-white/[0.05]" />
                                            ) : (
                                                <span className="inline-flex items-center rounded-full border border-white/5 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40 backdrop-blur-md">
                                                    Used
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">Card address</p>
                                    <p className="mt-1.5 font-mono text-sm font-medium text-white/80">{shortenAddress(entry.giftCardAddress)}</p>
                                    {entry.label && (
                                        <>
                                            <p className="mt-3 text-[10px] uppercase tracking-[0.22em] text-white/30">Label</p>
                                            <p className="mt-1 text-sm text-orange-100/85">{entry.label}</p>
                                        </>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyGiftCode(entry.giftCode, entry.id)}
                                    className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-md px-3.5 py-2.5 text-xs font-semibold text-white/70 transition-all duration-300 hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-300 hover:shadow-[0_0_15px_rgba(249,115,22,0.1)] active:scale-95"
                                >
                                    <Copy className={`h-3.5 w-3.5 transition-transform duration-300 ${copiedId === entry.id ? 'scale-110 text-orange-400' : 'group-hover:scale-110'}`} />
                                    {copiedId === entry.id ? 'Copied' : 'Copy code'}
                                </button>
                            </div>

                            <div className="mt-5 border-t border-white/5 pt-5 pb-1">
                                <div className="grid grid-cols-3 gap-3">
                                    {(['ALEO', 'USDCx', 'USAD'] as const).map((token) => (
                                        <div key={token} className="px-1">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                                                {token === 'ALEO' ? 'Credits' : token}
                                            </p>
                                            {entry.isLoadingBalances ? (
                                                <div className="mt-3.5 h-7 w-16 animate-pulse rounded-md bg-white/[0.05]" />
                                            ) : (
                                                <p className={`mt-2.5 text-2xl font-bold tracking-tight transition-colors duration-300 ${
                                                    token === 'ALEO' && (entry.balances?.[token] || 0) > 0
                                                        ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]'
                                                        : 'text-white/90'
                                                }`}>
                                                    {(entry.balances?.[token] || 0).toFixed(2)}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
