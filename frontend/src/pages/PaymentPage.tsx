import { usePayment, PaymentStep } from '../hooks/usePayment';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';

const PaymentPage = () => {
    // usePayment handles parsing and state
    const {
        step,
        status,
        loading,
        error,
        invoice,
        txId,
        conversionTxId,
        payInvoice,
        convertPublicToPrivate,
        handleConnect
    } = usePayment();

    const { address } = useWallet();

    // Aliases for compatibility with existing render logic
    const currentStatus = status;
    const isProcess = loading;

    const handlePay = async () => {
        if (step === 'CONVERT') {
            await convertPublicToPrivate();
        } else {
            await payInvoice();
        }
    };

    const renderStepIndicator = () => {
        const steps: { key: PaymentStep; label: string }[] = [
            { key: 'CONNECT', label: '1. Connect' },
            { key: 'VERIFY', label: '2. Verify' },
            { key: 'PAY', label: '3. Pay' },
        ];

        return (
            <div className="flex-between mb-6">
                {steps.map((s, index) => {
                    let isActive = false;
                    const currentIndex = steps.findIndex(x => x.key === step);

                    // Logic to highlight completed steps
                    if (s.key === step) isActive = true;
                    if (steps.findIndex(x => x.key === s.key) < currentIndex) isActive = true;
                    if (step === 'CONVERT' && s.key === 'PAY') isActive = true;
                    if (step === 'SUCCESS' && s.key === 'PAY') isActive = true;

                    return (
                        <span key={s.key} className={`text-label ${isActive ? 'text-highlight' : ''}`}>
                            {s.label}
                        </span>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="page-container flex-center" style={{ minHeight: '80vh' }}>
            <div style={{ width: '100%', maxWidth: '480px' }}>

                {/* STATUS HEADER */}
                <div className="text-center mb-8">
                    <h1 className="text-gradient" style={{ fontSize: '36px' }}>
                        {step === 'SUCCESS' ? 'Payment Successful' : 'Pay Invoice'}
                    </h1>
                </div>

                <div className="glass-card">
                    {/* INVOICE DETAILS */}
                    <div className="mb-6 pb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <div className="flex-between mb-2">
                            <span className="text-label">Merchant</span>
                            <span className="text-value" style={{ fontFamily: 'monospace' }}>
                                {invoice?.merchant ? `${invoice.merchant.slice(0, 10)}...` : 'Unknown'}
                            </span>
                        </div>
                        <div className="flex-between mb-2">
                            <span className="text-label">Amount</span>
                            <span className="text-xl text-highlight">{invoice?.amount} Microcredits</span>
                        </div>
                        {invoice?.memo && (
                            <div className="flex-between">
                                <span className="text-label">Memo</span>
                                <span className="text-value">{invoice.memo}</span>
                            </div>
                        )}
                    </div>

                    {/* STEPS INDICATOR */}
                    {renderStepIndicator()}

                    {/* ACTION AREA */}
                    {step === 'SUCCESS' ? (
                        <div className="text-center">
                            <p className="text-small mb-6">The transaction has been settled on-chain.</p>
                            <a
                                href={`https://explorer.aleo.org/testnet/transaction/${currentStatus}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-primary inline-block"
                                style={{ textDecoration: 'none' }}
                            >
                                View Transaction
                            </a>
                        </div>
                    ) : (
                        <div className="mt-6">
                            {/* ERROR MESSAGE */}
                            {currentStatus && !currentStatus.startsWith('at1') && (
                                <p className="text-error text-center mb-4 text-sm">{currentStatus}</p>
                            )}

                            {step === 'CONNECT' && (
                                <div className="flex-center">
                                    <WalletMultiButton className="btn-primary" />
                                    {address && (
                                        <button
                                            className="btn-secondary mt-4 w-full"
                                            onClick={handleConnect}
                                        >
                                            Continue with Connected Wallet
                                        </button>
                                    )}
                                </div>
                            )}

                            {step === 'VERIFY' && (
                                <button className="btn-primary w-full" onClick={handleConnect}>
                                    Verify Hash & Records
                                </button>
                            )}

                            {(step === 'CONVERT' || step === 'PAY') && (
                                <button
                                    className="btn-primary w-full"
                                    onClick={handlePay}
                                    disabled={isProcess}
                                >
                                    {isProcess ? 'Processing...' : step === 'CONVERT' ? 'Convert Public to Private' : `Pay ${invoice?.amount}`}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <p className="text-center mt-6 text-label" style={{ fontSize: '12px' }}>
                    Secured by Aleo Zero-Knowledge Proofs
                </p>

            </div>
        </div>
    );
};

export default PaymentPage;
