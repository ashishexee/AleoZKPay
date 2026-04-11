import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard';
import { useTransactions } from '../../hooks/useTransactions';
import { PROGRAM_ID, WALLET_PROGRAM_ID, estimateExecutionFee, parseMerchantReceipt, MerchantReceipt, parseInvoice, InvoiceRecord, parsePayerReceipt, PayerReceipt, fetchBurnerRecordsFromTx } from '../../utils/aleo-utils';
import { useBurnerWallet } from '../../hooks/BurnerWalletProvider';
import { useWalletErrorHandler } from '../../hooks/Wallet/WalletErrorBoundary';
import { StatsCards } from './components/StatsCards';
import { InvoiceTable } from './components/InvoiceTable';
import { PaidInvoicesTable } from './components/PaidInvoicesTable';
import { VerifyModal } from './components/modals/VerifyModal';
import toast from 'react-hot-toast';
import { executeWithShieldRetry } from '../../utils/shieldRetry';
import { PaymentHistoryModal } from './components/modals/PaymentHistoryModal';
import { ReceiptHashesModal } from './components/modals/ReceiptHashesModal';
import { PayerNotesModal } from './components/modals/PayerNotesModal';
import { BurnerWalletSettings } from './components/BurnerWalletSettings';
import { BackupBanner } from './components/BackupBanner';
import { InvoiceDistributionChart } from './components/Charts/InvoiceDistributionChart';
import { TokenDistributionChart } from './components/Charts/TokenDistributionChart';
import { PaymentTimelineChart } from './components/Charts/PaymentTimelineChart';
import { WalletBalances } from './components/WalletBalances';
import { useWalletBalances } from '../../hooks/useWalletBalances';
import { DashboardChatbot } from './components/DashboardChatbot';
import { buildMerchantAuditReportHtmlAsset, downloadMerchantCreditReportHtml, ReportOptions } from '../../utils/generateMerchantReportsPdf';
import { generateMerchantAuditPackage } from '../../utils/auditPackage';
import { GeneratedAuditAssets, ReportConfigModal } from './components/modals/ReportConfigModal';
// CardWalletPanel import moved to dedicated route

