export const FEE_PREFERENCE_STORAGE_KEY = 'nullpay_fee_mode';
export const FEE_PREFERENCE_EVENT = 'nullpay-fee-preference-change';
export const FIXED_FEE_MICROCREDITS = 20_000;

export type FeePreferenceMode = 'estimate' | 'fixed';

const isBrowser = () => typeof window !== 'undefined';

export const getFeePreferenceMode = (): FeePreferenceMode => {
    if (!isBrowser()) return 'estimate';
    const stored = window.localStorage.getItem(FEE_PREFERENCE_STORAGE_KEY);
    return stored === 'fixed' ? 'fixed' : 'estimate';
};

export const isFeeEstimationEnabled = (): boolean => getFeePreferenceMode() === 'estimate';

export const setFeePreferenceMode = (mode: FeePreferenceMode) => {
    if (!isBrowser()) return;
    window.localStorage.setItem(FEE_PREFERENCE_STORAGE_KEY, mode);
    window.dispatchEvent(new CustomEvent(FEE_PREFERENCE_EVENT, { detail: mode }));
};
