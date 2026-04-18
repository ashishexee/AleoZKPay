import { useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useBurnerWallet } from '../wallet/BurnerWalletProvider';
import {
    buildMerchantAuditReportHtmlAsset,
    downloadMerchantCreditReportHtml,
} from '../../utils/audit/generateMerchantReportsPdf';
import type { AuditReportInput, ReportOptions } from '../../types/receipt';
import { generateMerchantAuditPackage } from '../../utils/audit/auditPackage';
import type { WalletTokenBalance } from '../wallet/useWalletBalances';
import type { GeneratedAuditAssets } from '../../pages/Profile/components/modals/ReportConfigModal';

type MerchantStatsSnapshot = {
    mainCredits: string;
    mainUSDCx: string;
    mainUSAD: string;
    burnerCredits: string;
    burnerUSDCx: string;
    burnerUSAD: string;
    invoices: number;
    settled: number;
    pending: number;
};

interface UseProfileReportsProps {
    combinedInvoices: any[];
    uniqueMainReceipts: any[];
    uniqueBurnerReceipts: any[];
    mainDashboardPayerReceipts: any[];
    balances: WalletTokenBalance[];
    merchantStats: MerchantStatsSnapshot;
    publicKey?: string | null;
    loadingBurner: boolean;
    programId: string;
}

export function useProfileReports({
    combinedInvoices,
    uniqueMainReceipts,
    uniqueBurnerReceipts,
    mainDashboardPayerReceipts,
    balances,
    merchantStats,
    publicKey,
    loadingBurner,
    programId,
}: UseProfileReportsProps) {
    const { wallet } = useWallet();
    const { decryptedBurnerAddress } = useBurnerWallet();

    const [showReportConfigModal, setShowReportConfigModal] = useState(false);
    const [currentReportType, setCurrentReportType] = useState<'credit' | 'audit'>('audit');
    const [creditReportLoading, setCreditReportLoading] = useState(false);
    const [auditReportLoading, setAuditReportLoading] = useState(false);

    const auditInput: AuditReportInput = {
        merchantAddress: publicKey || '',
        burnerAddress: decryptedBurnerAddress || null,
        balances,
        merchantStats,
        invoices: loadingBurner ? [] : combinedInvoices,
        merchantReceipts: uniqueMainReceipts,
        burnerMerchantReceipts: uniqueBurnerReceipts,
        payerReceipts: mainDashboardPayerReceipts,
        programId,
    };

    const handleDownloadCreditReport = async (options: ReportOptions): Promise<void> => {
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
                payerReceipts: mainDashboardPayerReceipts
            }, options);
            const toast = (await import('react-hot-toast')).default;
            toast.success('Credit report HTML downloaded.');
        } catch (error: any) {
            console.error('Failed to generate credit report HTML', error);
            const toast = (await import('react-hot-toast')).default;
            toast.error(error?.message || 'Failed to generate credit report HTML');
        } finally {
            setCreditReportLoading(false);
        }
    };

    const handleDownloadAuditReport = async (options: ReportOptions): Promise<GeneratedAuditAssets | void> => {
        if (!publicKey) return;
        setAuditReportLoading(true);
        try {
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

            const toast = (await import('react-hot-toast')).default;
            toast.success('Audit report bundle unlocked. Download the HTML, JSON, and audit key from the popup.');
            return {
                html: htmlAsset.html,
                htmlFilename: htmlAsset.filename,
                packageJson: auditBundle.packageJson || '',
                packageFilename: auditBundle.packageFilename || '',
                auditKey: auditBundle.auditKey,
                auditKeyFilename: auditBundle.auditKeyFilename || ''
            };
        } catch (error: any) {
            console.error('Failed to generate audit report HTML', error);
            const toast = (await import('react-hot-toast')).default;
            toast.error(error?.message || 'Failed to generate audit report bundle');
        } finally {
            setAuditReportLoading(false);
        }
    };

    return {
        showReportConfigModal,
        setShowReportConfigModal,
        currentReportType,
        setCurrentReportType,
        creditReportLoading,
        auditReportLoading,
        handleDownloadCreditReport,
        handleDownloadAuditReport,
    };
}
