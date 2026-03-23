import { SessionState, WalletPreference } from './types';

export class SessionStore {
    private session: SessionState | null = null;

    get(): SessionState | null {
        return this.session;
    }

    require(): SessionState {
        if (!this.session) {
            throw new Error('No active NullPay session. Call login first.');
        }
        return this.session;
    }

    set(session: SessionState): SessionState {
        this.session = session;
        return session;
    }

    updateWallet(activeWallet: WalletPreference): SessionState {
        const current = this.require();
        current.activeWallet = activeWallet;
        current.updatedAt = new Date().toISOString();
        this.session = current;
        return current;
    }

    clear(): void {
        this.session = null;
    }
}
