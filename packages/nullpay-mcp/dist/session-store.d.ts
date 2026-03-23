import { SessionState, WalletPreference } from './types';
export declare class SessionStore {
    private session;
    get(): SessionState | null;
    require(): SessionState;
    set(session: SessionState): SessionState;
    updateWallet(activeWallet: WalletPreference): SessionState;
    clear(): void;
}
