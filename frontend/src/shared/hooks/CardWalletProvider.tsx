import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { PrivateKey } from '@provablehq/sdk';
import {
    CardTokenCode,
    CardWalletProfile,
    getCardWallet,
    recordCardSpend as recordCardSpendApi,
    submitCardLimitChange,
    upsertCardWallet
} from '../services/api';
import { encryptCardPrivateKey, decryptCardPrivateKey, type CardKdfAlgorithm } from '../utils/card-crypto';
import { fetchAllPrivateBalances } from '../pages/Profile/components/BurnerWallet/scanner';
import { useWalletErrorHandler } from './Wallet/WalletErrorBoundary';

type BalanceKey = 'ALEO' | 'USDCx' | 'USAD';

interface CardLimitDraft {
    max_balance: number;
    max_single_spend: number;
    max_daily_spend: number;
}

interface CreateCardOptions {
    label: string;
    hint?: string;
}

interface CardWalletContextValue {
    card: CardWalletProfile | null;
    isLoading: boolean;
    isUnlocked: boolean;
    decryptedCardKey: string | null;
    cardBalances: Record<BalanceKey, number> | null;
    isRefreshingBalances: boolean;
    createCard: (pin: string, cardSecret: string, options: CreateCardOptions) => Promise<CardWalletProfile>;
    unlockCard: (pin: string, cardSecret: string, options?: { persist?: boolean }) => Promise<string>;
    lockCard: () => void;
    refreshCard: () => Promise<void>;
    refreshCardBalances: (pin?: string, cardSecret?: string) => Promise<Record<BalanceKey, number> | null>;
    validateCardSpend: (token: CardTokenCode, amountMicro: number) => { ok: true } | { ok: false; reason: string };
    topUpCard: (token: CardTokenCode, amount: number, pin: string, cardSecret: string) => Promise<string>;
    requestCardLimitChange: (token: CardTokenCode, nextLimits: CardLimitDraft) => Promise<CardWalletProfile>;
    recordCardSpend: (token: CardTokenCode, amountMicro: number) => Promise<CardWalletProfile>;
}

const CardWalletContext = createContext<CardWalletContextValue | undefined>(undefined);

const AUTO_LOCK_MS = 10 * 60 * 1000;

const TOKEN_TO_BALANCE_KEY: Record<CardTokenCode, BalanceKey> = {
    CREDITS: 'ALEO',
    USDCX: 'USDCx',
    USAD: 'USAD'
};

const DEFAULT_CARD_LIMITS: Record<CardTokenCode, CardLimitDraft> = {
    CREDITS: {
        max_balance: 25_000_000,
        max_single_spend: 10_000_000,
        max_daily_spend: 25_000_000
    },
    USDCX: {
        max_balance: 25_000_000,
        max_single_spend: 10_000_000,
        max_daily_spend: 25_000_000
    },
    USAD: {
        max_balance: 25_000_000,
        max_single_spend: 10_000_000,
        max_daily_spend: 25_000_000
    }
};

function validatePin(pin: string) {
    if (!/^\d{6}$/.test(pin)) {
        throw new Error('Card PIN must be exactly 6 digits.');
    }
}

function validateCardSecret(cardSecret: string) {
    if (!cardSecret || cardSecret.trim().length < 8) {
        throw new Error('Card secret must be at least 8 characters long.');
    }
}

function validateCardLabel(label: string) {
    if (!label || !label.trim()) {
        throw new Error('Card label is required.');
    }
    if (label.trim().length > 60) {
        throw new Error('Card label must be 60 characters or fewer.');
    }
}

function normalizeCardHint(cardHint?: string) {
    const normalized = cardHint?.trim() || '';
    if (!normalized) {
        return null;
    }
    if (normalized.length > 32) {
        throw new Error('Card hint must be 32 characters or fewer.');
    }
    return normalized;
}

function generateCardLast4() {
    return Math.floor(window.crypto.getRandomValues(new Uint32Array(1))[0] % 10_000)
        .toString()
        .padStart(4, '0');
}

function toMicroUnits(amount: number): number {
    return Math.round(amount * 1_000_000);
}

function toBase64(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
}

function resetKeyMaterial(value: string | null) {
    if (!value) return;
    // Strings are immutable in JS, so we only drop references here.
    void value;
}

