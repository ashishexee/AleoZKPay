"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionStore = void 0;
class SessionStore {
    constructor() {
        this.session = null;
    }
    get() {
        return this.session;
    }
    require() {
        if (!this.session) {
            throw new Error('No active NullPay session. Call login first.');
        }
        return this.session;
    }
    set(session) {
        this.session = session;
        return session;
    }
    updateWallet(activeWallet) {
        const current = this.require();
        current.activeWallet = activeWallet;
        current.updatedAt = new Date().toISOString();
        this.session = current;
        return current;
    }
    clear() {
        this.session = null;
    }
}
exports.SessionStore = SessionStore;
