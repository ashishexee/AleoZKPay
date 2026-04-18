import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { Button } from '../../../../shared/components/ui/Button';
import { GlassInput } from '../../../../shared/components/ui/GlassInput';
import { GiftCodeInput } from '../../../../shared/components/ui/GiftCodeInput';
import { GiftCardRedeemPrompt } from '../../../../shared/components/ui/GiftCardRedeemPrompt';
import { NullPayCardPaymentPanel } from '../../../../shared/components/payments/NullPayCardPaymentPanel';
import { PaymentActivityConsole } from '../../../../shared/components/payments/PaymentActivityConsole';

interface PaymentActionPanelProps {
    step: string;
    paymentMethod: 'wallet' | 'card' | 'giftcard';
    handleSelectPaymentMethod: (method: 'wallet' | 'card' | 'giftcard') => void;
    giftCode: string;
    setGiftCode: (value: string) => void;
    giftCardPayerAddress: string;
    setGiftCardPayerAddress: (value: string) => void;
    isProcess: boolean;
    giftCardPayerAddressInvalid: boolean;
    normalizedGiftCardPayerAddress: string;
    giftCardRedeemOption: any;
    redeemGiftCardBalance: () => void;
    address?: string | null;
    displayAmount: number;
    currencyLabel: string;
    invoice: any;
    donationAmount: string;
    payerNoteTooLong: boolean;
    shareMerchantNote: boolean;
    merchantNoteTooLong: boolean;
    handleGiftCardPay: () => void;
    paymentAmountLabel: string;
    cardNumber: string;
    cardPin: string;
    cardSecret: string;
    showCardOverlay: boolean;
    statusLog: string[];
    error: string | null;
    setCardNumber: (value: string) => void;
    setCardPin: (value: string) => void;
    setCardSecret: (value: string) => void;
    handleCardOverlayOpen: () => void;
    setShowCardOverlay: (value: boolean) => void;
    handleCardPay: () => void;
    handleConnect: () => void;
    handlePay: () => void;
    loading: boolean;
}

