import { Shimmer } from '../../../../shared/components/ui/Shimmer';
import { Input } from '../../../../shared/components/ui/Input';
import type { TokenCode } from '../../../../shared/types/tokens';
import { getTokenLabel, getTokenTypeFromCode } from '../../../../shared/utils/payments/tokens';

interface PaymentSummaryPanelProps {
    loading: boolean;
    invoice: any;
    donationAmount: string;
    setDonationAmount: (value: string) => void;
    displayAmount: number;
    currencyLabel: string;
    hasCrossTokenSelection: boolean;
    quote?: { expected_amount?: number } | null;
    quoteTimeRemaining: number;
    baseTokenType: number;
    hasSelectableTokens: boolean;
    step: string;
    allowedTokens: TokenCode[];
    selectedToken: number;
    setSelectedToken: (value: number) => void;
}

export const PaymentSummaryPanel = ({
    loading,
    invoice,
    donationAmount,
    setDonationAmount,
    displayAmount,
    currencyLabel,
    hasCrossTokenSelection,
    quote,
    quoteTimeRemaining,
    baseTokenType,
    hasSelectableTokens,
    step,
    allowedTokens,
    selectedToken,
    setSelectedToken,
}: PaymentSummaryPanelProps) => {
    return (
        <div className="bg-black/20 rounded-[28px] p-6 lg:p-8 border border-white/5 shadow-[0_20px_70px_rgba(0,0,0,0.28)] flex flex-col space-y-6 h-full">
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-400 uppercase tracking-widest">Merchant</span>
                {loading && !invoice ? (
                    <Shimmer className="h-6 w-32 bg-white/5 rounded" />
                ) : (
                    <span className="font-mono text-white text-sm bg-white/5 px-2 py-1 rounded">
                        {invoice?.merchant ? `${invoice.merchant.slice(0, 10)}...${invoice.merchant.slice(-5)}` : 'Unknown'}
                    </span>
                )}
            </div>

            {invoice?.title && (
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-widest">Invoice Title</span>
                    {loading && !invoice ? (
                        <Shimmer className="h-5 w-48 bg-white/5 rounded" />
                    ) : (
                        <span className="max-w-[60%] text-right text-white">{invoice.title}</span>
                    )}
                </div>
            )}

            {invoice?.items && invoice.items.length > 0 && (
                <div className="pt-4 border-t border-white/5">
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-widest block mb-3">Items</span>
                    <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden">
                        <div className="grid grid-cols-[1fr_60px_80px_80px] gap-2 px-3 py-2 bg-white/5 border-b border-white/5">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Item</span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Qty</span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">Price</span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Total</span>
                        </div>
                        {invoice.items.map((item: any, idx: number) => (
                            <div key={idx} className="grid grid-cols-[1fr_60px_80px_80px] gap-2 px-3 py-2 border-b border-white/5 last:border-b-0">
                                <span className="text-sm text-white truncate">{item.name || 'Unnamed'}</span>
                                <span className="text-sm text-gray-400 text-center">{item.quantity}</span>
                                <span className="text-sm text-gray-400 text-center">{item.unitPrice}</span>
                                <span className="text-sm text-amber-300 font-mono text-right">{item.total.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-start pt-4 border-t border-white/5">
                <span className="text-sm font-medium text-gray-400 uppercase tracking-widest mt-1">Amount</span>
                {loading && !invoice ? (
                    <Shimmer className="h-8 w-24 bg-white/5 rounded" />
                ) : invoice?.amount === 0 ? (
                    <div className="w-1/2">
                        <Input
                            label=""
                            type="number"
                            placeholder="Enter donation"
                            value={donationAmount}
                            onChange={(e) => setDonationAmount(e.target.value)}
                        />
                    </div>
                ) : (
                    <div className="text-right flex flex-col items-end overflow-hidden max-w-[70%]">
                        <div className="flex items-baseline gap-3 flex-wrap justify-end">
                            <span className="text-3xl font-bold text-white tracking-tight tabular-nums">
                                {displayAmount.toLocaleString(undefined, {
                                    maximumFractionDigits: 6,
                                    minimumFractionDigits: 2,
                                })}
                            </span>
                            <span className="px-2 py-1 rounded-md bg-white/[0.04] text-xs font-semibold text-gray-400 uppercase tracking-wider border border-white/[0.06]">
                                {currencyLabel}
                            </span>
                        </div>
                        {hasCrossTokenSelection && quote && (
                            <p className="text-[10px] text-amber-300 font-medium mt-1.5 leading-tight text-right">
                                Equivalent to {invoice?.amount} {getTokenLabel(baseTokenType)}
                                {quoteTimeRemaining > 0 && (
                                    <span className="text-gray-600 ml-1">
                                        • Refreshes in {quoteTimeRemaining}s
                                    </span>
                                )}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {hasSelectableTokens && step !== 'SUCCESS' && step !== 'ALREADY_PAID' && (
                <div className="pt-4 border-t border-white/5">
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-widest block mb-2">Select Payment Token</span>
                    <div className="p-1 bg-black/20 rounded-xl flex gap-1 border border-white/5">
                        {allowedTokens.map((token) => {
                            const tokenType = getTokenTypeFromCode(token);
                            const activeClass = tokenType === 0
                                ? 'bg-white text-black shadow-lg'
                                : tokenType === 1
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                    : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20';

                            return (
                                <button
                                    key={token}
                                    onClick={() => setSelectedToken(tokenType)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${selectedToken === tokenType
                                        ? activeClass
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {getTokenLabel(tokenType)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {invoice?.memo && (
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <span className="text-sm font-medium text-gray-400 uppercase tracking-widest">Memo</span>
                    {loading && !invoice ? (
                        <Shimmer className="h-5 w-48 bg-white/5 rounded" />
                    ) : (
                        <span className="text-gray-300">{invoice?.memo || '-'}</span>
                    )}
                </div>
            )}
        </div>
    );
};
