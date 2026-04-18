import { useSharedPayment } from './useSharedPayment';

export type { PaymentStep } from '../../types/payments';

export const usePayment = () => {
    const shared = useSharedPayment();

    return {
        step: shared.step,
        status: shared.status,
        loading: shared.loading,
        error: shared.error,
        invoice: shared.invoice,
        txId: shared.txId,
        conversionTxId: shared.conversionTxId,
        publicKey: shared.publicKey,
        payInvoice: shared.payInvoice,
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
        quote: shared.quote,
        quoteTimeRemaining: shared.quoteTimeRemaining,
        checkOracleQuote: shared.checkOracleQuote,
        giftCardRedeemOption: shared.giftCardRedeemOption,
        redeemGiftCardBalance: shared.redeemGiftCardBalance,
        statusLog: shared.statusLog,
        clearStatusLog: shared.clearStatusLog,
        resetPaymentFeedback: shared.resetPaymentFeedback,
    };
};
