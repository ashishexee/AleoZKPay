import { usePayment, PaymentStep } from '../hooks/usePayment';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';

const PaymentPage = () => {
    const [searchParams] = useSearchParams();
    const [step, setStep] = useState(1); // 1: Connect, 2: Review, 3: Processing, 4: Success

    const { address } = useWallet();
    const publicKey = address;

    const renderStepIndicator = () => {
        const steps: { key: PaymentStep; label: string }[] = [
            { key: 'CONNECT', label: '1. Connect' },
            { key: 'VERIFY', label: '2. Verify' },
            { key: 'PAY', label: '3. Pay' },
        ];

        // Map hook steps to UI steps
        // CONVERT is part of PAY flow visually or a sub-step? let's make it distinct if active.
        return (
            <div className="flex-between mb-6">
                {steps.map((s) => {
                    let isActive = false;
                    const currentIndex = steps.findIndex(x => x.key === step);
                    // Special handling: CONVERT is like step 2.5 or 3
                    if (step === 'CONVERT' && s.key === 'PAY') isActive = true;
                    if (step === 'SUCCESS' && s.key === 'PAY') isActive = true;
                    if (steps.findIndex(x => x.key === s.key) <= currentIndex) isActive = true;
                    // If we are past this step

                    return (
                        <span key={s.key} className={`text-label ${isActive ? 'text-highlight' : ''}`}>
                            {s.label}
                        </span>
                    );
                })}
            </div>
        );
    };

    const handlePay = () => {
        setStep(3);
        setTimeout(() => setStep(4), 3000);
    };

    return (
        <div className="page-container flex-center" style={{ minHeight: '80vh' }}>
            <div style={{ width: '100%', maxWidth: '480px' }}>

                {/* STATUS HEADER */}
                <div className="text-center mb-8">
                    <h1 className="text-gradient" style={{ fontSize: '36px' }}>
                        {step === 4 ? 'Payment Successful' : 'Pay Invoice'}
                    </h1>
                </div>

                <div className="glass-card">
                    {/* INVOICE DETAILS */}
                    <div className="mb-6 pb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <div className="flex-between mb-2">
                            <span className="text-label">Merchant</span>
                            <span className="text-value" style={{ fontFamily: 'monospace' }}>{invoice.merchant.slice(0, 10)}...</span>
                        </div>
                        <div className="flex-between mb-2">
                            <span className="text-label">Amount</span>
                            <span className="text-xl text-highlight">{invoice.amount}</span>
                        </div>
                        <div className="flex-between">
                            <span className="text-label">Memo</span>
                            <span className="text-value">{invoice.memo}</span>
                        </div>
                    </div>

                    {/* STEPS */}
                    {step === 4 ? (
                        <div className="text-center">
                            <p className="text-small mb-6">The transaction has been settled on-chain verification.</p>
                            <button className="btn-primary">View Transaction</button>
                        </div>
                    ) : (
                        <div>
                            <div className="flex-between mb-6">
                                <span className={`text-label ${step >= 1 ? 'text-highlight' : ''}`}>1. Connect</span>
                                <span className={`text-label ${step >= 2 ? 'text-highlight' : ''}`}>2. Approve</span>
                                <span className={`text-label ${step >= 3 ? 'text-highlight' : ''}`}>3. Verify</span>
                            </div>

                            <button
                                className="btn-primary"
                                onClick={handlePay}
                                disabled={step === 3}
                            >
                                {step === 3 ? 'Processing Proof...' : 'Pay 100 USDC'}
                            </button>
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