export const PaymentActionPanel = ({
    step,
    paymentMethod,
    handleSelectPaymentMethod,
    giftCode,
    setGiftCode,
    giftCardPayerAddress,
    setGiftCardPayerAddress,
    isProcess,
    giftCardPayerAddressInvalid,
    normalizedGiftCardPayerAddress,
    giftCardRedeemOption,
    redeemGiftCardBalance,
    address,
    displayAmount,
    currencyLabel,
    invoice,
    donationAmount,
    payerNoteTooLong,
    shareMerchantNote,
    merchantNoteTooLong,
    handleGiftCardPay,
    paymentAmountLabel,
    cardNumber,
    cardPin,
    cardSecret,
    showCardOverlay,
    statusLog,
    error,
    setCardNumber,
    setCardPin,
    setCardSecret,
    handleCardOverlayOpen,
    setShowCardOverlay,
    handleCardPay,
    handleConnect,
    handlePay,
    loading,
}: PaymentActionPanelProps) => {
    if (step === 'SUCCESS' || step === 'ALREADY_PAID') return null;

    return (
        <div className="bg-black/20 rounded-[28px] p-5 lg:p-6 border border-white/5 shadow-[0_20px_70px_rgba(0,0,0,0.28)] w-full">
            <div className="grid grid-cols-3 bg-black/40 p-1 rounded-xl mb-4 border border-white/5 gap-1">
                <button
                    onClick={() => handleSelectPaymentMethod('wallet')}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${paymentMethod === 'wallet' ? 'bg-white/10 text-white shadow-md' : 'text-gray-500 hover:text-white/80'}`}
                >
                    Wallet
                </button>
                <button
                    onClick={() => handleSelectPaymentMethod('card')}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${paymentMethod === 'card' ? 'bg-white/10 text-white shadow-md' : 'text-gray-500 hover:text-white/80'}`}
                >
                    NullPay Card
                </button>
                <button
                    onClick={() => handleSelectPaymentMethod('giftcard')}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${paymentMethod === 'giftcard' ? 'bg-white/10 text-neon-primary shadow-md' : 'text-gray-500 hover:text-white/80'}`}
                >
                    Gift Card
                </button>
            </div>

            {paymentMethod === 'giftcard' ? (
                <div className="space-y-4 animate-fade-in">
                    <GiftCodeInput
                        value={giftCode}
                        onChange={setGiftCode}
                        disabled={isProcess}
                    />
                    <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Payer Address (Optional)</label>
                        <GlassInput
                            variant="bw"
                            value={giftCardPayerAddress}
                            onChange={(e) => setGiftCardPayerAddress(e.target.value)}
                            placeholder="aleo1..."
                            disabled={isProcess}
                            error={giftCardPayerAddressInvalid}
                            icon={
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                </svg>
                            }
                            showStatus={normalizedGiftCardPayerAddress.length > 0}
                            statusElement={
                                giftCardPayerAddressInvalid ? (
                                    <>
                                        <div className="h-1 w-1 rounded-full bg-red-500/50" />
                                        <span className="text-[10px] text-red-100/50 italic">Invalid Aleo address format</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="h-1 w-1 rounded-full bg-white/50" />
                                        <span className="text-[10px] text-white/50 italic">Valid Aleo address</span>
                                    </>
                                )
                            }
                        />
                        {!giftCardPayerAddressInvalid && giftCardPayerAddress.length === 0 && (
                            <p className="px-1 text-[10px] leading-relaxed text-gray-500 italic">
                                If left blank, the receipt will be minted to the gift card address.
                            </p>
                        )}
                    </div>
                    {giftCardRedeemOption && giftCardRedeemOption.giftCode === giftCode && (
                        <GiftCardRedeemPrompt
                            availableAmount={giftCardRedeemOption.availableAmount}
                            tokenLabel={giftCardRedeemOption.tokenLabel}
                            walletConnected={Boolean(address)}
                            loading={isProcess}
                            onRedeem={redeemGiftCardBalance}
                        />
                    )}
                    <Button
                        variant="primary"
                        onClick={handleGiftCardPay}
                        disabled={isProcess || payerNoteTooLong || (shareMerchantNote && merchantNoteTooLong) || giftCardPayerAddressInvalid || !giftCode || (invoice?.amount === 0 && (!donationAmount || parseFloat(donationAmount) <= 0))}
                        className="w-full text-lg h-14"
                        glow
                    >
                        {isProcess ? (
                            <div className="flex items-center justify-center gap-3">
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                                <span className="font-bold">Authorizing...</span>
                            </div>
                        ) : (
                            `Pay ${displayAmount} ${currencyLabel}`
                        )}
                    </Button>

                    <PaymentActivityConsole
                        method="giftcard"
                        statusLog={statusLog}
                        error={error}
                    />
                </div>
            ) : paymentMethod === 'card' ? (
                <div className="space-y-4 animate-fade-in">
                    <NullPayCardPaymentPanel
                        amountLabel={paymentAmountLabel}
                        cardNumber={cardNumber}
                        cardPin={cardPin}
                        cardSecret={cardSecret}
                        isOpen={showCardOverlay}
                        isProcessing={isProcess}
                        statusLog={statusLog}
                        error={error}
                        onCardNumberChange={setCardNumber}
                        onCardPinChange={setCardPin}
                        onCardSecretChange={setCardSecret}
                        onOpenOverlay={handleCardOverlayOpen}
                        onCloseOverlay={() => setShowCardOverlay(false)}
                        onSubmit={handleCardPay}
                        submitDisabled={
                            isProcess ||
                            payerNoteTooLong ||
                            (shareMerchantNote && merchantNoteTooLong) ||
                            cardNumber.replace(/\D/g, '').length !== 16 ||
                            cardPin.length !== 6 ||
                            !cardSecret ||
                            (invoice?.amount === 0 && (!donationAmount || parseFloat(donationAmount) <= 0))
                        }
                    />

                    <PaymentActivityConsole
                        method="card"
                        statusLog={statusLog}
                        error={error}
                    />
                </div>
            ) : (
                <div className="space-y-4 animate-fade-in">
                    {step === 'CONNECT' ? (
                        <div className="flex flex-col gap-3">
                            <div className="wallet-adapter-wrapper w-full [&>button]:!w-full [&>button]:!justify-center">
                                <WalletMultiButton className="!w-full !bg-neon-primary !text-black !font-bold !rounded-xl !h-12 hover:!bg-neon-accent transition-colors" />
                            </div>
                            {address && (
                                <Button variant="secondary" onClick={handleConnect}>
                                    Continue with Connected Wallet
                                </Button>
                            )}
                        </div>
                    ) : step === 'VERIFY' ? (
                        <Button variant="primary" onClick={handleConnect} className="w-full">
                            Verify Hash & Records
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            onClick={handlePay}
                            disabled={loading || payerNoteTooLong || (shareMerchantNote && merchantNoteTooLong) || (invoice?.amount === 0 && (!donationAmount || parseFloat(donationAmount) <= 0))}
                            className="w-full"
                            glow
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-3">
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                                    <span className="font-bold">Authorizing...</span>
                                </div>
                            ) : step === 'CONVERT' ? (
                                'Convert Public to Private'
                            ) : (
                                `Pay ${displayAmount} ${currencyLabel}`
                            )}
                        </Button>
                    )}
                    <PaymentActivityConsole
                        method="wallet"
                        statusLog={statusLog}
                        error={error}
                    />
                </div>
            )}
        </div>
    );
};
