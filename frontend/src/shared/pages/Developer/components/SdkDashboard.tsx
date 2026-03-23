import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { GlassCard } from '../../../components/ui/GlassCard';
import { CopyButton } from '../../../components/ui/CopyButton';
import { fetchInvoicesByMerchantForSdk, getUserProfile, Invoice, updateInvoiceStatus } from '../../../services/api';
import {
    PROGRAM_ID,
    InvoiceRecord,
    MerchantReceipt,
    parseInvoice,
    parseMerchantReceipt,
} from '../../../utils/aleo-utils';
import { InvoiceDistributionChart } from '../../Profile/components/Charts/InvoiceDistributionChart';
import { TokenDistributionChart } from '../../Profile/components/Charts/TokenDistributionChart';
import { InvoiceTable } from '../../Profile/components/InvoiceTable';
import { VerifyModal } from '../../Profile/components/modals/VerifyModal';
import { PaymentHistoryModal } from '../../Profile/components/modals/PaymentHistoryModal';
import { ReceiptHashesModal } from '../../Profile/components/modals/ReceiptHashesModal';
import toast from 'react-hot-toast';

type SdkDashboardInvoice = InvoiceRecord & {
    status: string | number;
    creationTx: string | null;
    paymentTxIds: string[];
    memo: string;
    isPending: boolean;
    source: 'chain';
    isValidOnChain: boolean;
    donations?: {
        credits: number;
        usdcx: number;
        usad: number;
    };
};

const normalizeHash = (hash?: string | null) => (hash || '').replace(/field$/, '');

const SdkStatCard = ({ label, value, tone = 'white' }: { label: string; value: string | number; tone?: 'white' | 'yellow' | 'green' | 'blue' }) => {
    const toneClass = {
        white: 'text-gradient-gold drop-shadow-gold',
        yellow: 'text-yellow-400',
        green: 'text-green-400',
        blue: 'text-cyan-300',
    }[tone];

    return (
        <GlassCard className="p-6">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">{label}</span>
            <div className={`text-3xl font-bold tracking-tighter ${toneClass}`}>{value}</div>
        </GlassCard>
    );
};

