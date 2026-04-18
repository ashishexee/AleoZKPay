import React, { createContext, useCallback, useContext, useRef } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletModal } from '@provablehq/aleo-wallet-adaptor-react-ui';

/* ─── Error detection ──────────────────────────────────────────── */
const CONNECTION_ERROR_PATTERNS = [
    'not connected',
    'connection expired',
    'dapp not connected',
];

function isConnectionExpiredError(error: unknown): boolean {
    const msg = error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();
    return CONNECTION_ERROR_PATTERNS.some((p) => msg.includes(p));
}

/* ─── Context ──────────────────────────────────────────────────── */
interface WalletErrorContextState {
    /**
     * Call this in any catch block that wraps a wallet operation.
     * If the error is a connection-expired error, the wallet will be
     * disconnected and the connect modal will open automatically.
     *
     * @returns `true` if the error was handled (connection-expired),
     *          `false` if it's some other error you should handle yourself.
     */
    handleWalletError: (error: unknown) => boolean;
}

const WalletErrorContext = createContext<WalletErrorContextState>({
    handleWalletError: () => false,
});

export const useWalletErrorHandler = () => useContext(WalletErrorContext);

/* ─── Provider ─────────────────────────────────────────────────── */
export const WalletErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { disconnect } = useWallet();
    const { setVisible } = useWalletModal();

    // Debounce so we don't fire multiple disconnects if several calls
    // fail at the same time (e.g. parallel requestRecords).
    const handlingRef = useRef(false);

    const handleWalletError = useCallback(
        (error: unknown): boolean => {
            if (!isConnectionExpiredError(error)) return false;

            // Already handling — skip duplicate triggers
            if (handlingRef.current) return true;
            handlingRef.current = true;

            console.warn('[NullPay] Wallet connection expired — disconnecting and reopening modal.');

            // 1) Disconnect the stale session
            disconnect().catch(() => {
                // Ignore errors during disconnect — the session is already dead.
            });

            // 2) Open the connect-wallet modal so the user can reconnect
            //    Small delay to let the disconnect settle in the provider.
            setTimeout(() => {
                setVisible(true);
                handlingRef.current = false;
            }, 300);

            return true;
        },
        [disconnect, setVisible],
    );

    return (
        <WalletErrorContext.Provider value={{ handleWalletError }}>
            {children}
        </WalletErrorContext.Provider>
    );
};