function buildLimitChangeMessage(card: CardWalletProfile, token: CardTokenCode, nextLimits: CardLimitDraft) {
    return JSON.stringify({
        action: 'nullpay_card_limit_change_v1',
        card_address: card.card_address,
        token,
        previous_limits: {
            max_balance: card.limits[token].max_balance,
            max_single_spend: card.limits[token].max_single_spend,
            max_daily_spend: card.limits[token].max_daily_spend
        },
        next_limits: nextLimits,
        nonce: window.crypto.randomUUID(),
        timestamp: new Date().toISOString()
    });
}

export const CardWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { address, wallet, executeTransaction, requestRecords, decrypt } = useWallet();
    const { handleWalletError } = useWalletErrorHandler();
    const [card, setCard] = useState<CardWalletProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [decryptedCardKey, setDecryptedCardKey] = useState<string | null>(null);
    const [cardBalances, setCardBalances] = useState<Record<BalanceKey, number> | null>(null);
    const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);
    const autoLockTimeoutRef = useRef<number | null>(null);

    const clearAutoLockTimeout = () => {
        if (autoLockTimeoutRef.current !== null) {
            window.clearTimeout(autoLockTimeoutRef.current);
            autoLockTimeoutRef.current = null;
        }
    };

    const lockCard = () => {
        clearAutoLockTimeout();
        resetKeyMaterial(decryptedCardKey);
        setDecryptedCardKey(null);
    };

    const scheduleAutoLock = () => {
        clearAutoLockTimeout();
        autoLockTimeoutRef.current = window.setTimeout(() => {
            lockCard();
        }, AUTO_LOCK_MS);
    };

    const refreshCard = async () => {
        if (!address) {
            lockCard();
            setCard(null);
            setCardBalances(null);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const nextCard = await getCardWallet(address);
            setCard(nextCard);
            if (!nextCard) {
                setCardBalances(null);
                lockCard();
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshCard();
    }, [address]);

    useEffect(() => {
        const handlePageHide = () => lockCard();
        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('beforeunload', handlePageHide);
        return () => {
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('beforeunload', handlePageHide);
            clearAutoLockTimeout();
        };
    }, [decryptedCardKey]);

    const unlockCard = async (pin: string, cardSecret: string, options?: { persist?: boolean }) => {
        if (!card) {
            throw new Error('No NullPay card is configured yet.');
        }

        validatePin(pin);
        validateCardSecret(cardSecret);

        const kdfAlgorithm: CardKdfAlgorithm = card.card_kdf_algorithm === 'argon2id'
            ? 'argon2id'
            : 'pbkdf2-sha256';
        const kdfParams = {
            opslimit: Number((card.card_kdf_params as any)?.opslimit),
            memlimit: Number((card.card_kdf_params as any)?.memlimit),
            alg: Number((card.card_kdf_params as any)?.alg),
            iterations: Number((card.card_kdf_params as any)?.iterations),
            hash: (card.card_kdf_params as any)?.hash === 'SHA-256' ? 'SHA-256' : undefined,
            version: Number((card.card_kdf_params as any)?.version || 1)
        };

        const nextKey = await decryptCardPrivateKey(
            card.encrypted_card_private_key,
            pin,
            cardSecret,
            card.card_kdf_salt,
            kdfAlgorithm,
            kdfParams as any
        );

        PrivateKey.from_string(nextKey);

        if (options?.persist !== false) {
            setDecryptedCardKey(nextKey);
            scheduleAutoLock();
        }

        return nextKey;
    };

    const refreshCardBalances = async (pin?: string, cardSecret?: string) => {
        if (!card) {
            setCardBalances(null);
            return null;
        }

        const shouldUseTempUnlock = !decryptedCardKey && pin && cardSecret;
        const activeKey = decryptedCardKey || (shouldUseTempUnlock ? await unlockCard(pin!, cardSecret!, { persist: false }) : null);
        if (!activeKey) {
            return cardBalances;
        }

        try {
            setIsRefreshingBalances(true);
            const balances = await fetchAllPrivateBalances(activeKey);
            setCardBalances(balances);
            if (decryptedCardKey) scheduleAutoLock();
            return balances;
        } finally {
            setIsRefreshingBalances(false);
            if (shouldUseTempUnlock) {
                resetKeyMaterial(activeKey);
            }
        }
    };

    const createCard = async (pin: string, cardSecret: string, options: CreateCardOptions) => {
        if (!address) {
            throw new Error('Connect your main wallet first.');
        }

        validatePin(pin);
        validateCardSecret(cardSecret);
        validateCardLabel(options.label);
        const cardHint = normalizeCardHint(options.hint);

        const privateKey = new PrivateKey();
        const privateKeyString = privateKey.to_string();
        const cardAddress = privateKey.to_address().to_string();
        const cardLast4 = generateCardLast4();
        const encrypted = await encryptCardPrivateKey(privateKeyString, pin, cardSecret);

        const savedCard = await upsertCardWallet(address, {
            card_address: cardAddress,
            card_last4: cardLast4,
            encrypted_card_private_key: encrypted.encryptedPrivateKey,
            card_kdf_salt: encrypted.saltBase64,
            card_kdf_algorithm: encrypted.kdfAlgorithm,
            card_kdf_params: encrypted.kdfParams as unknown as Record<string, unknown>,
            card_status: 'ACTIVE',
            card_label: options.label.trim(),
            card_hint: cardHint,
            card_spend_window_started_at: null,
            limits: DEFAULT_CARD_LIMITS,
            spent_today: {
                CREDITS: 0,
                USDCX: 0,
                USAD: 0
            }
        });

        setCard(savedCard);
        setDecryptedCardKey(privateKeyString);
        scheduleAutoLock();
        await refreshCardBalances(pin, cardSecret);
        return savedCard;
    };

    const validateCardSpend = (token: CardTokenCode, amountMicro: number) => {
        if (!card) {
            return { ok: false as const, reason: 'Create your NullPay card first.' };
        }

        const limits = card.limits[token];
        if (limits.max_single_spend > 0 && amountMicro > limits.max_single_spend) {
            return { ok: false as const, reason: `This payment exceeds your ${token} single-spend cap.` };
        }

        if (limits.max_daily_spend > 0 && limits.spent_today + amountMicro > limits.max_daily_spend) {
            return { ok: false as const, reason: `This payment exceeds your ${token} daily cap.` };
        }

        return { ok: true as const };
    };

    const findWalletRecord = async (token: CardTokenCode, amountMicro: number) => {
        if (!requestRecords) {
            throw new Error('Wallet record access is unavailable.');
        }

        const programName = token === 'CREDITS'
            ? 'credits.aleo'
            : token === 'USDCX'
                ? 'test_usdcx_stablecoin.aleo'
                : 'test_usad_stablecoin.aleo';
        const fieldName = token === 'CREDITS' ? 'microcredits' : 'amount';
        const records = await requestRecords(programName, false);

        let matchingRecord: any = null;
        for (const record of records as any[]) {
            if (record.spent) continue;
            if (record.recordCiphertext && !record.plaintext && decrypt) {
                try {
                    record.plaintext = await decrypt(record.recordCiphertext);
                } catch {
                    continue;
                }
            }

            const plaintext = record.plaintext || '';
            const regex = token === 'CREDITS'
                ? /microcredits\s*:\s*([\d_]+)u64/
                : /amount\s*:\s*([\d_]+)u128/;
            const match = plaintext.match(regex);
            if (!match?.[1]) continue;

            const balance = Number(match[1].replace(/_/g, ''));
            if (balance >= amountMicro) {
                matchingRecord = record;
                break;
            }
        }

        if (!matchingRecord) {
            throw new Error(`No single private ${token} record is large enough. Convert or consolidate your wallet funds first.`);
        }

        return { matchingRecord, programName, fieldName };
    };

    const topUpCard = async (token: CardTokenCode, amount: number, pin: string, cardSecret: string) => {
        if (!address || !executeTransaction || !card?.card_address) {
            throw new Error('Connect your main wallet and create a card first.');
        }

        const amountMicro = toMicroUnits(amount);
        if (amountMicro <= 0) {
            throw new Error('Top-up amount must be greater than zero.');
        }

        const tempKey = await unlockCard(pin, cardSecret, { persist: false });
        try {
            const balances = await fetchAllPrivateBalances(tempKey);
            const currentBalanceMicro = toMicroUnits(balances[TOKEN_TO_BALANCE_KEY[token]] || 0);
            const nextBalance = currentBalanceMicro + amountMicro;
            const maxBalance = card.limits[token].max_balance || 0;

            if (maxBalance > 0 && nextBalance > maxBalance) {
                throw new Error(`This top-up would exceed your ${token} card balance cap.`);
            }
        } finally {
            resetKeyMaterial(tempKey);
        }

        const { matchingRecord, programName } = await findWalletRecord(token, amountMicro);
        let inputs: string[];

        if (token === 'CREDITS') {
            inputs = [matchingRecord.plaintext || matchingRecord.ciphertext || matchingRecord, card.card_address, `${amountMicro}u64`];
        } else {
            const { getFreezeListRoot, getFreezeListCount, getFreezeListIndex, generateFreezeListProof } = await import('../utils/aleo-utils');
            await getFreezeListRoot();
            await getFreezeListCount();
            const firstIndex = await getFreezeListIndex(0);
            const { Address } = await import('@provablehq/wasm');

            let index0FieldStr = undefined;
            if (firstIndex) {
                try {
                    index0FieldStr = Address.from_string(firstIndex).toGroup().toXCoordinate().toString();
                } catch {
                    index0FieldStr = undefined;
                }
            }

            const proof = await generateFreezeListProof(1, index0FieldStr);
            inputs = [card.card_address, `${amountMicro}u128`, matchingRecord.plaintext || matchingRecord.ciphertext || matchingRecord, `[${proof}, ${proof}]`];
        }

        const functionName = 'transfer_private';
        try {
            const result = await executeTransaction({
                program: programName,
                function: functionName,
                inputs,
                fee: 100_000,
                privateFee: false
            });

            if (!result?.transactionId) {
                throw new Error('The wallet did not return a transaction id for the top-up.');
            }

            window.setTimeout(() => {
                refreshCardBalances(pin, cardSecret).catch(() => null);
            }, 2500);

            return result.transactionId;
        } catch (err: any) {
            if (handleWalletError(err)) {
                throw err;
            }
            throw err;
        }
    };

    const requestCardLimitChange = async (token: CardTokenCode, nextLimits: CardLimitDraft) => {
        if (!address || !wallet?.adapter?.signMessage) {
            throw new Error('Main wallet signing is unavailable.');
        }
        if (!card) {
            throw new Error('Create your NullPay card first.');
        }

        const sanitizedNextLimits: CardLimitDraft = {
            max_balance: Math.round(nextLimits.max_balance),
            max_single_spend: Math.round(nextLimits.max_single_spend),
            max_daily_spend: Math.round(nextLimits.max_daily_spend)
        };

        if (sanitizedNextLimits.max_single_spend > sanitizedNextLimits.max_balance) {
            throw new Error('Single-spend limit cannot exceed the balance cap.');
        }

        const message = buildLimitChangeMessage(card, token, sanitizedNextLimits);
        const signatureResult = await wallet.adapter.signMessage(new TextEncoder().encode(message));
        const signatureBytes = signatureResult instanceof Uint8Array
            ? signatureResult
            : (signatureResult as any)?.signature;
        if (!signatureBytes) {
            throw new Error('Main wallet did not return a usable signature.');
        }
        const signatureBase64 = toBase64(signatureBytes);
        const nextCard = await submitCardLimitChange(address, address, message, signatureBase64);
        setCard(nextCard);
        return nextCard;
    };

    const recordCardSpend = async (token: CardTokenCode, amountMicro: number) => {
        if (!address) {
            throw new Error('Missing main wallet address.');
        }
        const nextCard = await recordCardSpendApi(address, token, amountMicro);
        setCard(nextCard);
        return nextCard;
    };

    return (
        <CardWalletContext.Provider
            value={{
                card,
                isLoading,
                isUnlocked: Boolean(decryptedCardKey),
                decryptedCardKey,
                cardBalances,
                isRefreshingBalances,
                createCard,
                unlockCard,
                lockCard,
                refreshCard,
                refreshCardBalances,
                validateCardSpend,
                topUpCard,
                requestCardLimitChange,
                recordCardSpend
            }}
        >
            {children}
        </CardWalletContext.Provider>
    );
};

export function useCardWallet() {
    const context = useContext(CardWalletContext);
    if (!context) {
        throw new Error('useCardWallet must be used within a CardWalletProvider');
    }
    return context;
}