const SdkReceiptsTable = ({
    receipts,
    search,
    onViewReceipts,
}: {
    receipts: MerchantReceipt[];
    search: string;
    onViewReceipts: (hashes: string[]) => void;
}) => {
    const groupedReceipts = useMemo(() => {
        const seenReceipts = new Set<string>();
        const deduped = receipts.filter((receipt) => {
            if (seenReceipts.has(receipt.receiptHash)) return false;
            seenReceipts.add(receipt.receiptHash);
            return true;
        });

        const grouped = new Map<string, MerchantReceipt[]>();
        deduped.forEach((receipt) => {
            const key = receipt.invoiceHash;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(receipt);
        });

        return Array.from(grouped.entries()).filter(([hash]) =>
            !search || hash.toLowerCase().includes(search.toLowerCase())
        );
    }, [receipts, search]);

    return (
        <table className="w-full">
            <thead>
                <tr className="bg-black/40 border-b border-white/5 text-left">
                    <th className="py-5 px-6 text-xs font-bold text-gray-300 uppercase tracking-wider">Invoice Hash</th>
                    <th className="py-5 px-6 text-xs font-bold text-gray-300 uppercase tracking-wider text-center">Volume</th>
                    <th className="py-5 px-6 text-xs font-bold text-gray-300 uppercase tracking-wider text-right">Receipt Hashes</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {groupedReceipts.length === 0 ? (
                    <tr>
                        <td colSpan={3} className="py-8 text-center text-gray-500 italic">No SDK receipts found.</td>
                    </tr>
                ) : (
                    groupedReceipts.map(([invoiceHash, invoiceReceipts]) => {
                        let totalCredits = 0;
                        let totalUSDCx = 0;
                        let totalUSAD = 0;

                        invoiceReceipts.forEach((receipt) => {
                            const amount = Number(receipt.amount) / 1_000_000;
                            if (receipt.tokenType === 1) totalUSDCx += amount;
                            else if (receipt.tokenType === 2) totalUSAD += amount;
                            else totalCredits += amount;
                        });

                        return (
                            <tr key={invoiceHash} className="hover:bg-white/5 transition-colors group">
                                <td className="py-5 px-6">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm text-gray-300 truncate max-w-[120px]" title={invoiceHash}>
                                            {invoiceHash.slice(0, 10)}...{invoiceHash.slice(-8)}
                                        </span>
                                        <CopyButton text={invoiceHash} title="Copy Invoice Hash" className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white" />
                                    </div>
                                    <span className="block text-[10px] text-gray-500 mt-0.5">{invoiceReceipts.length} receipts</span>
                                </td>
                                <td className="py-5 px-6 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        {totalCredits > 0 && <span className="font-bold text-white text-md">{totalCredits} <span className="text-[10px] text-gray-500 uppercase">Credits</span></span>}
                                        {totalUSDCx > 0 && <span className="font-bold text-white text-md">{totalUSDCx} <span className="text-[10px] text-gray-500 uppercase">USDCx</span></span>}
                                        {totalUSAD > 0 && <span className="font-bold text-white text-md">{totalUSAD} <span className="text-[10px] text-gray-500 uppercase">USAD</span></span>}
                                    </div>
                                </td>
                                <td className="py-5 px-6 text-right">
                                    {invoiceReceipts.length === 1 ? (
                                        <div className="flex justify-end items-center gap-3">
                                            <span className="text-gray-400 truncate max-w-[120px]" title={invoiceReceipts[0].receiptHash}>
                                                {invoiceReceipts[0].receiptHash.slice(0, 8)}...{invoiceReceipts[0].receiptHash.slice(-6)}
                                            </span>
                                            <CopyButton text={invoiceReceipts[0].receiptHash} title="Copy Receipt Hash" className="flex items-center gap-1.5 text-xs bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300 px-3 py-1.5 rounded border border-cyan-300/30 transition-all" />
                                        </div>
                                    ) : (
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => onViewReceipts(invoiceReceipts.map((receipt) => receipt.receiptHash))}
                                                className="text-xs bg-cyan-400/10 hover:bg-cyan-400/20 px-3 py-1.5 rounded text-cyan-300 border border-cyan-300/20 transition-colors font-bold"
                                            >
                                                Receipts ({invoiceReceipts.length})
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })
                )}
            </tbody>
        </table>
    );
};

export const SdkDashboard: React.FC = () => {
    const { address: publicKey, requestRecords, decrypt, executeTransaction } = useWallet();
    const [transactions, setTransactions] = useState<Invoice[]>([]);
    const [createdInvoices, setCreatedInvoices] = useState<InvoiceRecord[]>([]);
    const [merchantReceipts, setMerchantReceipts] = useState<MerchantReceipt[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);
    const [loadingCreated, setLoadingCreated] = useState(false);
    const [loadingReceipts, setLoadingReceipts] = useState(false);
    const [profileMainHash, setProfileMainHash] = useState<string | null>(null);
    const [profileBurnerHash, setProfileBurnerHash] = useState<string | null>(null);
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'created' | 'receipts'>('created');
    const [currentPage, setCurrentPage] = useState(1);
    const [settling, setSettling] = useState<string | null>(null);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyInput, setVerifyInput] = useState('');
    const [verifyStatus, setVerifyStatus] = useState<'IDLE' | 'CHECKING' | 'FOUND' | 'NOT_FOUND' | 'ERROR' | 'MISMATCH'>('IDLE');
    const [verifiedRecord, setVerifiedRecord] = useState<any>(null);
    const [verifyingInvoice, setVerifyingInvoice] = useState<any>(null);
    const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[] | null>(null);
    const [selectedReceiptHashes, setSelectedReceiptHashes] = useState<string[] | null>(null);
    const fetchMerchantReceiptsRef = useRef(0);
    const itemsPerPage = 10;

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!publicKey) return;
            try {
                const profile = await getUserProfile(publicKey);
                if (profile) {
                    setProfileMainHash(profile.profile_main_invoice_hash || null);
                    setProfileBurnerHash(profile.profile_burner_invoice_hash || null);
                }
            } catch (error) {
                console.error('Failed to fetch profile hashes for SDK filtering', error);
            }
        };

        fetchProfileData();
    }, [publicKey]);

    const fetchSdkTransactions = async () => {
        if (!publicKey) {
            setTransactions([]);
            return;
        }

        setLoadingTransactions(true);
        try {
            const data = await fetchInvoicesByMerchantForSdk(publicKey, { forSdk: true });
            setTransactions(data.filter((invoice) => !invoice.is_burner));
        } catch (error) {
            console.error('Failed to fetch SDK invoices', error);
            setTransactions([]);
        } finally {
            setLoadingTransactions(false);
        }
    };

    const fetchCreatedInvoices = async () => {
        if (!requestRecords || !publicKey) {
            setCreatedInvoices([]);
            return;
        }

        setLoadingCreated(true);
        try {
            const records = await requestRecords(PROGRAM_ID, true);
            const validInvoices: InvoiceRecord[] = [];

            if (records) {
                for (const record of records as any[]) {
                    let plaintext = record.plaintext;
                    const cipher = record.recordCiphertext || record.ciphertext;
                    if (!plaintext && cipher && decrypt) {
                        try {
                            plaintext = await decrypt(cipher);
                        } catch (error) {
                            console.warn('Decrypt error for SDK created invoice', error);
                        }
                    }

                    const invoice = parseInvoice({ ...record, plaintext });
                    if (invoice) validInvoices.push(invoice);
                }
            }

            setCreatedInvoices(validInvoices.reverse());
        } catch (error) {
            console.error('Error fetching SDK created invoices', error);
            setCreatedInvoices([]);
        } finally {
            setLoadingCreated(false);
        }
    };

    const fetchMerchantReceipts = async () => {
        if (!requestRecords || !publicKey) {
            setMerchantReceipts([]);
            return;
        }

        const fetchId = ++fetchMerchantReceiptsRef.current;
        setLoadingReceipts(true);

        try {
            const records = await requestRecords(PROGRAM_ID, true);
            if (fetchId !== fetchMerchantReceiptsRef.current) return;

            const validReceipts: MerchantReceipt[] = [];

            if (records) {
                for (const record of records as any[]) {
                    if (record.spent) continue;

                    let plaintext = record.plaintext;
                    const cipher = record.recordCiphertext || record.ciphertext;
                    if (!plaintext && cipher && decrypt) {
                        try {
                            plaintext = await decrypt(cipher);
                        } catch (error) {
                            console.warn('Decrypt error for SDK merchant receipt', error);
                        }
                    }

                    const receipt = parseMerchantReceipt({ ...record, plaintext });
                    if (receipt) validReceipts.push(receipt);
                }
            }

            setMerchantReceipts(validReceipts.reverse());
        } catch (error) {
            console.error('Error fetching SDK merchant receipts', error);
            setMerchantReceipts([]);
        } finally {
            if (fetchId === fetchMerchantReceiptsRef.current) {
                setLoadingReceipts(false);
            }
        }
    };

    useEffect(() => {
        if (!publicKey) {
            setTransactions([]);
            setCreatedInvoices([]);
            setMerchantReceipts([]);
            return;
        }

        fetchSdkTransactions();
        fetchCreatedInvoices();
        fetchMerchantReceipts();
    }, [publicKey]);

    const excludedHashSet = useMemo(() => {
        return new Set(
            [profileMainHash, profileBurnerHash]
                .map((hash) => normalizeHash(hash))
                .filter(Boolean)
        );
    }, [profileMainHash, profileBurnerHash]);

    const sdkDbTransactions = useMemo(() => {
        return transactions.filter((invoice) => invoice.for_sdk && !invoice.is_burner);
    }, [transactions]);

    const sdkHashSet = useMemo(() => {
        return new Set(sdkDbTransactions.map((invoice) => normalizeHash(invoice.invoice_hash)));
    }, [sdkDbTransactions]);

    const filteredMerchantReceipts = useMemo(() => {
        const seen = new Set<string>();
        return merchantReceipts.filter((receipt) => {
            const normalizedHash = normalizeHash(receipt.invoiceHash);
            if (!sdkHashSet.has(normalizedHash)) return false;
            if (excludedHashSet.has(normalizedHash)) return false;
            if (seen.has(receipt.receiptHash)) return false;
            seen.add(receipt.receiptHash);
            return true;
        });
    }, [merchantReceipts, sdkHashSet, excludedHashSet]);

    const combinedInvoices = useMemo<SdkDashboardInvoice[]>(() => {
        const dbMap = new Map<string, Invoice>();
        sdkDbTransactions.forEach((transaction) => {
            dbMap.set(normalizeHash(transaction.invoice_hash), transaction);
        });

        const donationTotals = new Map<string, { credits: number; usdcx: number; usad: number }>();
        filteredMerchantReceipts.forEach((receipt) => {
            const hash = normalizeHash(receipt.invoiceHash);
            if (!donationTotals.has(hash)) {
                donationTotals.set(hash, { credits: 0, usdcx: 0, usad: 0 });
            }

            const totals = donationTotals.get(hash)!;
            const amount = Number(receipt.amount) / 1_000_000;
            if (receipt.tokenType === 1) totals.usdcx += amount;
            else if (receipt.tokenType === 2) totals.usad += amount;
            else totals.credits += amount;
        });

        return createdInvoices
            .filter((record) => record.walletType !== 1)
            .filter((record) => sdkHashSet.has(normalizeHash(record.invoiceHash)))
            .filter((record) => !excludedHashSet.has(normalizeHash(record.invoiceHash)))
            .map((record) => {
                const dbTx = dbMap.get(normalizeHash(record.invoiceHash));
                const invoice: SdkDashboardInvoice = {
                    ...record,
                    amount: record.amount / 1_000_000,
                    status: dbTx?.status === 'SETTLED' ? 'SETTLED' : 'PENDING',
                    creationTx: dbTx?.invoice_transaction_id || null,
                    paymentTxIds: dbTx?.payment_tx_ids || (dbTx?.payment_tx_id ? [dbTx.payment_tx_id] : []),
                    memo: record.memo || dbTx?.memo || '',
                    isPending: false,
                    source: 'chain',
                    isValidOnChain: true,
                };

                if (invoice.invoiceType === 2) {
                    invoice.donations = donationTotals.get(normalizeHash(invoice.invoiceHash)) || {
                        credits: 0,
                        usdcx: 0,
                        usad: 0,
                    };
                    invoice.amount = invoice.donations.credits + invoice.donations.usdcx + invoice.donations.usad;
                }

                return invoice;
            });
    }, [createdInvoices, filteredMerchantReceipts, sdkDbTransactions, sdkHashSet, excludedHashSet]);

    const sdkStats = useMemo(() => {
        const totals = filteredMerchantReceipts.reduce(
            (acc, receipt) => {
                const amount = Number(receipt.amount) / 1_000_000;
                if (receipt.tokenType === 1) acc.usdcx += amount;
                else if (receipt.tokenType === 2) acc.usad += amount;
                else acc.credits += amount;
                return acc;
            },
            { credits: 0, usdcx: 0, usad: 0 }
        );

        return {
            credits: totals.credits.toFixed(2),
            usdcx: totals.usdcx.toFixed(2),
            usad: totals.usad.toFixed(2),
            invoices: combinedInvoices.length,
            settled: combinedInvoices.filter((invoice) => invoice.status === 'SETTLED' || invoice.status === 1).length,
            pending: combinedInvoices.filter((invoice) => invoice.status === 'PENDING' || invoice.status === 0).length,
        };
    }, [combinedInvoices, filteredMerchantReceipts]);

    const handleVerifyReceipt = async () => {
        if (!verifyInput || !requestRecords || !decrypt) return;

        try {
            setVerifyStatus('CHECKING');
            setVerifiedRecord(null);
            const records = await requestRecords(PROGRAM_ID, true);
            let foundRecord = null;

            if (records) {
                for (const record of records as any[]) {
                    if (record.spent) continue;

                    let plaintext = record.plaintext;
                    if (!plaintext && record.recordCiphertext) {
                        try {
                            plaintext = await decrypt(record.recordCiphertext);
                        } catch (error) {
                            console.warn('SDK verification decrypt error', error);
                        }
                    }

                    if (!plaintext || !plaintext.includes(verifyInput)) continue;

                    const amountMatch = plaintext.match(/amount:\s*([\d_]+)u(64|128)/);
                    const tokenTypeMatch = plaintext.match(/token_type:\s*(\d+)u8/);
                    const invoiceHashMatch = plaintext.match(/invoice_hash:\s*([\d]+)field/);

                    foundRecord = {
                        plaintext,
                        amount: amountMatch ? parseInt(amountMatch[1].replace(/_/g, ''), 10) / 1_000_000 : 'Unknown',
                        tokenType: tokenTypeMatch ? parseInt(tokenTypeMatch[1], 10) : 0,
                        invoiceHash: invoiceHashMatch ? invoiceHashMatch[1] : 'Unknown',
                    };
                    break;
                }
            }

            if (foundRecord) {
                const recordHash = foundRecord.invoiceHash.trim();
                let invoiceHash = (verifyingInvoice?.invoiceHash || verifyingInvoice?.invoice_hash || '').trim();
                if (invoiceHash.endsWith('field')) invoiceHash = invoiceHash.slice(0, -5);

                setVerifiedRecord(foundRecord);
                setVerifyStatus(recordHash !== invoiceHash ? 'MISMATCH' : 'FOUND');
            } else {
                setVerifyStatus('NOT_FOUND');
            }
        } catch (error) {
            console.error('SDK receipt verification failed', error);
            setVerifyStatus('ERROR');
        }
    };

    const handleSettle = async (invoice: SdkDashboardInvoice) => {
        if (!invoice || !invoice.salt || !executeTransaction) return;

        setSettling(invoice.invoiceHash);
        try {
            const isDonation = invoice.invoiceType === 2;
            const amountMicro = isDonation ? 0 : Math.round(invoice.amount * 1_000_000);

            const transaction = {
                program: PROGRAM_ID,
                function: 'settle_invoice',
                inputs: [
                    invoice.salt,
                    `${amountMicro}u64`
                ],
                fee: 100_000,
                privateFee: false
            };

            const result = await executeTransaction(transaction);
            if (result && result.transactionId) {
                await updateInvoiceStatus(invoice.invoiceHash, { status: 'SETTLED' });
                setTimeout(() => {
                    fetchSdkTransactions();
                    fetchCreatedInvoices();
                    fetchMerchantReceipts();
                }, 2000);
            }
        } catch (error: any) {
            console.error('SDK settlement failed', error);
            toast.error(`Failed to settle invoice: ${error.message || 'Unknown error'}`);
        } finally {
            setSettling(null);
        }
    };

    const openExplorer = (txId?: string) => {
        if (txId) {
            window.open(`https://testnet.explorer.provable.com/transaction/${txId}`, '_blank');
        }
    };

    if (!publicKey) {
        return (
            <GlassCard className="p-8 md:p-10 text-center">
                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">SDK Dashboard</span>
                <h2 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)] mt-3 mb-4">Connect Your Wallet</h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-8">
                    Connect the same merchant wallet you use to create invoices. The dashboard loads your private SDK invoice records and receipts.
                </p>
                <div className="flex justify-center">
                    <WalletMultiButton className="!bg-white !text-black !font-bold !rounded-xl !h-12" />
                </div>
            </GlassCard>
        );
    }

    return (
        <div className="space-y-8">
            <VerifyModal
                isOpen={showVerifyModal}
                onClose={() => setShowVerifyModal(false)}
                verifyingInvoice={verifyingInvoice}
                verifyInput={verifyInput}
                setVerifyInput={setVerifyInput}
                verifyStatus={verifyStatus}
                verifiedRecord={verifiedRecord}
                merchantReceipts={filteredMerchantReceipts}
                onVerify={handleVerifyReceipt}
            />

            <PaymentHistoryModal
                paymentIds={selectedPaymentIds}
                onClose={() => setSelectedPaymentIds(null)}
                onViewTx={openExplorer}
            />

            <ReceiptHashesModal
                receiptHashes={selectedReceiptHashes}
                onClose={() => setSelectedReceiptHashes(null)}
            />

            <GlassCard className="p-8 md:p-10">
                <span className="text-[11px] uppercase tracking-[0.25em] text-gray-500 font-semibold">SDK Dashboard</span>
                <h2 className="text-3xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)] mt-3 mb-2">Tagged SDK Invoices</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                    This dashboard only includes invoices created with the SDK toggle enabled. Analytics and receipt checks are sourced from your private wallet records and filtered against those tagged invoice hashes.
                </p>
            </GlassCard>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SdkStatCard label="Credits Volume" value={sdkStats.credits} />
                <SdkStatCard label="USDCx Volume" value={sdkStats.usdcx} tone="blue" />
                <SdkStatCard label="USAD Volume" value={sdkStats.usad} tone="green" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SdkStatCard label="Total SDK Invoices" value={sdkStats.invoices} />
                <SdkStatCard label="Pending" value={sdkStats.pending} tone="yellow" />
                <SdkStatCard label="Settled" value={sdkStats.settled} tone="green" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <InvoiceDistributionChart invoices={combinedInvoices as unknown as InvoiceRecord[]} isLoading={loadingCreated} />
                <TokenDistributionChart receipts={filteredMerchantReceipts} isLoading={loadingReceipts} />
            </div>

            <GlassCard className="p-0 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex flex-col items-center justify-center gap-4">
                    <div className="flex p-1 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 relative">
                        {[
                            { id: 'created', label: 'SDK Invoices' },
                            { id: 'receipts', label: 'SDK Receipts' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as 'created' | 'receipts')}
                                className={`relative z-10 px-6 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
                                    activeTab === tab.id ? 'text-black' : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {activeTab === tab.id && (
                                    <div className="absolute inset-0 bg-white rounded-full -z-10" />
                                )}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="px-6 pb-4">
                    <div className="relative max-w-md mx-auto">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by invoice hash..."
                            value={invoiceSearch}
                            onChange={(event) => setInvoiceSearch(event.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-10 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-primary/50 focus:ring-1 focus:ring-neon-primary/30 transition-colors"
                        />
                        {invoiceSearch && (
                            <button
                                onClick={() => setInvoiceSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                            >
                                x
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[300px]">
                    <div style={{ display: activeTab === 'created' ? 'block' : 'none' }}>
                        <InvoiceTable
                            invoices={combinedInvoices}
                            loading={loadingCreated || loadingTransactions}
                            search={invoiceSearch}
                            currentPage={currentPage}
                            itemsPerPage={itemsPerPage}
                            setCurrentPage={setCurrentPage}
                            onVerify={(invoice) => {
                                setVerifyingInvoice(invoice);
                                setVerifyInput('');
                                setVerifyStatus('IDLE');
                                setVerifiedRecord(null);
                                setShowVerifyModal(true);
                            }}
                            onSettle={handleSettle}
                            settlingId={settling}
                            onViewPayments={(ids) => setSelectedPaymentIds(ids)}
                            transactions={sdkDbTransactions}
                        />
                    </div>

                    <div style={{ display: activeTab === 'receipts' ? 'block' : 'none' }}>
                        <SdkReceiptsTable
                            receipts={filteredMerchantReceipts}
                            search={invoiceSearch}
                            onViewReceipts={(hashes) => setSelectedReceiptHashes(hashes)}
                        />
                    </div>
                </div>

                <div className="p-4 bg-white/5 border-t border-white/5 text-center text-xs text-gray-500 italic">
                    SDK analytics are derived from your private merchant records and filtered by DB-tagged SDK invoice hashes.
                </div>
            </GlassCard>
        </div>
    );
};

export default SdkDashboard;
