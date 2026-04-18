import { PaymentStep } from '../../../../shared/hooks/usePayment';

interface PaymentProgressProps {
    step: PaymentStep;
}

const steps: { key: PaymentStep; label: string }[] = [
    { key: 'CONNECT', label: '1. Connect' },
    { key: 'VERIFY', label: '2. Verify' },
    { key: 'PAY', label: '3. Pay' },
];

export const PaymentProgress = ({ step }: PaymentProgressProps) => {
    return (
        <div className="flex justify-between mb-8 relative">
            <div className="absolute top-4 left-0 w-full h-0.5 bg-white/10 -z-0" />
            {steps.map((s, index) => {
                const isActive = s.key === step ||
                    (step === 'CONVERT' && s.key === 'PAY') ||
                    ((step === 'SUCCESS' || step === 'ALREADY_PAID') && s.key === 'PAY') ||
                    (steps.findIndex((x) => x.key === step) > index);

                return (
                    <div key={s.key} className="relative z-10 flex flex-col items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isActive
                            ? 'bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                            : 'bg-black border-gray-700 text-gray-500'
                            }`}>
                            {isActive ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <span className="text-xs font-bold">{index + 1}</span>
                            )}
                        </div>
                        <span className={`text-xs font-bold tracking-wider uppercase transition-colors ${isActive ? 'text-white' : 'text-gray-600'}`}>
                            {s.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};
