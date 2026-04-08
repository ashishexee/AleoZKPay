import { useSharedPayment } from './useSharedPayment';
import { createCreditsPayment } from './useCreditsPayment';
import { createUSDCxPayment } from './useUSDCxPayment';
import { createUSADPayment } from './useUSADPayment';
import { getAllowedTokensForInvoice, getTokenTypeFromCode } from '../../utils/tokens';

export type { PaymentStep } from './types';

export const usePayment = () => {
    const shared = useSharedPayment();

    const deps = {
        invoice: shared.invoice,
        publicKey: shared.publicKey,
        executeTransaction: shared.executeTransaction,
        requestRecords: shared.requestRecords,
        decrypt: shared.decrypt,
        programId: shared.programId,
        donationAmount: shared.donationAmount,
        paymentSecret: shared.paymentSecret,
        setLoading: shared.setLoading,
        setStatus: shared.setStatus,
        setError: shared.setError,
        setStep: shared.setStep,
        setTxId: shared.setTxId,
        pollTransaction: shared.pollTransaction,
    };

    const { payInvoiceCredits } = createCreditsPayment(deps);
    const { payInvoiceUSDCx } = createUSDCxPayment(deps);
    const { payInvoiceUSAD } = createUSADPayment(deps);

    const payInvoice = async (selectedTokenOverride?: number, notes?: import('./types').PaymentNoteInput) => {
        if (!shared.invoice) return;
        const activeTokenType = selectedTokenOverride !== undefined
            ? selectedTokenOverride
            : shared.invoice.tokenType === 3
                ? getTokenTypeFromCode(
                    getAllowedTokensForInvoice(shared.invoice.tokenType, shared.invoice.invoiceType)[0]
                )
                : shared.invoice.tokenType;
        if (activeTokenType === 1) {
            await payInvoiceUSDCx(notes);
        } else if (activeTokenType === 2) {
            await payInvoiceUSAD(notes);
        } else {
            await payInvoiceCredits(notes);
        }
    };

    return {
        step: shared.step,
        status: shared.status,
        loading: shared.loading,
        error: shared.error,
        invoice: shared.invoice,
        txId: shared.txId,
        conversionTxId: shared.conversionTxId,
        publicKey: shared.publicKey,
        payInvoice,
        payWithCard: shared.payWithCard,
        payWithGiftCard: shared.payWithGiftCard,
        convertPublicToPrivate: shared.convertPublicToPrivate,
        handleConnect: shared.handleConnect,
        programId: shared.programId,
        paymentSecret: shared.paymentSecret,
        receiptHash: shared.receiptHash,
        receiptSearchFailed: shared.receiptSearchFailed,
        donationAmount: shared.donationAmount,
        setDonationAmount: shared.setDonationAmount,
        giftCardRedeemOption: shared.giftCardRedeemOption,
        redeemGiftCardBalance: shared.redeemGiftCardBalance,
        statusLog: shared.statusLog,
        clearStatusLog: shared.clearStatusLog,
        resetPaymentFeedback: shared.resetPaymentFeedback,
    };
};
