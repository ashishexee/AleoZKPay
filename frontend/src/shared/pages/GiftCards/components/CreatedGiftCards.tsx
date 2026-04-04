import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Copy, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchAllPrivateBalances } from '../../Profile/components/BurnerWallet/scanner';
import type { PrivateBalances } from '../../Profile/components/BurnerWallet/types';
import { parseGiftCardRecord, privateKeyToGiftCode } from '../../../utils/gift-card-chain';
import { PROGRAM_ID } from '../../../utils/aleo-utils';

interface CreatedGiftCardEntry {
    id: string;
    giftCardAddress: string;
    giftPrivateKey: string;
    giftCode: string;
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

    const loadCreatedGiftCards = useCallback(async () => {
        if (!address || !requestRecords) {
            setEntries([]);
            setHasLoaded(true);
            return;
        }

        try {
            setIsLoading(true);
            const records = await requestRecords(PROGRAM_ID, true);
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
                    balances: null,
                    isLoadingBalances: true
                });
            }

            setEntries(nextEntries);
            setHasLoaded(true);

            for (const entry of nextEntries) {
                try {
                    const balances = await fetchAllPrivateBalances(entry.giftPrivateKey);
                    setEntries((current) => current.map((item) => (
                        item.id === entry.id
                            ? { ...item, balances, isLoadingBalances: false }
                            : item
                    )));
                } catch {
                    setEntries((current) => current.map((item) => (
                        item.id === entry.id
                            ? { ...item, balances: { ALEO: 0, USDCx: 0, USAD: 0 }, isLoadingBalances: false }
                            : item
                    )));
                }
            }
        } catch (error: any) {
            console.error('Failed to load created gift cards', error);
            toast.error(error?.message || 'Failed to load created gift cards.');
            setEntries([]);
            setHasLoaded(true);
        } finally {
            setIsLoading(false);
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

    const copyGiftCode = async (giftCode: string) => {
        await navigator.clipboard.writeText(giftCode);
        toast.success('Gift code copied.');
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
                    <p className="mt-1 text-sm text-orange-100/90">
                        {hasLoaded ? `${totalCount} created card${totalCount === 1 ? '' : 's'} / ${usedCount} used` : 'Loading created cards...'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => loadCreatedGiftCards()}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-orange-400/10 bg-orange-500/[0.06] px-3.5 py-2.5 text-xs font-semibold text-orange-100/80 transition-all hover:border-orange-300/20 hover:bg-orange-500/[0.1] hover:text-white disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Refresh
                </button>
            </div>

            {!isLoading && hasLoaded && entries.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-10 text-center">
                    <p className="text-sm text-white/75">No gift-card history found yet.</p>
                    <p className="mt-2 text-xs text-white/35">
                        Newly created cards saved with the updated contract will appear here.
                    </p>
                </div>
            ) : null}

            <div className="space-y-3">
                {entries.map((entry) => {
                    const isUsed = !entry.isLoadingBalances && !hasAnyBalance(entry.balances);

                    return (
                        <div
                            key={entry.id}
                            className="rounded-[1.8rem] border border-orange-400/12 bg-[linear-gradient(180deg,rgba(249,115,22,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.2)] backdrop-blur-xl"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="mb-3 flex items-center gap-2">
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                                            entry.isLoadingBalances
                                                ? 'border border-white/8 bg-white/8 text-white/55'
                                                : isUsed
                                                    ? 'border border-white/8 bg-white/8 text-white/55'
                                                    : 'border border-orange-400/10 bg-orange-500/15 text-orange-300'
                                        }`}>
                                            {entry.isLoadingBalances ? 'Checking' : isUsed ? 'Used' : 'Has Balance'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/28">Card address</p>
                                    <p className="mt-2 font-mono text-sm text-white/76">{shortenAddress(entry.giftCardAddress)}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => copyGiftCode(entry.giftCode)}
                                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-orange-400/10 bg-orange-500/[0.06] px-3.5 py-2.5 text-xs font-semibold text-orange-100/80 transition-all hover:border-orange-300/20 hover:bg-orange-500/[0.1] hover:text-white"
                                >
                                    <Copy className="h-3.5 w-3.5" />
                                    Copy code
                                </button>
                            </div>

                            <div className="mt-5 grid grid-cols-3 gap-3 rounded-[1.4rem] border border-orange-400/10 bg-orange-500/[0.04] px-4 py-4">
                                {(['ALEO', 'USDCx', 'USAD'] as const).map((token) => (
                                    <div key={token} className="px-2 py-1">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-orange-100/55">
                                            {token === 'ALEO' ? 'Credits' : token}
                                        </p>
                                        <p className={`mt-3 text-[1.9rem] font-semibold leading-none tracking-tight ${
                                            token === 'ALEO' && !entry.isLoadingBalances && (entry.balances?.[token] || 0) > 0
                                                ? 'text-orange-200'
                                                : 'text-white'
                                        }`}>
                                            {entry.isLoadingBalances
                                                ? '...'
                                                : (entry.balances?.[token] || 0).toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