const Profile: React.FC = () => {
    const { address, requestRecords, decrypt, executeTransaction, wallet } = useWallet();
    const { handleWalletError } = useWalletErrorHandler();
    const { decryptedBurnerKey, decryptedBurnerAddress } = useBurnerWallet();
    const publicKey = address;
    const { transactions: mainTransactions, loading: loadingTransactions, fetchTransactions } = useTransactions(publicKey || undefined);
    const [burnerDbTransactions, setBurnerDbTransactions] = useState<any[]>([]);

    // Merge main + burner DB transactions so fetchBurnerData can find burner TX IDs
    const transactions = useMemo(() => {
        const merged = [...mainTransactions];
        const existingHashes = new Set(mainTransactions.map(t => t.invoice_hash));
        burnerDbTransactions.forEach(t => {
            if (!existingHashes.has(t.invoice_hash)) {
                merged.push(t);
            }
        });
        return merged;
    }, [mainTransactions, burnerDbTransactions]);
    const paymentTimestampsByTxId = useMemo(() => {
        const timestamps: Record<string, string> = {};

        transactions.forEach((tx: any) => {
            const paymentTimestamps = tx.payment_timestamps;
            if (!paymentTimestamps || typeof paymentTimestamps !== 'object' || Array.isArray(paymentTimestamps)) {
                return;
            }

            Object.entries(paymentTimestamps).forEach(([txId, timestamp]) => {
                if (typeof timestamp === 'string' && timestamp && !timestamps[txId]) {
                    timestamps[txId] = timestamp;
                }
            });
        });

        return timestamps;
    }, [transactions]);
    const [settling, setSettling] = useState<string | null>(null);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyInput, setVerifyInput] = useState('');
    const [verifyStatus, setVerifyStatus] = useState<'IDLE' | 'CHECKING' | 'FOUND' | 'NOT_FOUND' | 'ERROR' | 'MISMATCH'>('IDLE');
    const [verifiedRecord, setVerifiedRecord] = useState<any>(null);
    const [verifyingInvoice, setVerifyingInvoice] = useState<any>(null);
    const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[] | null>(null);
    const [selectedReceipts, setSelectedReceipts] = useState<PayerReceipt[] | null>(null);
    const [selectedNotes, setSelectedNotes] = useState<string[] | null>(null);
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [valueFilterType, setValueFilterType] = useState<'none' | 'amount' | 'earnings'>('none');
    const [dateFilterMode, setDateFilterMode] = useState<'all' | 'single' | 'range'>('all');
    const [singleDateFilter, setSingleDateFilter] = useState('');
    const [rangeStartDateFilter, setRangeStartDateFilter] = useState('');
    const [rangeEndDateFilter, setRangeEndDateFilter] = useState('');
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);
    const [valueFilterInput, setValueFilterInput] = useState('');
    const [activeTab, setActiveTab] = useState<'created' | 'paid'>('created');
    const [mainViewTab, setMainViewTab] = useState<'statistics' | 'dashboard'>('statistics');
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (location.pathname === '/profile/dashboard') {
            setMainViewTab('dashboard');
        } else if (location.pathname === '/profile/statistics' || location.pathname === '/profile') {
            setMainViewTab('statistics');
        }
    }, [location.pathname]);
    const [merchantReceipts, setMerchantReceipts] = useState<MerchantReceipt[]>([]);
    const [createdInvoices, setCreatedInvoices] = useState<InvoiceRecord[]>([]);
    const [payerReceipts, setPayerReceipts] = useState<PayerReceipt[]>([]);
    const [burnerCreatedInvoices, setBurnerCreatedInvoices] = useState<InvoiceRecord[]>([]);
    const [burnerMerchantReceipts, setBurnerMerchantReceipts] = useState<MerchantReceipt[]>([]);
    const [loadingReceipts, setLoadingReceipts] = useState(false);
    const [loadingCreated, setLoadingCreated] = useState(false);
    const [loadingBurner, setLoadingBurner] = useState(true);
    const [loadingPayerReceipts, setLoadingPayerReceipts] = useState(false);
    const [creditReportLoading, setCreditReportLoading] = useState(false);
    const [auditReportLoading, setAuditReportLoading] = useState(false);
    const [showReportConfigModal, setShowReportConfigModal] = useState(false);
    const [currentReportType, setCurrentReportType] = useState<'audit' | 'credit'>('audit');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const fetchPayerReceiptsRef = useRef(0);

    const [profileMainHash, setProfileMainHash] = useState<string | null>(null);
    const [profileBurnerHash, setProfileBurnerHash] = useState<string | null>(null);
    const { balances } = useWalletBalances();
    const normalizedValueFilterAmount = valueFilterInput.trim() ? Number(valueFilterInput) : null;
    const hasInvalidValueFilter = valueFilterInput.trim().length > 0 && (!Number.isFinite(normalizedValueFilterAmount) || (normalizedValueFilterAmount ?? 0) < 0);
    const appliedValueFilterAmount = hasInvalidValueFilter ? null : normalizedValueFilterAmount;
    const searchPlaceholder = activeTab === 'created'
        ? 'Search by invoice hash, salt, title, memo, or merchant note...'
        : 'Search by invoice hash or payer note...';

    useEffect(() => {
        const fetchProfileData = async () => {
            if (publicKey) {
                try {
                    const { getUserProfile } = await import('../../services/api');
                    const profile = await getUserProfile(publicKey);
                    if (profile) {
                        setProfileMainHash(profile.profile_main_invoice_hash || null);
                        setProfileBurnerHash(profile.profile_burner_invoice_hash || null);
                    }
                } catch (e) {
                    console.error("Failed to fetch profile hashes for exclusion", e);
                }
            }
        };
        fetchProfileData();
    }, [publicKey]);

    useEffect(() => {
        if (publicKey) {
            console.log("Profile mounted/updated. Fetching all data...");
            fetchTransactions();
            fetchCreatedInvoices();
            fetchMerchantReceipts();
            fetchPayerReceipts();
        }
    }, [publicKey]);

    useEffect(() => {
        setCurrentPage(1);
    }, [invoiceSearch, valueFilterType, valueFilterInput, activeTab, dateFilterMode, singleDateFilter, rangeStartDateFilter, rangeEndDateFilter]);

    useEffect(() => {
        if (activeTab === 'paid' && valueFilterType === 'earnings') {
            setValueFilterType('amount');
        }
    }, [activeTab, valueFilterType]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
                setIsFilterDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch burner invoices from DB separately (they have a different merchant_address_hash)
    useEffect(() => {
        console.log("🔥 [BurnerDB] Effect fired. decryptedBurnerAddress:", !!decryptedBurnerAddress, decryptedBurnerAddress?.slice(0, 15));
        const fetchBurnerDbInvoices = async () => {
            if (!decryptedBurnerAddress) {
                setBurnerDbTransactions([]);
                return;
            }
            try {
                const { fetchInvoicesByMerchant: fetchByMerchant } = await import('../../services/api');
                const data = await fetchByMerchant(decryptedBurnerAddress);
                console.log(`🔥 [BurnerDB] Fetched ${data.length} burner invoices from DB`);
                setBurnerDbTransactions(data);
            } catch (e) {
                console.error('Failed to fetch burner DB invoices', e);
            }
        };
        fetchBurnerDbInvoices();
    }, [decryptedBurnerAddress]);

    useEffect(() => {
        const fetchBurnerData = async () => {
            console.log("🔥 [fetchBurnerData] Effect fired. decryptedBurnerKey:", !!decryptedBurnerKey, "transactions.length:", transactions.length);
            if (!decryptedBurnerKey || transactions.length === 0) {
                console.log("🔥 [fetchBurnerData] ABORTED - missing key or empty transactions");
                if (!decryptedBurnerKey) {
                    setLoadingBurner(false);
                }
                return;
            }
            setLoadingBurner(true);

            const burnerTxIds = new Set<string>();
            console.log("🔥 Burner Transactions from DB:", transactions.filter(t => t.is_burner).length);
            transactions.forEach(tx => {
                if (tx.is_burner) {
                    if (tx.invoice_transaction_id) burnerTxIds.add(tx.invoice_transaction_id);
                    if (tx.payment_tx_ids && Array.isArray(tx.payment_tx_ids)) {
                        tx.payment_tx_ids.forEach((id: string) => burnerTxIds.add(id));
                    }
                }
            });

            if (burnerTxIds.size === 0) {
                setLoadingBurner(false);
                return;
            }

            console.log("Fetching Burner records for TXs:", Array.from(burnerTxIds));
            const newCreated: InvoiceRecord[] = [];
            const newReceipts: MerchantReceipt[] = [];

            for (const txId of Array.from(burnerTxIds)) {
                const records = await fetchBurnerRecordsFromTx(txId, decryptedBurnerKey);
                for (const r of records) {
                    const invoice = parseInvoice(r);
                    if (invoice) newCreated.push(invoice);
                    const receipt = parseMerchantReceipt(r);
                    if (receipt) newReceipts.push(receipt);
                }
            }
            console.log("🔥 Final Parsed Burner Invoices:", newCreated.length, newCreated);
            console.log("🔥 Final Parsed Burner Receipts:", newReceipts.length, newReceipts);
            setBurnerCreatedInvoices(newCreated);
            setBurnerMerchantReceipts(newReceipts);
            setLoadingBurner(false);
        };
        fetchBurnerData();
    }, [transactions, decryptedBurnerKey]);

    const fetchCreatedInvoices = async () => {
        if (!requestRecords || !publicKey) return;
        setLoadingCreated(true);
        try {
            const records = await requestRecords(PROGRAM_ID, true);
            const validInvoices: InvoiceRecord[] = [];

            if (records) {
                console.log("Fetching created invoices from records...");
                for (const r of (records as any[])) {
                    let plaintext = r.plaintext;
                    const cipher = r.recordCiphertext || r.ciphertext;
                    if (!plaintext && cipher && decrypt) {
                        try {
                            plaintext = await decrypt(cipher);
                        } catch (e) { console.warn("Decrypt error for created invoice:", e); }
                    }

                    const invoice = parseInvoice({ ...r, plaintext });
                    if (invoice) {
                        console.log("Found On-Chain Invoice:", invoice.invoiceHash, "Amount:", invoice.amount);
                        validInvoices.push(invoice);
                    }
                }
            }
            setCreatedInvoices(validInvoices.reverse());
        } catch (e) {
            handleWalletError(e);
            console.error("Error fetching created invoices:", e);
        } finally {
            setLoadingCreated(false);
        }
    };

    const fetchMerchantReceipts = async () => {
        if (!requestRecords || !publicKey) return;
        setLoadingReceipts(true);
        console.log("Fetching Merchant Receipts...");
        try {
            const [coreRecords, walletRecords] = await Promise.all([
                requestRecords(PROGRAM_ID, true),
                requestRecords(WALLET_PROGRAM_ID, true)
            ]);
            const validReceipts: MerchantReceipt[] = [];
            const allRecords = [...((coreRecords as any[]) || []), ...((walletRecords as any[]) || [])];

            if (allRecords.length > 0) {
                for (const r of allRecords) {
                    if (r.spent) continue;

                    let plaintext = r.plaintext;
                    const cipher = r.recordCiphertext || r.ciphertext;
                    if (!plaintext && cipher && decrypt) {
                        try {
                            plaintext = await decrypt(cipher);
                        } catch (e) { console.warn("Decrypt error for merchant receipt:", e); }
                    }
                    // Try parsing as MerchantReceipt
                    const receipt = parseMerchantReceipt({ ...r, plaintext });
                    if (receipt) {
                        validReceipts.push(receipt);
                    }
                }
            }
            console.log("Merchant Receipts Found:", validReceipts.length);
            const dedupedReceipts = Array.from(
                new Map(validReceipts.map((receipt) => [receipt.receiptHash, receipt])).values()
            );
            setMerchantReceipts(dedupedReceipts.reverse());
        } catch (e) {
            handleWalletError(e);
            console.error("Error fetching merchant receipts:", e);
        } finally {
            setLoadingReceipts(false);
        }
    };

    const fetchPayerReceipts = async () => {
        if (!requestRecords || !publicKey) return;
        const fetchId = ++fetchPayerReceiptsRef.current;
        setLoadingPayerReceipts(true);
        console.log(`[fetchPayerReceipts #${fetchId}] Starting...`);
        try {
            const records = await requestRecords(PROGRAM_ID, true);
            if (fetchId !== fetchPayerReceiptsRef.current) {
                console.log(`[fetchPayerReceipts #${fetchId}] Stale fetch, discarding.`);
                return;
            }
            const validReceipts: PayerReceipt[] = [];

            if (records) {
                for (const r of (records as any[])) {
                    let plaintext = r.plaintext;
                    const cipher = r.recordCiphertext || r.ciphertext;
                    if (!plaintext && cipher && decrypt) {
                        try {
                            plaintext = await decrypt(cipher);
                        } catch (e) { console.warn("Decrypt error for payer receipt:", e); }
                    }

                    const receipt = parsePayerReceipt({ ...r, plaintext });
                    if (receipt) {
                        console.log(`[fetchPayerReceipts #${fetchId}] Found Payer Receipt:`, receipt);
                        validReceipts.push(receipt);
                    }
                }
            }
            console.log(`[fetchPayerReceipts #${fetchId}] Total Payer Receipts Parsed:`, validReceipts.length);
            setPayerReceipts([...validReceipts].reverse());
            console.log(`[fetchPayerReceipts #${fetchId}] State updated with ${validReceipts.length} receipts.`);
        } catch (e) {
            handleWalletError(e);
            console.error(`[fetchPayerReceipts #${fetchId}] Error:`, e);
        } finally {
            if (fetchId === fetchPayerReceiptsRef.current) {
                setLoadingPayerReceipts(false);
                console.log(`[fetchPayerReceipts #${fetchId}] Loading set to false.`);
            }
        }
    };

    const sdkHashSet = useMemo(() => {
        return new Set(transactions.filter(tx => tx.for_sdk).map(tx => tx.invoice_hash));
    }, [transactions]);

    const combinedInvoices = useMemo(() => {
        const merged = new Map<string, any>();
        console.log("🔄 Merging Invoices! Created:", createdInvoices.length, "Burner Created:", burnerCreatedInvoices.length);

        // 1. Index DB transactions for quick lookup (Metadata only)
        const dbMap = new Map<string, any>();
        transactions.forEach(tx => {
            if (tx.invoice_hash) dbMap.set(tx.invoice_hash, tx);
        });

        // 2. Layer on On-Chain Records (Authoritative Data)
        // MAIN WALLET INVOICES
        createdInvoices.forEach(record => {
            if (record.invoiceHash === profileMainHash || record.invoiceHash === profileBurnerHash) return; // Filter explicitly only Profile QRs from the Dashboard!
            if (sdkHashSet.has(record.invoiceHash)) return; // Filter explicitly SDK invoices from the Main Dashboard!

            const dbTx = dbMap.get(record.invoiceHash);
            if (!dbTx) return;

            merged.set(record.invoiceHash, {
                invoiceHash: record.invoiceHash,
                amount: record.amount / 1_000_000,
                tokenType: record.tokenType,
                invoiceType: record.invoiceType,
                walletType: 0, // Enforce Main Wallet
                owner: record.owner,
                salt: record.salt,
                title: record.title || '',

                // Merge DB Metadata if available
                status: dbTx?.status === 'SETTLED' ? 'SETTLED' : 'PENDING',
                createdAt: dbTx?.created_at || null,
                creationTx: dbTx?.invoice_transaction_id || null,
                paymentTxIds: dbTx?.payment_tx_ids || (dbTx?.payment_tx_id ? [dbTx.payment_tx_id] : []),
                memo: record.memo || dbTx?.memo || '',
                isPending: false,
                source: 'chain',
                isValidOnChain: true
            });
        });

        // BURNER WALLET INVOICES
        burnerCreatedInvoices.forEach(record => {
            if (record.invoiceHash === profileMainHash || record.invoiceHash === profileBurnerHash) return; // Filter explicitly only Profile QRs from the Dashboard!
            if (sdkHashSet.has(record.invoiceHash)) return; // Filter explicitly SDK invoices from the Main Dashboard!

            const dbTx = dbMap.get(record.invoiceHash);
            if (!dbTx) return;

            merged.set(record.invoiceHash, {
                invoiceHash: record.invoiceHash,
                amount: record.amount / 1_000_000,
                tokenType: record.tokenType,
                invoiceType: record.invoiceType,
                walletType: 1, // Enforce Burner Wallet
                owner: record.owner,
                salt: record.salt,
                title: record.title || '',

                // Merge DB Metadata if available
                status: dbTx?.status === 'SETTLED' ? 'SETTLED' : 'PENDING',
                createdAt: dbTx?.created_at || null,
                creationTx: dbTx?.invoice_transaction_id || null,
                paymentTxIds: dbTx?.payment_tx_ids || (dbTx?.payment_tx_id ? [dbTx.payment_tx_id] : []),
                memo: record.memo || dbTx?.memo || '',
                isPending: false,
                source: 'chain',
                isValidOnChain: true
            });
        });
        // 3. Aggregate receipt-derived earnings from merchant-visible records
        const allReceipts = [...merchantReceipts, ...burnerMerchantReceipts];
        const receiptTotals = new Map<string, { credits: number, usdcx: number, usad: number }>();
        const receiptNotes = new Map<string, string[]>();
        allReceipts.forEach(receipt => {
            const hash = receipt.invoiceHash.replace('field', '');
            if (!receiptTotals.has(hash)) {
                receiptTotals.set(hash, { credits: 0, usdcx: 0, usad: 0 });
            }
            if (!receiptNotes.has(hash)) {
                receiptNotes.set(hash, []);
            }
            const totals = receiptTotals.get(hash)!;
            const amt = receipt.amount / 1_000_000;
            if (receipt.tokenType === 0) totals.credits += amt;
            else if (receipt.tokenType === 1) totals.usdcx += amt;
            else if (receipt.tokenType === 2) totals.usad += amt;

            const note = (receipt.merchantNote || '').trim();
            if (note) {
                const currentNotes = receiptNotes.get(hash)!;
                if (!currentNotes.includes(note)) {
                    currentNotes.push(note);
                }
            }
        });

        // Attach receipt-derived earnings to every invoice, and use them as
        // the displayed amount for open-ended / donation invoices.
        merged.forEach((inv, hash) => {
            const normalizedHash = hash.replace('field', '');
            const totals = receiptTotals.get(normalizedHash);
            const notes = receiptNotes.get(normalizedHash) || [];
            inv.earnings = totals || { credits: 0, usdcx: 0, usad: 0 };
            inv.merchantNotes = notes;
            inv.latestMerchantNote = notes[notes.length - 1] || '';

            if (inv.invoiceType === 2 || !inv.amount) {
                if (totals) {
                    inv.donations = totals;
                    // Set the display amount to the total across all token types
                    inv.amount = totals.credits + totals.usdcx + totals.usad;
                }
            }
        });

        const finalArr = Array.from(merged.values());
        console.log("🔄 Final Combined Invoices Array (excluding Tips):", finalArr.length, finalArr);
        return finalArr;
    }, [transactions, createdInvoices, merchantReceipts, burnerCreatedInvoices, burnerMerchantReceipts]);

    const handleVerifyReceipt = async () => {
        if (!verifyInput || !requestRecords || !decrypt) return;

        try {
            setVerifyStatus('CHECKING');
            setVerifiedRecord(null);
            const records = await requestRecords(PROGRAM_ID, true);
            console.log("Checking records for receipt:", verifyInput);
            console.log("Records found:", records?.length);

            let foundRecord = null;

            if (records) {
                for (const [index, r] of (records as any[]).entries()) {
                    if (r.spent) {
                        console.log(`[Record ${index}] Skipped (spent)`);
                        continue;
                    }
                    let plaintext = r.plaintext;
                    if (!plaintext && r.recordCiphertext) {
                        try {
                            plaintext = await decrypt(r.recordCiphertext);
                        } catch (e) { console.warn("Decrypt error", e); }
                    }

                    if (plaintext) {
                        console.log(`[Record ${index}] Plaintext:`, plaintext);
                        if (plaintext.includes(verifyInput)) {
                            console.log("Match found in record:", index);
                            const amountMatch = plaintext.match(/amount:\s*([\d_]+)u64/);
                            const tokenTypeMatch = plaintext.match(/token_type:\s*(\d+)u8/);
                            const invoiceHashMatch = plaintext.match(/invoice_hash:\s*([\d]+)field/);

                            const rInvoiceHash = invoiceHashMatch ? invoiceHashMatch[1] : 'Unknown';

                            foundRecord = {
                                plaintext,
                                amount: amountMatch ? parseInt(amountMatch[1].replace(/_/g, '')) / 1_000_000 : 'Unknown',
                                tokenType: tokenTypeMatch ? parseInt(tokenTypeMatch[1]) : 0,
                                invoiceHash: rInvoiceHash
                            };

                            console.log("Parsed Record Data:", foundRecord);
                            break;
                        } else {
                            console.log(`[Record ${index}] No match for:`, verifyInput);
                        }
                    } else {
                        console.log(`[Record ${index}] No plaintext available`);
                    }
                }
            }

            if (foundRecord) {
                const recordHash = foundRecord.invoiceHash.trim();
                let invoiceHash = (verifyingInvoice.invoiceHash || verifyingInvoice.invoice_hash || '').trim();
                if (invoiceHash.endsWith('field')) {
                    invoiceHash = invoiceHash.slice(0, -5);
                }

                console.log(`Verifying: Record[${recordHash}] vs Invoice[${invoiceHash}]`);

                if (verifyingInvoice && recordHash !== invoiceHash) {
                    setVerifiedRecord(foundRecord);
                    setVerifyStatus('MISMATCH');
                } else {
                    setVerifiedRecord(foundRecord);
                    setVerifyStatus('FOUND');
                }
            } else {
                setVerifyStatus('NOT_FOUND');
            }

        } catch (e) {
            handleWalletError(e);
            console.error("Verification failed", e);
            setVerifyStatus('ERROR');
        }
    };



    const uniqueMainReceipts = useMemo(() => {
        return Array.from(new Map(merchantReceipts.map((receipt) => [receipt.receiptHash, receipt])).values())
            .filter((receipt) => receipt.invoiceHash !== profileMainHash && receipt.invoiceHash !== profileBurnerHash && !sdkHashSet.has(receipt.invoiceHash));
    }, [merchantReceipts, profileMainHash, profileBurnerHash, sdkHashSet]);

    const uniqueBurnerReceipts = useMemo(() => {
        return Array.from(new Map(burnerMerchantReceipts.map((receipt) => [receipt.receiptHash, receipt])).values())
            .filter((receipt) => receipt.invoiceHash !== profileMainHash && receipt.invoiceHash !== profileBurnerHash && !sdkHashSet.has(receipt.invoiceHash));
    }, [burnerMerchantReceipts, profileMainHash, profileBurnerHash, sdkHashSet]);

    const merchantStats = useMemo(() => {
        const totalInvoices = combinedInvoices.length;
        const settledCount = combinedInvoices.filter((invoice) => invoice.status === 'SETTLED' || invoice.status === 1).length;
        const pendingCount = combinedInvoices.filter((invoice) => invoice.status === 'PENDING' || invoice.status === 0).length;
        const totalPayments = uniqueMainReceipts.length + uniqueBurnerReceipts.length;
        const settlementRate = totalInvoices > 0 ? (settledCount / totalInvoices) * 100 : 0;
        const averagePaymentsPerInvoice = totalInvoices > 0 ? totalPayments / totalInvoices : 0;
        const mainPaymentShare = totalPayments > 0 ? (uniqueMainReceipts.length / totalPayments) * 100 : 0;
        const burnerPaymentShare = totalPayments > 0 ? (uniqueBurnerReceipts.length / totalPayments) * 100 : 0;
        const nonDonationInvoices = combinedInvoices.filter((invoice) => invoice.invoiceType !== 2 && Number(invoice.amount) > 0);
        const averageInvoiceAmountForToken = (tokenType: number) => {
            const matchingInvoices = nonDonationInvoices.filter((invoice) => invoice.tokenType === tokenType);
            if (matchingInvoices.length === 0) return '0.00';

            const totalAmount = matchingInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
            return (totalAmount / matchingInvoices.length).toFixed(2);
        };
        const mainInvoiceCount = combinedInvoices.filter((invoice) => invoice.walletType !== 1).length;
        const burnerInvoiceCount = combinedInvoices.filter((invoice) => invoice.walletType === 1).length;
        const mainInvoiceShare = totalInvoices > 0 ? (mainInvoiceCount / totalInvoices) * 100 : 0;
        const burnerInvoiceShare = totalInvoices > 0 ? (burnerInvoiceCount / totalInvoices) * 100 : 0;
        const receiptCountByInvoice = [...uniqueMainReceipts, ...uniqueBurnerReceipts].reduce((counts, receipt) => {
            counts.set(receipt.invoiceHash, (counts.get(receipt.invoiceHash) || 0) + 1);
            return counts;
        }, new Map<string, number>());
        const multipayInvoices = combinedInvoices.filter((invoice) => invoice.invoiceType === 1);
        const engagedMultipayInvoices = multipayInvoices.filter((invoice) => (receiptCountByInvoice.get(invoice.invoiceHash) || 0) > 1).length;
        const multipayParticipationRate = multipayInvoices.length > 0 ? (engagedMultipayInvoices / multipayInvoices.length) * 100 : 0;

        return {
            mainCredits: uniqueMainReceipts
                .filter((receipt) => receipt.tokenType !== 1 && receipt.tokenType !== 2)
                .reduce((acc, curr) => acc + (Number(curr.amount) / 1_000_000 || 0), 0)
                .toFixed(2),
            mainUSDCx: uniqueMainReceipts
                .filter((receipt) => receipt.tokenType === 1)
                .reduce((acc, curr) => acc + (Number(curr.amount) / 1_000_000 || 0), 0)
                .toFixed(2),
            mainUSAD: uniqueMainReceipts
                .filter((receipt) => receipt.tokenType === 2)
                .reduce((acc, curr) => acc + (Number(curr.amount) / 1_000_000 || 0), 0)
                .toFixed(2),
            burnerCredits: uniqueBurnerReceipts
                .filter((receipt) => receipt.tokenType !== 1 && receipt.tokenType !== 2)
                .reduce((acc, curr) => acc + (Number(curr.amount) / 1_000_000 || 0), 0)
                .toFixed(2),
            burnerUSDCx: uniqueBurnerReceipts
                .filter((receipt) => receipt.tokenType === 1)
                .reduce((acc, curr) => acc + (Number(curr.amount) / 1_000_000 || 0), 0)
                .toFixed(2),
            burnerUSAD: uniqueBurnerReceipts
                .filter((receipt) => receipt.tokenType === 2)
                .reduce((acc, curr) => acc + (Number(curr.amount) / 1_000_000 || 0), 0)
                .toFixed(2),
            invoices: totalInvoices,
            settled: settledCount,
            pending: pendingCount,
            totalPayments,
            settlementRate: settlementRate.toFixed(1),
            averagePaymentsPerInvoice: averagePaymentsPerInvoice.toFixed(2),
            mainPaymentShare: mainPaymentShare.toFixed(1),
            burnerPaymentShare: burnerPaymentShare.toFixed(1),
            averageInvoiceAmountCredits: averageInvoiceAmountForToken(0),
            averageInvoiceAmountUSDCx: averageInvoiceAmountForToken(1),
            averageInvoiceAmountUSAD: averageInvoiceAmountForToken(2),
            mainInvoiceShare: mainInvoiceShare.toFixed(1),
            burnerInvoiceShare: burnerInvoiceShare.toFixed(1),
            multipayParticipationRate: multipayParticipationRate.toFixed(1),
            multipayInvoiceCount: multipayInvoices.length,
            engagedMultipayInvoices
        };
    }, [combinedInvoices, uniqueBurnerReceipts, uniqueMainReceipts]);

    const handleDownloadCreditReport = async (options: ReportOptions) => {
        if (!publicKey) return;
        setCreditReportLoading(true);
        try {
            downloadMerchantCreditReportHtml({
                merchantAddress: publicKey,
                burnerAddress: decryptedBurnerAddress || null,
                balances,
                merchantStats,
                invoices: loadingBurner ? [] : combinedInvoices,
                merchantReceipts: uniqueMainReceipts,
                burnerMerchantReceipts: uniqueBurnerReceipts,
                payerReceipts
            }, options);
            import('react-hot-toast').then(t => t.default.success('Credit report HTML downloaded.'));
        } catch (error: any) {
            console.error('Failed to generate credit report HTML', error);
            import('react-hot-toast').then(t => t.default.error(error?.message || 'Failed to generate credit report HTML'));
        } finally {
            setCreditReportLoading(false);
        }
    };

    const handleDownloadAuditReport = async (options: ReportOptions): Promise<GeneratedAuditAssets | void> => {
        if (!publicKey) return;
        setAuditReportLoading(true);
        try {
            const auditInput = {
                merchantAddress: publicKey,
                burnerAddress: decryptedBurnerAddress || null,
                balances,
                merchantStats,
                invoices: loadingBurner ? [] : combinedInvoices,
                merchantReceipts: uniqueMainReceipts,
                burnerMerchantReceipts: uniqueBurnerReceipts,
                payerReceipts,
                programId: PROGRAM_ID
            };
            const htmlAsset = buildMerchantAuditReportHtmlAsset(auditInput, options);
            const auditBundle = await generateMerchantAuditPackage(auditInput, options, async (message) => {
                if (!wallet?.adapter?.signMessage) return null;
                const signatureResult = await wallet.adapter.signMessage(new TextEncoder().encode(message));
                const signatureValue = signatureResult instanceof Uint8Array
                    ? signatureResult
                    : (signatureResult as any)?.signature;
                if (!signatureValue) return null;

                if (typeof signatureValue === 'string') {
                    return { signature: signatureValue, signatureBase64: null };
                }

                let binary = '';
                signatureValue.forEach((byte: number) => {
                    binary += String.fromCharCode(byte);
                });
                return {
                    signature: null,
                    signatureBase64: window.btoa(binary)
                };
            });
            import('react-hot-toast').then(t => t.default.success('Audit report bundle unlocked. Download the HTML, JSON, and audit key from the popup.'));
            return {
                html: htmlAsset.html,
                htmlFilename: htmlAsset.filename,
                packageJson: auditBundle.packageJson,
                packageFilename: auditBundle.packageFilename,
                auditKey: auditBundle.auditKey,
                auditKeyFilename: auditBundle.auditKeyFilename
            };
        } catch (error: any) {
            console.error('Failed to generate audit report HTML', error);
            import('react-hot-toast').then(t => t.default.error(error?.message || 'Failed to generate audit report bundle'));
        } finally {
            setAuditReportLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    const openExplorer = (txId?: string) => {
        if (txId) {
            window.open(`https://testnet.explorer.provable.com/transaction/${txId}`, '_blank');
        }
    };

    const handleSettle = async (invoice: any) => {
        if (!invoice || !invoice.salt || !executeTransaction) return;
        setSettling(invoice.invoiceHash);
        try {
            // For Donation (Type 2), amount is 0. For others, use invoice amount (Major -> Micro).
            const isDonation = invoice.invoiceType === 2;
            const amountMicro = isDonation ? 0 : Math.round(invoice.amount * 1_000_000);

            const transaction = {
                program: PROGRAM_ID,
                function: "settle_invoice",
                inputs: [
                    invoice.salt,
                    `${amountMicro}u64`
                ],
                fee: await estimateExecutionFee({
                    programName: PROGRAM_ID,
                    functionName: 'settle_invoice',
                    inputs: [
                        invoice.salt,
                        `${amountMicro}u64`
                    ],
                    fallbackMicrocredits: 100_000
                }),
                privateFee: false
            };

            const result = await executeWithShieldRetry(
                () => executeTransaction(transaction),
                { onRetry: () => toast.loading('Shield Wallet gave no response. Retrying settlement...', { id: 'shield-settle-retry' }) }
            );

            if (result && result.transactionId) {
                toast.dismiss('shield-settle-retry');
                // Optimistically update DB status
                try {
                    const { updateInvoiceStatus } = await import('../../services/api');
                    await updateInvoiceStatus(invoice.invoiceHash, {
                        status: 'SETTLED'
                    });
                } catch (e) { console.warn("DB update failed but tx sent", e); }

                // Refresh list
                setTimeout(() => {
                    fetchCreatedInvoices();
                    fetchTransactions();
                }, 2000);
            }
        } catch (e: any) {
            toast.dismiss('shield-settle-retry');
            if (handleWalletError(e)) return;
            console.error("Settlement failed", e);
            toast.error("Failed to settle invoice: " + (e.message || "Unknown error"));
        } finally {
            setSettling(null);
        }
    };

    return (
        <div className="page-container relative min-h-screen">
            {/* BACKGROUND */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/5 rounded-full blur-[120px] animate-float" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-amber-400/10 rounded-full blur-[100px] animate-float-delayed" />
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] bg-orange-500/5 rounded-full blur-[120px] animate-pulse-slow" />
            </div>
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


            {/* VERIFY MODAL */}
            <VerifyModal
                isOpen={showVerifyModal}
                onClose={() => setShowVerifyModal(false)}
                verifyingInvoice={verifyingInvoice}
                verifyInput={verifyInput}
                setVerifyInput={setVerifyInput}
                verifyStatus={verifyStatus}
                verifiedRecord={verifiedRecord}
                merchantReceipts={[...merchantReceipts, ...burnerMerchantReceipts]}
                onVerify={handleVerifyReceipt}
            />

            {/* TRANSACTION HISTORY MODAL (Legacy) */}
            <PaymentHistoryModal
                paymentIds={selectedPaymentIds}
                onClose={() => setSelectedPaymentIds(null)}
                onViewTx={openExplorer}
            />

            {/* RECEIPT HASHES MODAL */}
            <ReceiptHashesModal
                receipts={selectedReceipts}
                onClose={() => setSelectedReceipts(null)}
            />

            <PayerNotesModal
                notes={selectedNotes}
                onClose={() => setSelectedNotes(null)}
            />

            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="w-full max-w-7xl mx-auto pt-10 relative z-10 pb-20"
            >
                {/* HEADER */}
                <motion.div variants={itemVariants} className="flex flex-col items-center justify-center text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter leading-tight text-white">
                        Merchant <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">Dashboard</span>
                    </h1>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-xs mb-6">
                        Manage your invoices and settlements.
                    </p>

                    {/* NEW: WALLET BALANCES */}
                    <WalletBalances itemVariants={itemVariants} balances={balances} />
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <button
                            onClick={() => {
                                setCurrentReportType('credit');
                                setShowReportConfigModal(true);
                            }}
                            disabled={creditReportLoading || (!loadingBurner && combinedInvoices.length === 0 && uniqueMainReceipts.length === 0 && uniqueBurnerReceipts.length === 0)}
                            className="inline-flex items-center gap-2 rounded-xl border border-orange-400/30 bg-orange-500/10 px-4 py-2.5 text-sm font-semibold text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6m3 6V7m3 10v-3m2 5H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414A1 1 0 0118 10.414V17a2 2 0 01-2 2z" />
                            </svg>
                            {creditReportLoading ? 'Preparing Credit Report...' : 'Download Credit Report'}
                        </button>

                        <button
                            onClick={() => {
                                setCurrentReportType('audit');
                                setShowReportConfigModal(true);
                            }}
                            disabled={auditReportLoading || (!loadingBurner && combinedInvoices.length === 0 && uniqueMainReceipts.length === 0 && uniqueBurnerReceipts.length === 0 && payerReceipts.length === 0)}
                            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l5 5v11a2 2 0 01-2 2z" />
                            </svg>
                            {auditReportLoading ? 'Preparing Audit Report...' : 'Download Audit Report'}
                        </button>
                    </div>
                    <div className="mt-4 text-center">
                        <Link
                            to="/audit/verify"
                            className="inline-flex items-center gap-2 text-sm font-medium text-cyan-200 transition hover:text-white"
                        >
                            Open Auditor Verification Page
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </Link>
                        <p className="mt-2 text-xs text-gray-500">
                            Auditors should verify the encrypted JSON package and audit key here before trusting the HTML report.
                        </p>
                        {hasInvalidValueFilter ? (
                            <p className="mt-2 text-center text-xs text-red-400">
                                Enter a valid positive number for the value filter.
                            </p>
                        ) : valueFilterType !== 'none' ? (
                            <p className="mt-2 text-center text-xs text-gray-500">
                                Showing {activeTab === 'created' && valueFilterType === 'earnings' ? 'invoices with total earnings' : activeTab === 'paid' ? 'paid invoices with total paid amount' : 'invoices with amount'} at or above the value you enter.
                            </p>
                        ) : null}
                    </div>
                </motion.div>

                {/* BACKUP BANNER */}
                <BackupBanner />

                {/* BURNER WALLET SETTINGS - FULL WIDTH - MOVED ABOVE TABS */}
                <div className="mb-8">
                    <BurnerWalletSettings itemVariants={itemVariants} transactions={transactions} />
                </div>

                {/* MAIN VIEW TABS - HYPER PREMIUM SPATIAL DESIGN */}
                <motion.div variants={itemVariants} className="flex justify-center mb-12">
                    <div className="flex p-1.5 bg-[#0A0A0A]/60 backdrop-blur-3xl rounded-[22px] border border-white/5 relative shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] group">
                        {[
                            {
                                id: 'statistics',
                                label: 'Statistics',
                                icon: (isActive: boolean) => (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <motion.path
                                            initial={false}
                                            animate={{ d: isActive ? "M9 19V9m4 10V5m4 14V11m-12 8v-6" : "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" }}
                                            strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                        />
                                    </svg>
                                )
                            },
                            {
                                id: 'dashboard',
                                label: 'Dashboard',
                                icon: (isActive: boolean) => (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <motion.path
                                            initial={false}
                                            animate={{ strokeWidth: isActive ? 2 : 1.5 }}
                                            strokeLinecap="round" strokeLinejoin="round"
                                            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                                        />
                                    </svg>
                                )
                            }
                        ].map((tab) => {
                            const isActive = mainViewTab === tab.id;
                            return (
                                <motion.button
                                    key={tab.id}
                                    onClick={() => {
                                        setMainViewTab(tab.id as any);
                                        navigate(`/profile/${tab.id}`);
                                    }}
                                    whileTap={{ scale: 0.97 }}
                                    className={`relative z-10 flex items-center gap-3 px-10 py-3 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${isActive
                                        ? 'text-white'
                                        : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                >
                                    <span className={`transition-all duration-500 ${isActive ? 'text-neon-primary drop-shadow-[0_0_8px_rgba(0,255,209,0.5)]' : 'opacity-50'}`}>
                                        {tab.icon(isActive)}
                                    </span>
                                    <span className="relative">
                                        {tab.label}
                                    </span>

                                    {isActive && (
                                        <motion.div
                                            layoutId="mainViewTabAlt"
                                            className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-[18px] -z-10 border border-white/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]"
                                            transition={{
                                                type: "spring",
                                                stiffness: 300,
                                                damping: 30,
                                                mass: 1
                                            }}
                                        />
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>

                <AnimatePresence mode="wait">
                    {mainViewTab === 'statistics' ? (
                        <motion.div
                            key="stats-view"
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={containerVariants}
                            className="space-y-4"
                        >
                            {/* TOP ROW: Stats & Charts */}
                            <div className="grid grid-cols-1 gap-4 mb-4">
                                {/* STATS - FULL WIDTH */}
                                <motion.div variants={itemVariants}>
                                    <StatsCards
                                        merchantStats={merchantStats}
                                        loadingReceipts={loadingReceipts}
                                        loadingCreated={loadingCreated}
                                        loadingBurner={loadingBurner}
                                        itemVariants={itemVariants}
                                    />
                                </motion.div>

                                {/* CHARTS - SIDE BY SIDE */}
                                <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InvoiceDistributionChart invoices={loadingBurner ? [] : combinedInvoices} isLoading={loadingCreated || loadingBurner} />
                                    <TokenDistributionChart receipts={[...merchantReceipts, ...burnerMerchantReceipts]} isLoading={loadingReceipts || loadingBurner} />
                                </motion.div>
                            </div>

                            {/* PAYMENT TIMELINE CHART - FULL WIDTH */}
                            <motion.div variants={itemVariants}>
                                <PaymentTimelineChart
                                    receipts={[...merchantReceipts, ...burnerMerchantReceipts]}
                                    paymentTimestampsByTxId={paymentTimestampsByTxId}
                                    isLoading={loadingReceipts || loadingBurner}
                                />
                            </motion.div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="dashboard-view"
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={containerVariants}
                        >
                            {/* INVOICE HISTORY */}
                            <GlassCard className="p-0 overflow-hidden">
                                <div className="p-6 border-b border-white/5 flex flex-col items-center justify-center gap-4">
                                    <div className="flex p-1 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 relative">
                                        {['created', 'paid'].map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab as any)}
                                                className={`relative z-10 px-6 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === tab ? 'text-black' : 'text-gray-400 hover:text-white'
                                                    }`}
                                            >
                                                {activeTab === tab && (
                                                    <motion.div
                                                        layoutId="activeTab"
                                                        className="absolute inset-0 bg-white rounded-full -z-10"
                                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                    />
                                                )}
                                                {tab === 'created' ? 'My Invoices' : 'Paid Invoices'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* SEARCH */}
                                <div className="px-6 pb-4">
                                    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
                                        <div className="relative">
                                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <input
                                                type="text"
                                                placeholder={searchPlaceholder}
                                                value={invoiceSearch}
                                                onChange={(e) => setInvoiceSearch(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-10 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-primary/50 focus:ring-1 focus:ring-neon-primary/30 transition-colors"
                                            />
                                            {invoiceSearch && (
                                                <button
                                                    onClick={() => setInvoiceSearch('')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative" ref={filterDropdownRef}>
                                            <button
                                                type="button"
                                                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                                                className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-[9px] text-sm text-white focus:outline-none focus:border-neon-primary/50 focus:ring-1 focus:ring-neon-primary/30 transition-all hover:bg-white/10 group"
                                            >
                                                <span className={valueFilterType === 'none' ? 'text-gray-400' : 'text-white'}>
                                                    {valueFilterType === 'none' ? 'No value filter' :
                                                        valueFilterType === 'amount' ? 'By Amount' : 'By Earnings'}
                                                </span>
                                                <svg className={`w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-all duration-300 ${isFilterDropdownOpen ? 'rotate-180 translate-y-[-1px]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            <AnimatePresence>
                                                {isFilterDropdownOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                                        className="absolute top-full left-0 right-0 mt-2 z-[20] bg-[#0F0F0F]/95 backdrop-blur-2xl border border-white/[0.08] rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] py-1.5"
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => { setValueFilterType('none'); setIsFilterDropdownOpen(false); }}
                                                            className={`w-full text-left px-4 py-2.5 text-sm transition-all flex items-center justify-between ${valueFilterType === 'none' ? 'text-neon-primary bg-white/[0.03]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                                        >
                                                            <span>No value filter</span>
                                                            {valueFilterType === 'none' && <div className="w-1 h-1 rounded-full bg-neon-primary shadow-[0_0_8px_rgba(5,213,250,0.8)]" />}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setValueFilterType('amount'); setIsFilterDropdownOpen(false); }}
                                                            className={`w-full text-left px-4 py-2.5 text-sm transition-all flex items-center justify-between ${valueFilterType === 'amount' ? 'text-neon-primary bg-white/[0.03]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                                        >
                                                            <span>By Amount</span>
                                                            {valueFilterType === 'amount' && <div className="w-1 h-1 rounded-full bg-neon-primary shadow-[0_0_8px_rgba(5,213,250,0.8)]" />}
                                                        </button>
                                                        {activeTab === 'created' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => { setValueFilterType('earnings'); setIsFilterDropdownOpen(false); }}
                                                                className={`w-full text-left px-4 py-2.5 text-sm transition-all flex items-center justify-between ${valueFilterType === 'earnings' ? 'text-neon-primary bg-white/[0.03]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                                            >
                                                                <span>By Earnings</span>
                                                                {valueFilterType === 'earnings' && <div className="w-1 h-1 rounded-full bg-neon-primary shadow-[0_0_8px_rgba(5,213,250,0.8)]" />}
                                                            </button>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder={valueFilterType === 'none' ? 'Optional min value' : `Enter min ${valueFilterType}...`}
                                            value={valueFilterInput}
                                            onChange={(e) => setValueFilterInput(e.target.value)}
                                            disabled={valueFilterType === 'none'}
                                            className={`w-full bg-white/5 border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${hasInvalidValueFilter ? 'border-red-500/40 focus:border-red-500/60 focus:ring-red-500/10' : 'border-white/10 focus:border-neon-primary/40 focus:ring-neon-primary/20 hover:border-white/20'}`}
                                        />
                                    </div>
                                    <div className="mx-auto mt-3 flex flex-col md:flex-row items-center gap-3 max-w-4xl justify-center md:justify-start">
                                        {activeTab === 'created' && (
                                            <div className="flex rounded-xl border border-white/5 bg-[#0F0F0F]/60 backdrop-blur p-1 shadow-inner w-full md:w-auto">
                                                {[
                                                    { key: 'all', label: 'All Dates' },
                                                    { key: 'single', label: 'Single Day' },
                                                    { key: 'range', label: 'Date Range' }
                                                ].map((option) => (
                                                    <button
                                                        key={option.key}
                                                        type="button"
                                                        onClick={() => setDateFilterMode(option.key as 'all' | 'single' | 'range')}
                                                        className={`flex-1 md:flex-none rounded-lg px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-300 ${dateFilterMode === option.key ? 'bg-white text-black shadow-md shadow-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <AnimatePresence mode="popLayout">
                                            {activeTab === 'created' && dateFilterMode !== 'all' && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -10, scale: 0.95 }}
                                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                                    exit={{ opacity: 0, x: -10, scale: 0.95 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="flex w-full md:w-auto items-center gap-2 bg-[#0F0F0F]/40 backdrop-blur border border-white/10 rounded-xl p-1 shadow-inner"
                                                >
                                                    <div className="relative">
                                                        <input
                                                            type="date"
                                                            value={dateFilterMode === 'single' ? singleDateFilter : rangeStartDateFilter}
                                                            onChange={(e) => {
                                                                if (dateFilterMode === 'single') {
                                                                    setSingleDateFilter(e.target.value);
                                                                    return;
                                                                }
                                                                setRangeStartDateFilter(e.target.value);
                                                            }}
                                                            className="w-full md:w-[140px] bg-transparent border-none text-sm text-white focus:outline-none focus:ring-1 focus:ring-neon-primary/30 rounded-lg px-3 py-1.5 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 transition-all font-medium placeholder-gray-500"
                                                        />
                                                    </div>

                                                    {dateFilterMode === 'range' && (
                                                        <>
                                                            <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                            </svg>
                                                            <div className="relative">
                                                                <input
                                                                    type="date"
                                                                    value={rangeEndDateFilter}
                                                                    onChange={(e) => setRangeEndDateFilter(e.target.value)}
                                                                    className="w-full md:w-[140px] bg-transparent border-none text-sm text-white focus:outline-none focus:ring-1 focus:ring-neon-primary/30 rounded-lg px-3 py-1.5 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 transition-all font-medium placeholder-gray-500"
                                                                />
                                                            </div>
                                                        </>
                                                    )}

                                                    <div className="h-4 w-px bg-white/10 mx-1 border-r border-white/5"></div>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setDateFilterMode('all');
                                                            setSingleDateFilter('');
                                                            setRangeStartDateFilter('');
                                                            setRangeEndDateFilter('');
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                                                        title="Clear Dates"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    {hasInvalidValueFilter ? (
                                        <p className="mt-2 text-center text-[11px] font-medium text-red-400/90 tracking-wide uppercase">
                                            Please enter a valid positive amount
                                        </p>
                                    ) : valueFilterType !== 'none' ? (
                                        <p className="mt-2 text-center text-[11px] font-medium text-gray-500 tracking-wide uppercase">
                                            Filtering {activeTab === 'created' && valueFilterType === 'earnings' ? 'earnings' : activeTab === 'paid' ? 'total paid' : 'invoice amount'} ≥ {valueFilterInput || '0'}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="overflow-x-auto min-h-[300px]">
                                    {/* CREATED TAB */}
                                    <div style={{ display: activeTab === 'created' ? 'block' : 'none' }}>
                                        <InvoiceTable
                                            invoices={loadingBurner ? [] : combinedInvoices}
                                            loading={loadingCreated || loadingTransactions || loadingBurner}
                                            search={invoiceSearch}
                                            valueFilterType={valueFilterType}
                                            valueFilterAmount={appliedValueFilterAmount}
                                            dateFilterMode={dateFilterMode}
                                            singleDateFilter={singleDateFilter}
                                            rangeStartDateFilter={rangeStartDateFilter}
                                            rangeEndDateFilter={rangeEndDateFilter}
                                            currentPage={currentPage}
                                            itemsPerPage={itemsPerPage}
                                            setCurrentPage={setCurrentPage}
                                            onVerify={(inv) => {
                                                setVerifyingInvoice(inv);
                                                setVerifyInput('');
                                                setVerifyStatus('IDLE');
                                                setVerifiedRecord(null);
                                                setShowVerifyModal(true);
                                            }}
                                            onSettle={handleSettle}
                                            settlingId={settling}
                                            onViewPayments={(ids) => setSelectedPaymentIds(ids)}
                                            transactions={transactions}
                                        />
                                    </div>

                                    {/* PAID TAB */}
                                    <div style={{ display: activeTab === 'paid' ? 'block' : 'none' }}>
                                        <PaidInvoicesTable
                                            receipts={payerReceipts}
                                            loading={loadingPayerReceipts}
                                            search={invoiceSearch}
                                            valueFilterAmount={valueFilterType === 'none' ? null : appliedValueFilterAmount}
                                            dateFilterMode="all"
                                            singleDateFilter=""
                                            rangeStartDateFilter=""
                                            rangeEndDateFilter=""
                                            onViewReceipts={(receipts) => setSelectedReceipts(receipts)}
                                            onViewNotes={(notes) => setSelectedNotes(notes)}
                                        />
                                    </div>
                                </div>
                                {/* PRIVACY FOOTER */}
                                <div className="p-4 bg-white/5 border-t border-white/5 text-center text-xs text-gray-500 italic">
                                    All this information is fetched from your private account records.
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <DashboardChatbot
                mainWalletAddress={publicKey || null}
                burnerWalletAddress={decryptedBurnerAddress || null}
                balances={balances}
                merchantStats={merchantStats}
                invoices={loadingBurner ? [] : combinedInvoices}
                mainMerchantReceipts={uniqueMainReceipts}
                burnerMerchantReceipts={uniqueBurnerReceipts}
                payerReceipts={payerReceipts}
                loadingInvoices={loadingCreated || loadingTransactions || loadingBurner}
                loadingReceipts={loadingReceipts || loadingBurner}
                loadingPayerReceipts={loadingPayerReceipts}
            />

            <ReportConfigModal
                isOpen={showReportConfigModal}
                onClose={() => setShowReportConfigModal(false)}
                reportType={currentReportType}
                onDownload={(options) => {
                    if (currentReportType === 'audit') {
                        return handleDownloadAuditReport(options);
                    } else {
                        return handleDownloadCreditReport(options);
                    }
                }}
            />
        </div>
    );
};

export default Profile;
