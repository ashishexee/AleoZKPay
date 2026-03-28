import React from 'react';

interface GiftCardRedeemPromptProps {
    availableAmount: number;
    tokenLabel: string;
    walletConnected: boolean;
    loading?: boolean;
    onRedeem: () => void;
}

export const GiftCardRedeemPrompt: React.FC<GiftCardRedeemPromptProps> = ({
    availableAmount,
    tokenLabel,
    walletConnected,
    loading = false,
    onRedeem
}) => {
    return (
        <div className="rounded-2xl border border-orange-400/20 bg-orange-500/10 p-4 text-left animate-fade-in">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300 mb-2">
                Gift Card Too Small
            </p>
            <p className="text-sm text-white/85 leading-relaxed">
                This gift card does not have enough balance to pay the full invoice. You can redeem its available{' '}
                <span className="font-semibold text-white">{availableAmount.toFixed(2)} {tokenLabel}</span>{' '}
                to your connected wallet first, then pay the invoice from Wallet.
            </p>
            <p className="text-xs text-orange-200/80 mt-3">
                Redeem gas fee is covered by NullPay.
            </p>
            <button
                type="button"
                onClick={onRedeem}
                disabled={loading || !walletConnected}
                className="mt-4 w-full rounded-xl bg-orange-400 px-4 py-3 text-sm font-bold text-black transition-colors hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {loading
                    ? 'Redeeming...'
                    : walletConnected
                        ? `Redeem ${availableAmount.toFixed(2)} ${tokenLabel} First`
                        : 'Connect Wallet First'}
            </button>
        </div>
    );
};
