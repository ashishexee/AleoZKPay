import { useState } from 'react';
import toast from 'react-hot-toast';
import { useBurnerWallet } from '../../../hooks/BurnerWalletProvider';
import { useWalletErrorHandler } from '../../../hooks/Wallet/WalletErrorBoundary';
import { useLeaveGuard } from '../../../hooks/LeaveGuardProvider';
import { PROGRAM_ID, parseInvoice, estimateExecutionFee } from '../../../utils/aleo-utils';
import { hashAddress } from '../../../utils/crypto';
import { sponsorBurnerInvoiceDeletion } from '../../../utils/invoiceDeletion';
import { executeWithShieldRetry } from '../../../utils/shieldRetry';
import { WALLET_PROGRAM_ID } from '../../../utils/aleo-utils';

interface UseProfileInvoicesActionsProps {
    fetchCreatedInvoices: () => Promise<void>;
    fetchTransactions: () => Promise<void>;
    fetchMerchantReceipts: () => Promise<void>;
    fetchPayerReceipts: () => Promise<void>;
    requestRecords: any;
    decrypt?: (cipher: string) => Promise<string>;
    executeTransaction?: (txn: any) => Promise<any>;
    transactionStatus?: (txId: string) => Promise<any>;
}

export function useProfileInvoicesActions({
    fetchCreatedInvoices,
    fetchTransactions,
    fetchMerchantReceipts,
    fetchPayerReceipts,
    requestRecords,
    decrypt,
    executeTransaction,
    transactionStatus
}: UseProfileInvoicesActionsProps) {
    const { handleWalletError } = useWalletErrorHandler();
    const { decryptedBurnerKey } = useBurnerWallet();
    const { setGuard, clearGuard } = useLeaveGuard();

    const [invoicePendingDeletion, setInvoicePendingDeletion] = useState<any>(null);
    const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
    const [settling, setSettling] = useState<string | null>(null);

    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verifyingInvoice, setVerifyingInvoice] = useState<any>(null);
    const [verifyInput, setVerifyInput] = useState('');
    const [verifyStatus, setVerifyStatus] = useState<'IDLE' | 'CHECKING' | 'FOUND' | 'NOT_FOUND' | 'ERROR' | 'MISMATCH'>('IDLE');
    const [verifiedRecord, setVerifiedRecord] = useState<any>(null);

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const waitForWalletTransaction = async (txId: string): Promise<string> => {
        if (!transactionStatus) return txId;
        let finalTransactionId = txId;
        let attempts = 0;
        while (attempts < 120) {
            attempts += 1;
            await wait(1000);
            try {
                const statusResponse: any = await transactionStatus(txId);
                const currentStatus = typeof statusResponse === 'string'
                    ? statusResponse.toLowerCase()
                    : String(statusResponse?.status || '').toLowerCase();
                
                if (statusResponse?.transactionId) {
                    finalTransactionId = statusResponse.transactionId;
                }
                
                if (!currentStatus || currentStatus === 'pending' || currentStatus === 'processing' || currentStatus === 'submitted') {
                    continue;
                }
                if (currentStatus === 'completed' || currentStatus === 'finalized' || currentStatus === 'accepted') {
                    return finalTransactionId;
                }
                throw new Error(`Transaction failed with status: ${currentStatus}`);
            } catch (error: any) {
                if (error?.message?.includes('failed with status')) throw error;
            }
        }
        throw new Error('Timed out waiting for on-chain confirmation.');
    };

    const waitForSponsoredTransaction = async (txId: string): Promise<void> => {
        let attempts = 0;
        while (attempts < 120) {
            attempts += 1;
            await wait(1000);
            try {
                const response = await fetch(`https://api.explorer.provable.com/v1/testnet/transaction/${txId}`);
                if (response.ok) return;
            } catch {
                // Keep polling
            }
        }
        throw new Error('Timed out waiting for sponsored transaction.');
    };

    const findOwnedMainInvoiceRecord = async (invoice: any): Promise<string | null> => {
        if (!requestRecords) return null;
        const records = await requestRecords(PROGRAM_ID, true);
        const normalizedInvoiceHash = String(invoice?.invoiceHash || '').trim();
        for (const record of (records as any[]) || []) {
            if (record.spent) continue;
            let plaintext = record.plaintext;
            const cipher = record.recordCiphertext || record.ciphertext;
            if (!plaintext && cipher && decrypt) {
                try { plaintext = await decrypt(cipher); } catch { plaintext = undefined; }
            }
            const parsed = parseInvoice({ ...record, plaintext });
            if (!parsed) continue;
            if (String(parsed.invoiceHash || '').trim() === normalizedInvoiceHash) {
                return plaintext || cipher || null;
            }
        }
        return null;
    };

    const handleDeleteInvoice = async (invoice: any) => {
        if (!invoice?.invoiceHash) return;
        const earnings = invoice.earnings || {};
        const earningsTotal = Number(earnings.credits || 0) + Number(earnings.usdcx || 0) + Number(earnings.usad || 0);
        const hasRecordedPayments = (invoice.paymentTxIds?.length || 0) > 0 || earningsTotal > 0 || invoice.status === 'SETTLED';
        
        if (hasRecordedPayments) {
            toast.error('Invoices with recorded payments cannot be deleted.');
            return;
        }
        
        if (invoice.walletType === 1 && !decryptedBurnerKey) {
            toast.error('Unlock the burner wallet before deleting this burner-owned invoice.');
            return;
        }
        setInvoicePendingDeletion(invoice);
    };

    const confirmDeleteInvoice = async () => {
        const invoice = invoicePendingDeletion;
        if (!invoice?.invoiceHash) {
            setInvoicePendingDeletion(null);
            return;
        }
        setInvoicePendingDeletion(null);
        setDeletingInvoiceId(invoice.invoiceHash);
        
        try {
            const { deleteInvoice } = await import('../../../services/api');
            
            let deletionTransactionId = '';
            setGuard({
                active: true,
                title: 'Invoice Deletion Is Syncing',
                message: 'NullPay is waiting for the invoice deletion transaction to confirm and then clearing the database entry. Leaving now can interrupt the sync flow.',
                confirmLabel: 'Leave Anyway',
                cancelLabel: 'Stay'
            });

            if (invoice.walletType === 1) {
                toast.loading('Submitting burner invoice deletion...', { id: 'invoice-delete' });
                deletionTransactionId = await sponsorBurnerInvoiceDeletion({
                    decryptedBurnerKey: decryptedBurnerKey!,
                    invoiceHash: invoice.invoiceHash
                });
                toast.loading('Waiting for burner delete confirmation...', { id: 'invoice-delete' });
                await waitForSponsoredTransaction(deletionTransactionId);
            } else {
                if (!executeTransaction) throw new Error('Connect your wallet before deleting invoices.');
                
                const invoiceRecord = await findOwnedMainInvoiceRecord(invoice);
                if (!invoiceRecord) throw new Error('Could not locate an unspent on-chain invoice record for this invoice.');
                
                const inputs = [invoiceRecord];
                const estimatedFee = await estimateExecutionFee({
                    programName: PROGRAM_ID,
                    functionName: 'delete_invoice',
                    inputs,
                    fallbackMicrocredits: 200_000
                });

                toast.loading('Requesting wallet approval for invoice deletion...', { id: 'invoice-delete' });
                const result = await executeWithShieldRetry(
                    () => executeTransaction({
                        program: PROGRAM_ID,
                        function: 'delete_invoice',
                        inputs,
                        fee: estimatedFee,
                        privateFee: false
                    }),
                    { onRetry: () => toast.loading('Shield Wallet gave no response. Retrying delete...', { id: 'shield-delete-retry' }) }
                );

                toast.dismiss('shield-delete-retry');
                deletionTransactionId = result?.transactionId || '';
                if (!deletionTransactionId) throw new Error('Failed to get a transaction id for the delete operation.');
                
                toast.loading('Waiting for on-chain delete confirmation...', { id: 'invoice-delete' });
                deletionTransactionId = await waitForWalletTransaction(deletionTransactionId);
            }

            const merchantAddressHash = await hashAddress(invoice.owner);
            await deleteInvoice(invoice.invoiceHash, {
                merchant_address_hash: merchantAddressHash,
                deletion_transaction_id: deletionTransactionId
            });

            toast.success('Invoice deleted successfully.', { id: 'invoice-delete' });

            await Promise.all([
                fetchTransactions(),
                fetchCreatedInvoices(),
                fetchMerchantReceipts(),
                fetchPayerReceipts()
            ]);
        } catch (e: any) {
            toast.dismiss('shield-delete-retry');
            toast.dismiss('invoice-delete');
            if (handleWalletError(e)) return;
            console.error('Invoice deletion failed', e);
            toast.error(`Failed to delete invoice: ${e?.message || 'Unknown error'}`);
        } finally {
            clearGuard();
            setDeletingInvoiceId(null);
        }
    };

    const handleSettle = async (invoice: any) => {
        if (!invoice || !invoice.salt || !executeTransaction) return;
        setSettling(invoice.invoiceHash);
        try {
            setGuard({
                active: true,
                title: 'Settlement Is Syncing',
                message: 'NullPay is waiting for the settlement transaction and syncing invoice status. Leaving now can interrupt the flow before confirmation finishes.',
                confirmLabel: 'Leave Anyway',
                cancelLabel: 'Stay'
            });

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
                try {
                    const { updateInvoiceStatus } = await import('../../../services/api');
                    await updateInvoiceStatus(invoice.invoiceHash, {
                        status: 'SETTLED'
                    });
                } catch (e) { console.warn("DB update failed but tx sent", e); }

                setTimeout(() => {
                    fetchCreatedInvoices();
                    fetchTransactions();
                    fetchMerchantReceipts();
                    fetchPayerReceipts();
                }, 2000);
            }
        } catch (e: any) {
            toast.dismiss('shield-settle-retry');
            if (handleWalletError(e)) return;
            console.error("Settlement failed", e);
            toast.error("Failed to settle invoice: " + (e.message || "Unknown error"));
        } finally {
            clearGuard();
            setSettling(null);
        }
    };

    const handleVerifyReceipt = async () => {
        try {
            if (!verifyInput || !requestRecords || !decrypt) return;

            setVerifyStatus('CHECKING');
            setVerifiedRecord(null);

            const [coreRecords, walletRecords] = await Promise.all([
                requestRecords(PROGRAM_ID, true),
                requestRecords(WALLET_PROGRAM_ID, true)
            ]);

            let foundRecord: any = null;
            const records = [...((coreRecords as any[]) || []), ...((walletRecords as any[]) || [])];

            for (const r of records) {
                if (r.spent) continue;

                let plaintext = r.plaintext;
                const cipher = r.recordCiphertext || r.ciphertext;
                if (!plaintext && cipher) {
                    try {
                        plaintext = await decrypt(cipher);
                    } catch {
                        plaintext = undefined;
                    }
                }

                if (!plaintext || !plaintext.includes(verifyInput)) continue;

                const amountMatch = plaintext.match(/amount:\s*([\d_]+)u64/);
                const tokenTypeMatch = plaintext.match(/token_type:\s*(\d+)u8/);
                const invoiceHashMatch = plaintext.match(/invoice_hash:\s*([\d]+)field/);

                foundRecord = {
                    plaintext,
                    amount: amountMatch ? parseInt(amountMatch[1].replace(/_/g, ''), 10) / 1_000_000 : 'Unknown',
                    tokenType: tokenTypeMatch ? parseInt(tokenTypeMatch[1], 10) : 0,
                    invoiceHash: invoiceHashMatch ? invoiceHashMatch[1] : 'Unknown'
                };
                break;
            }

            if (!foundRecord) {
                setVerifyStatus('NOT_FOUND');
                return;
            }

            const recordHash = String(foundRecord.invoiceHash || '').trim();
            let invoiceHash = String(verifyingInvoice?.invoiceHash || verifyingInvoice?.invoice_hash || '').trim();
            if (invoiceHash.endsWith('field')) {
                invoiceHash = invoiceHash.slice(0, -5);
            }

            setVerifiedRecord(foundRecord);
            if (verifyingInvoice && recordHash !== invoiceHash) {
                setVerifyStatus('MISMATCH');
                return;
            }

            setVerifyStatus('FOUND');
        } catch (error) {
            console.error('Verification error:', error);
            setVerifyStatus('ERROR');
            toast.error('Failed to verify receipt.');
        }
    };

    return {
        invoicePendingDeletion,
        setInvoicePendingDeletion,
        deletingInvoiceId,
        settling,
        showVerifyModal,
        setShowVerifyModal,
        verifyingInvoice,
        setVerifyingInvoice,
        verifyInput,
        setVerifyInput,
        verifyStatus,
        setVerifyStatus,
        verifiedRecord,
        setVerifiedRecord,
        handleDeleteInvoice,
        confirmDeleteInvoice,
        handleSettle,
        handleVerifyReceipt
    };
}
