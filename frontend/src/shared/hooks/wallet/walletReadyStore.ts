let ready = false;
const listeners = new Set<() => void>();

export const setWalletReady = (v: boolean) => {
    ready = v;
    listeners.forEach((fn) => fn());
};

export const getWalletReady = () => ready;

export const subscribeWalletReady = (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};
