import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { TransactionOptions } from '@provablehq/aleo-types';
import { PrivateKey } from '@provablehq/sdk';
import {
    type CardTokenCode,
    type CardWalletProfile,
    deleteCardWallet as deleteCardWalletEntry,
    getCardWallet,
    submitCardLimitChange,
    upsertCardWallet
} from '../services/api';
import { executeWithShieldRetry } from '../utils/shieldRetry';
import { decryptCardPrivateKey, encryptCardPrivateKey, type CardKdfAlgorithm } from '../utils/card-crypto';
import { decryptWithPassword, encryptWithPassword, hashAddress } from '../utils/crypto';
import { CARD_PIN_LENGTH, CARD_SECRET_MIN_LENGTH } from '../utils/card-input-limits';
import { CARD_HINT_MAX_BYTES, CARD_LABEL_MAX_BYTES, getUtf8ByteLength } from '../utils/leo-input-limits';
import {
    buildCreateCardRecordInputs,
    parseCardProfileRecord,
    sha256HexToField
} from '../utils/card-chain';
import { estimateExecutionFee, fetchBurnerRecordsFromTx, WALLET_PROGRAM_ID } from '../utils/aleo-utils';
import { fetchAllPrivateBalances } from '../pages/Profile/components/BurnerWallet/scanner';
import { useWalletErrorHandler } from './Wallet/WalletErrorBoundary';
import { useBurnerWallet } from './BurnerWalletProvider';
import { sweepBurnerFundsToDestination } from '../utils/burnerSweep';

type BalanceKey = 'ALEO' | 'USDCx' | 'USAD';

interface CardLimitDraft {
    max_balance: number;
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
    refreshCardBalances: (
        pin?: string,
        cardSecret?: string,
        options?: { retryOnZero?: boolean }
    ) => Promise<Record<BalanceKey, number> | null>;
    topUpCard: (token: CardTokenCode, amount: number, pin?: string, cardSecret?: string) => Promise<string>;
    requestCardLimitChange: (token: CardTokenCode, nextLimits: CardLimitDraft) => Promise<CardWalletProfile>;
    sweepCardFundsToMain: (pin?: string, cardSecret?: string) => Promise<string[]>;
    deleteCard: () => Promise<void>;
}

const CardWalletContext = createContext<CardWalletContextValue | undefined>(undefined);

const AUTO_LOCK_MS = 10 * 60 * 1000;
const DEFAULT_TOP_UP_FEE = 100_000;
const DEFAULT_LIMIT_MICROS = 25_000_000;
const TOKEN_TO_BALANCE_KEY: Record<CardTokenCode, BalanceKey> = {
    CREDITS: 'ALEO',
    USDCX: 'USDCx',
    USAD: 'USAD'
};

const DEFAULT_CARD_LIMITS: Record<CardTokenCode, CardLimitDraft> = {
    CREDITS: { max_balance: DEFAULT_LIMIT_MICROS },
    USDCX: { max_balance: DEFAULT_LIMIT_MICROS },
    USAD: { max_balance: DEFAULT_LIMIT_MICROS }
};

function validatePin(pin: string) {
    if (!new RegExp(`^\\d{${CARD_PIN_LENGTH}}$`).test(pin)) {
        throw new Error(`Card PIN must be exactly ${CARD_PIN_LENGTH} digits.`);
    }
}

function validateCardSecret(cardSecret: string) {
    const normalized = cardSecret?.trim() || '';
    if (normalized.length < CARD_SECRET_MIN_LENGTH) {
        throw new Error(`Card secret must be at least ${CARD_SECRET_MIN_LENGTH} characters long.`);
    }
}

function validateCardLabel(label: string) {
    const normalized = label?.trim() || '';
    if (!normalized) {
        throw new Error('Card label is required.');
    }
    if (getUtf8ByteLength(normalized) > CARD_LABEL_MAX_BYTES) {
        throw new Error(`Card label must be ${CARD_LABEL_MAX_BYTES} bytes or fewer.`);
    }
}

function normalizeCardHint(cardHint?: string) {
    const normalized = cardHint?.trim() || '';
    if (!normalized) {
        return null;
    }
    if (getUtf8ByteLength(normalized) > CARD_HINT_MAX_BYTES) {
        throw new Error(`Card hint must be ${CARD_HINT_MAX_BYTES} bytes or fewer.`);
    }
    return normalized;
}

function normalizeCardNumber(cardNumber: string) {
    return cardNumber.replace(/\D/g, '');
}

function calculateLuhnCheckDigit(partialNumber: string) {
    let sum = 0;
    let shouldDouble = true;
    for (let index = partialNumber.length - 1; index >= 0; index -= 1) {
        let digit = Number(partialNumber[index]);
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return String((10 - (sum % 10)) % 10);
}

function generateVisaStyleCardNumber() {
    const randomDigits = Array.from(window.crypto.getRandomValues(new Uint8Array(14)))
        .map((digit) => String(digit % 10))
        .join('');
    const partial = `4${randomDigits}`;
    return `${partial}${calculateLuhnCheckDigit(partial)}`;
}

function toMicroUnits(amount: number): number {
    return Math.round(amount * 1_000_000);
}

function getWalletRecordBalance(record: any, token: CardTokenCode): number {
    try {
        const fieldName = token === 'CREDITS' ? 'microcredits' : 'amount';
        const suffix = token === 'CREDITS' ? 'u64' : 'u128';

        if (record?.data?.[fieldName]) {
            return Number(String(record.data[fieldName]).replace(suffix, '').replace(/_/g, ''));
        }

        if (record?.plaintext) {
            const regex = new RegExp(`${fieldName}:\\s*([\\d_]+)${suffix}`);
            const match = record.plaintext.match(regex);
            if (match?.[1]) {
                return Number(match[1].replace(/_/g, ''));
            }
        }
    } catch {
        return 0;
    }

    return 0;
}

function getWalletRecordInput(record: any) {
    return record.plaintext || record.ciphertext || record.recordCiphertext || record;
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
    void value;
}

function buildLimitChangeMessage(card: CardWalletProfile, token: CardTokenCode, nextLimits: CardLimitDraft) {
    return JSON.stringify({
        action: 'nullpay_card_limit_change_v1',
        card_address: card.card_address,
        card_number_hash: card.card_number_hash || null,
        token,
        previous_limits: {
            max_balance: card.limits[token].max_balance
        },
        next_limits: nextLimits,
        nonce: window.crypto.randomUUID(),
        timestamp: new Date().toISOString()
    });
}

function buildCardDeletionMessage(card: CardWalletProfile) {
    return JSON.stringify({
        action: 'nullpay_card_delete_v1',
        card_address: card.card_address,
        card_number_hash: card.card_number_hash || null,
        nonce: window.crypto.randomUUID(),
        timestamp: new Date().toISOString()
    });
}

function hasPositiveBalance(balances: Record<BalanceKey, number>) {
    return Object.values(balances).some((value) => value > 0);
}

function sleep(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeMaybeEncryptedValue(
    value: string | null | undefined,
    appPassword: string | null,
    isPlaintext: (next: string) => boolean
) {
    if (!value) {
        return Promise.resolve('');
    }
    if (isPlaintext(value)) {
        return Promise.resolve(value);
    }
    if (!appPassword) {
        return Promise.resolve('');
    }
    return decryptWithPassword(value, appPassword).catch(() => '');
}

export const CardWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { address, wallet, executeTransaction, requestRecords, decrypt, transactionStatus } = useWallet();
    const { handleWalletError } = useWalletErrorHandler();
    const { appPassword } = useBurnerWallet();
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

    const clearCachedCard = (ownerAddress: string) => {
        try {
            window.localStorage.removeItem(`nullpay_card_wallet_cache_v1:${ownerAddress.toLowerCase()}`);
        } catch (error) {
            console.warn('[CardWalletProvider] Failed to clear legacy local card cache', error);
        }
    };

    const normalizeDbCardProfile = async (profile: CardWalletProfile | null): Promise<CardWalletProfile | null> => {
        if (!profile) {
            return null;
        }

        const normalizedAddress = await normalizeMaybeEncryptedValue(
            profile.encrypted_card_address || profile.card_address,
            appPassword,
            (value) => value.startsWith('aleo1')
        );
        const normalizedCardNumber = await normalizeMaybeEncryptedValue(
            profile.encrypted_card_number || profile.card_number,
            appPassword,
            (value) => /^\d{16}$/.test(value)
        );

        return {
            ...profile,
            card_address: normalizedAddress || profile.card_address,
            encrypted_card_address: profile.encrypted_card_address || profile.card_address || null,
            card_number: normalizedCardNumber || profile.card_number || null,
            encrypted_card_number: profile.encrypted_card_number || null,
            card_number_hash_field: profile.card_number_hash
                ? sha256HexToField(profile.card_number_hash)
                : profile.card_number_hash_field || null,
            limits: profile.limits || DEFAULT_CARD_LIMITS
        };
    };

    const fetchMirrorCard = async () => {
        if (!address) {
            return null;
        }

        try {
            const dbCard = await getCardWallet(address);
            return normalizeDbCardProfile(dbCard);
        } catch (error) {
            console.warn('[CardWalletProvider] DB mirror lookup failed', error);
            return null;
        }
    };

    const setCardState = (nextCard: CardWalletProfile | null) => {
        setCard(nextCard);
        if (!nextCard) {
            setCardBalances(null);
            lockCard();
        }
    };

    const refreshCard = async () => {
        if (!address) {
            setCardState(null);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const dbCard = await fetchMirrorCard();
            if (dbCard) {
                let resolvedCard = dbCard;

                if (!resolvedCard.mainOwner) {
                    try {
                        const repairedCard = await upsertCardWallet(address, {
                            main_address: address
                        });
                        const normalizedRepairedCard = await normalizeDbCardProfile(repairedCard);
                        if (normalizedRepairedCard) {
                            resolvedCard = normalizedRepairedCard;
                        }
                    } catch (error) {
                        console.warn('[CardWalletProvider] Failed to repair missing card main owner mirror', error);
                    }
                }

                setCardState(resolvedCard);
                return;
            }

            clearCachedCard(address);
            setCardState(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshCard();
    }, [address, appPassword]);

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

    const refreshCardBalances = async (
        pin?: string,
        cardSecret?: string,
        options?: { retryOnZero?: boolean }
    ) => {
        if (!card) {
            setCardBalances(null);
            return null;
        }

        const shouldUseTempUnlock = !decryptedCardKey && pin && cardSecret;
        const activeKey = decryptedCardKey || (shouldUseTempUnlock ? await unlockCard(pin!, cardSecret!, { persist: false }) : null);
        if (!activeKey) {
            console.warn('[CardWalletProvider] Skipping card balance refresh because no decrypted card key is available.');
            return cardBalances;
        }

        try {
            console.group('[CardWalletProvider] Refreshing card balances');
            console.log('[CardWalletProvider] Card address:', card.card_address);
            console.log('[CardWalletProvider] Using temporary unlock:', shouldUseTempUnlock);
            console.log('[CardWalletProvider] Retry on zero:', Boolean(options?.retryOnZero));
            setIsRefreshingBalances(true);
            let balances = await fetchAllPrivateBalances(activeKey);
            console.log('[CardWalletProvider] First scan balances:', balances);

            if (options?.retryOnZero && !hasPositiveBalance(balances)) {
                console.warn('[CardWalletProvider] First scan returned zero balances. Retrying after delay.');
                await sleep(1500);
                balances = await fetchAllPrivateBalances(activeKey);
                console.log('[CardWalletProvider] Retry scan balances:', balances);
            }

            setCardBalances(balances);
            if (decryptedCardKey) scheduleAutoLock();
            return balances;
        } finally {
            console.groupEnd();
            setIsRefreshingBalances(false);
            if (shouldUseTempUnlock) {
                resetKeyMaterial(activeKey);
            }
        }
    };

    const pollCardBalancesUntilEmpty = async (activeKey: string, maxAttempts = 12, delayMs = 2500) => {
        let latestBalances: Record<BalanceKey, number> | null = null;

        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            setIsRefreshingBalances(true);
            try {
                latestBalances = await fetchAllPrivateBalances(activeKey);
                setCardBalances(latestBalances);
                if (!hasPositiveBalance(latestBalances)) {
                    return latestBalances;
                }
            } finally {
                setIsRefreshingBalances(false);
            }

            await sleep(delayMs);
        }

        return latestBalances;
    };

    const pollForFinalTransactionId = async (initialTxId: string): Promise<string> => {
        const primaryStatusReader = transactionStatus;
        const fallbackStatusReader = wallet?.adapter?.transactionStatus;
        const isShieldPendingId = initialTxId.startsWith('shield_');
        let isPending = true;
        let attempts = 0;
        let finalTransactionId = initialTxId;
        const maxAttempts = 120;
        let statusFailureCount = 0;
        let explorerNotFoundCount = 0;

        while (isPending && attempts < maxAttempts) {
            attempts += 1;
            await new Promise((resolve) => setTimeout(resolve, 1000));

            try {
                let currentStatus = '';
                let statusResponse: any = null;

                if (primaryStatusReader) {
                    try {
                        statusResponse = await primaryStatusReader(initialTxId);
                    } catch (error: any) {
                        statusFailureCount += 1;
                        if (!isShieldPendingId || statusFailureCount === 1 || statusFailureCount % 10 === 0) {
                            console.warn('[CardWalletProvider] Primary status polling attempt failed:', error?.message || error);
                        }
                    }
                }

                if (!statusResponse && fallbackStatusReader) {
                    try {
                        statusResponse = await fallbackStatusReader(initialTxId);
                    } catch (error: any) {
                        statusFailureCount += 1;
                        if (!isShieldPendingId || statusFailureCount === 1 || statusFailureCount % 10 === 0) {
                            console.warn('[CardWalletProvider] Fallback status polling attempt failed:', error?.message || error);
                        }
                    }
                }

                if (statusResponse) {
                    currentStatus = typeof statusResponse === 'string'
                        ? statusResponse.toLowerCase()
                        : statusResponse?.status?.toLowerCase();

                    if (typeof statusResponse === 'object' && statusResponse?.transactionId) {
                        finalTransactionId = statusResponse.transactionId;
                    }
                }

                if (!currentStatus && !finalTransactionId.startsWith('shield_') && primaryStatusReader) {
                    try {
                        const finalStatusResponse: any = await primaryStatusReader(finalTransactionId);
                        currentStatus = typeof finalStatusResponse === 'string'
                            ? finalStatusResponse.toLowerCase()
                            : finalStatusResponse?.status?.toLowerCase();
                    } catch (error: any) {
                        statusFailureCount += 1;
                        if (statusFailureCount === 1 || statusFailureCount % 10 === 0) {
                            console.warn('[CardWalletProvider] Final tx status polling attempt failed:', error?.message || error);
                        }
                    }
                }

                if (!currentStatus && !finalTransactionId.startsWith('shield_')) {
                    try {
                        const explorerResponse = await fetch(`https://api.explorer.provable.com/v1/testnet/transaction/${finalTransactionId}`);
                        if (explorerResponse.ok) {
                            currentStatus = 'completed';
                        } else if (explorerResponse.status === 404) {
                            explorerNotFoundCount += 1;
                        }
                    } catch (error: any) {
                        console.warn('[CardWalletProvider] Explorer polling attempt failed:', error?.message || error);
                    }
                }

                if (!currentStatus) {
                    if (isShieldPendingId && statusFailureCount >= 3 && attempts >= 8) {
                        return finalTransactionId;
                    }

                    if (!isShieldPendingId && statusFailureCount >= 3 && explorerNotFoundCount >= 3 && attempts >= 8) {
                        return finalTransactionId;
                    }

                    continue;
                }

                if (currentStatus !== 'pending' && currentStatus !== 'processing' && currentStatus !== 'submitted') {
                    isPending = false;

                    if (currentStatus === 'completed' || currentStatus === 'finalized' || currentStatus === 'accepted') {
                        return finalTransactionId;
                    }

                    throw new Error(`Transaction failed with status: ${currentStatus}`);
                }
            } catch (error: any) {
                if (typeof error?.message === 'string' && error.message.startsWith('Transaction failed with status:')) {
                    throw error;
                }
            }
        }

        return finalTransactionId;
    };

    const waitForCardRecordsFromTransaction = async (transactionId: string, cardPrivateKey: string): Promise<boolean> => {
        if (!transactionId || transactionId.startsWith('shield_') || !cardPrivateKey) {
            return false;
        }

        for (let attempt = 0; attempt < 8; attempt += 1) {
            try {
                const records = await fetchBurnerRecordsFromTx(transactionId, cardPrivateKey);
                if (records.length > 0) {
                    return true;
                }
            } catch (error) {
                console.warn('[CardWalletProvider] Card record confirmation failed:', error);
            }

            await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        return false;
    };

    const persistMirrorCard = async (
        ownerAddress: string,
        payload: {
            mainAddress: string;
            encryptedCardAddress: string;
            encryptedCardNumber: string;
            cardNumberHashHex: string;
            cardLast4: string;
            encryptedPrivateKey: string;
            cardKdfSalt: string;
            cardKdfAlgorithm: string;
            cardKdfParams: Record<string, unknown>;
            cardLabel: string;
            cardHint: string | null;
        }
    ) => {
        try {
            await upsertCardWallet(ownerAddress, {
                main_address: payload.mainAddress,
                card_address: payload.encryptedCardAddress,
                encrypted_card_number: payload.encryptedCardNumber,
                card_number_hash: payload.cardNumberHashHex,
                card_last4: payload.cardLast4,
                encrypted_card_private_key: payload.encryptedPrivateKey,
                card_kdf_salt: payload.cardKdfSalt,
                card_kdf_algorithm: payload.cardKdfAlgorithm,
                card_kdf_params: payload.cardKdfParams,
                card_label: payload.cardLabel,
                card_hint: payload.cardHint,
                limits: DEFAULT_CARD_LIMITS
            });
        } catch (error) {
            console.warn('[CardWalletProvider] Failed to persist card mirror after chain success', error);
        }
    };

    const createCard = async (pin: string, cardSecret: string, options: CreateCardOptions) => {
        if (!address || !executeTransaction) {
            throw new Error('Connect your main wallet first.');
        }
        if (!appPassword) {
            throw new Error('Unlock the app with your password before creating a card.');
        }

        validatePin(pin);
        validateCardSecret(cardSecret);
        validateCardLabel(options.label);
        const cardHint = normalizeCardHint(options.hint);

        const privateKey = new PrivateKey();
        const privateKeyString = privateKey.to_string();
        const cardAddress = privateKey.to_address().to_string();
        const cardNumber = generateVisaStyleCardNumber();
        const cardLast4 = normalizeCardNumber(cardNumber).slice(-4);
        const cardNumberHashHex = await hashAddress(cardNumber);
        const cardNumberHashField = sha256HexToField(cardNumberHashHex);
        const encrypted = await encryptCardPrivateKey(privateKeyString, pin, cardSecret);
        const encryptedCardAddress = await encryptWithPassword(cardAddress, appPassword);
        const encryptedCardNumber = await encryptWithPassword(cardNumber, appPassword);
        const encryptedCardLabel = await encryptWithPassword(options.label.trim(), appPassword);
        const encryptedCardHint = cardHint ? await encryptWithPassword(cardHint, appPassword) : null;

        const inputs = buildCreateCardRecordInputs({
            cardNumberHashField,
            encryptedCardNumber,
            encryptedCardAddress,
            encryptedLabel: encryptedCardLabel,
            encryptedHint: encryptedCardHint
        });

        try {
            const estimatedCreateCardFee = await estimateExecutionFee({
                programName: WALLET_PROGRAM_ID,
                functionName: 'create_card_profile',
                inputs,
                fallbackMicrocredits: DEFAULT_TOP_UP_FEE
            });
            const tx = await executeWithShieldRetry(
                () => executeTransaction({
                    program: WALLET_PROGRAM_ID,
                    function: 'create_card_profile',
                    inputs,
                    fee: estimatedCreateCardFee,
                    privateFee: false
                } as TransactionOptions),
                { onRetry: () => void 0 }
            );

            if (!tx?.transactionId) {
                throw new Error('The wallet did not return a transaction id for card creation.');
            }

            await persistMirrorCard(address, {
                mainAddress: address,
                encryptedCardAddress,
                encryptedCardNumber,
                cardNumberHashHex,
                cardLast4,
                encryptedPrivateKey: encrypted.encryptedPrivateKey,
                cardKdfSalt: encrypted.saltBase64,
                cardKdfAlgorithm: encrypted.kdfAlgorithm,
                cardKdfParams: encrypted.kdfParams as unknown as Record<string, unknown>,
                cardLabel: options.label.trim(),
                cardHint
            });

            await pollForFinalTransactionId(tx.transactionId);
            const finalizedCard = {
                address_hash: await hashAddress(address),
                main_owner: address,
                mainOwner: address,
                card_address: cardAddress,
                encrypted_card_address: encryptedCardAddress,
                card_number: cardNumber,
                encrypted_card_number: encryptedCardNumber,
                card_number_hash: cardNumberHashHex,
                card_number_hash_field: cardNumberHashField,
                card_last4: cardLast4,
                encrypted_card_private_key: encrypted.encryptedPrivateKey,
                card_kdf_salt: encrypted.saltBase64,
                card_kdf_algorithm: encrypted.kdfAlgorithm,
                card_kdf_params: encrypted.kdfParams as unknown as Record<string, unknown>,
                card_label: options.label.trim(),
                card_hint: cardHint,
                card_limits_updated_at: null,
                limits: DEFAULT_CARD_LIMITS
            };
            setCard(finalizedCard);
            setDecryptedCardKey(privateKeyString);
            scheduleAutoLock();
            await refreshCardBalances(pin, cardSecret, { retryOnZero: true });

            await persistMirrorCard(address, {
                mainAddress: address,
                encryptedCardAddress,
                encryptedCardNumber,
                cardNumberHashHex,
                cardLast4,
                encryptedPrivateKey: encrypted.encryptedPrivateKey,
                cardKdfSalt: encrypted.saltBase64,
                cardKdfAlgorithm: encrypted.kdfAlgorithm,
                cardKdfParams: encrypted.kdfParams as unknown as Record<string, unknown>,
                cardLabel: options.label.trim(),
                cardHint
            });

            return finalizedCard;
        } catch (err: any) {
            if (handleWalletError(err)) {
                throw err;
            }
            throw err;
        }
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
        const processRecord = async (record: any) => {
            let balance = getWalletRecordBalance(record, token);
            if (balance === 0 && record.recordCiphertext && !record.plaintext && decrypt) {
                try {
                    const decryptedRecord = await decrypt(record.recordCiphertext);
                    if (decryptedRecord) {
                        record.plaintext = decryptedRecord;
                        balance = getWalletRecordBalance(record, token);
                    }
                } catch {
                    return 0;
                }
            }

            return balance;
        };

        const locateSpendableRecord = async (records: any[]) => {
            let matchingRecord: any = null;
            let totalBalance = 0;

            for (const record of records) {
                if (record.spent) continue;
                const balance = await processRecord(record);
                totalBalance += balance;
                if (!matchingRecord && balance >= amountMicro) {
                    matchingRecord = record;
                }
            }

            return { matchingRecord, totalBalance };
        };

        let records = await requestRecords(programName, false);
        let { matchingRecord, totalBalance } = await locateSpendableRecord(records as any[]);

        if (!matchingRecord) {
            await new Promise((resolve) => window.setTimeout(resolve, 2000));
            records = await requestRecords(programName, false);
            ({ matchingRecord, totalBalance } = await locateSpendableRecord(records as any[]));
        }

        if (!matchingRecord) {
            if (totalBalance >= amountMicro) {
                throw new Error(`Your private ${token} balance is split across multiple records. Convert or merge records first.`);
            }
            throw new Error(`Insufficient private ${token} balance in the connected wallet.`);
        }

        return { matchingRecord, programName };
    };

    const topUpCard = async (token: CardTokenCode, amount: number, pin?: string, cardSecret?: string) => {
        if (!address || !executeTransaction || !card?.card_address) {
            throw new Error('Connect your main wallet and create a card first.');
        }

        const amountMicro = toMicroUnits(amount);
        if (amountMicro <= 0) {
            throw new Error('Top-up amount must be greater than zero.');
        }

        const currentKnownBalanceMicro = cardBalances
            ? toMicroUnits(cardBalances[TOKEN_TO_BALANCE_KEY[token]] || 0)
            : null;
        const maxBalance = card.limits[token].max_balance || 0;
        if (maxBalance > 0) {
            if (currentKnownBalanceMicro !== null && currentKnownBalanceMicro + amountMicro > maxBalance) {
                throw new Error(`This top-up would exceed your ${token} card balance cap.`);
            }
            if (currentKnownBalanceMicro === null && amountMicro > maxBalance) {
                throw new Error(`This top-up amount is larger than your ${token} card balance cap.`);
            }
        }

        const { matchingRecord, programName } = await findWalletRecord(token, amountMicro);
        let inputs: string[];
        const recordInput = getWalletRecordInput(matchingRecord);

        if (token === 'CREDITS') {
            inputs = [recordInput, card.card_address, `${amountMicro}u64`];
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
            inputs = [card.card_address, `${amountMicro}u128`, recordInput, `[${proof}, ${proof}]`];
        }

        const shouldUseTempUnlock = !decryptedCardKey && pin && cardSecret;
        const activeCardKey = decryptedCardKey || (shouldUseTempUnlock ? await unlockCard(pin!, cardSecret!, { persist: false }) : null);

        try {
            const estimatedTopUpFee = await estimateExecutionFee({
                programName,
                functionName: 'transfer_private',
                inputs,
                fallbackMicrocredits: DEFAULT_TOP_UP_FEE
            });
            const result = await executeWithShieldRetry(
                () => executeTransaction({
                    program: programName,
                    function: 'transfer_private',
                    inputs,
                    fee: estimatedTopUpFee,
                    privateFee: false
                }),
                { onRetry: () => void 0 }
            );

            if (!result?.transactionId) {
                throw new Error('The wallet did not return a transaction id for the top-up.');
            }

            const finalTransactionId = await pollForFinalTransactionId(result.transactionId);
            if (activeCardKey) {
                await waitForCardRecordsFromTransaction(finalTransactionId, activeCardKey);
            }

            [1500, 5000, 10000].forEach((delay) => {
                window.setTimeout(() => {
                    if (decryptedCardKey) {
                        refreshCardBalances(undefined, undefined, { retryOnZero: true }).catch(() => null);
                    } else if (pin && cardSecret) {
                        refreshCardBalances(pin, cardSecret, { retryOnZero: true }).catch(() => null);
                    }
                }, delay);
            });

            return finalTransactionId;
        } catch (err: any) {
            if (handleWalletError(err)) {
                throw err;
            }
            throw err;
        } finally {
            if (shouldUseTempUnlock && activeCardKey) {
                resetKeyMaterial(activeCardKey);
            }
        }
    };

    const requestCardLimitChange = async (token: CardTokenCode, nextLimits: CardLimitDraft) => {
        if (!address || !wallet?.adapter?.signMessage) {
            throw new Error('Main wallet signing is unavailable.');
        }
        if (!card) {
            throw new Error('Create your NullPay card first.');
        }

        let cardForLimitChange = card;

        if (appPassword) {
            const normalizedCardNumber = card.card_number ? normalizeCardNumber(card.card_number) : '';
            const encryptedCardAddress = card.encrypted_card_address
                || (card.card_address ? await encryptWithPassword(card.card_address, appPassword) : null);
            const encryptedCardNumber = card.encrypted_card_number
                || (normalizedCardNumber ? await encryptWithPassword(normalizedCardNumber, appPassword) : null);
            const cardNumberHash = card.card_number_hash
                || (normalizedCardNumber ? await hashAddress(normalizedCardNumber) : null);
            const cardLast4 = card.card_last4 || normalizedCardNumber.slice(-4) || null;

            if (encryptedCardAddress && encryptedCardNumber && cardNumberHash && cardLast4 && card.card_label) {
                await upsertCardWallet(address, {
                    main_address: address,
                    card_address: encryptedCardAddress,
                    encrypted_card_number: encryptedCardNumber,
                    card_number_hash: cardNumberHash,
                    card_last4: cardLast4,
                    encrypted_card_private_key: card.encrypted_card_private_key,
                    card_kdf_salt: card.card_kdf_salt,
                    card_kdf_algorithm: card.card_kdf_algorithm,
                    card_kdf_params: card.card_kdf_params,
                    card_label: card.card_label,
                    card_hint: card.card_hint || null,
                    limits: card.limits
                });

                cardForLimitChange = {
                    ...card,
                    card_number_hash: cardNumberHash,
                    card_last4: cardLast4,
                    encrypted_card_address: encryptedCardAddress,
                    encrypted_card_number: encryptedCardNumber
                };
            }
        }

        const sanitizedNextLimits: CardLimitDraft = {
            max_balance: Math.round(nextLimits.max_balance)
        };

        const message = buildLimitChangeMessage(cardForLimitChange, token, sanitizedNextLimits);
        const signatureResult = await wallet.adapter.signMessage(new TextEncoder().encode(message));
        const signatureBytes = signatureResult instanceof Uint8Array
            ? signatureResult
            : (signatureResult as any)?.signature;
        if (!signatureBytes) {
            throw new Error('Main wallet did not return a usable signature.');
        }
        const signatureBase64 = toBase64(signatureBytes);
        const nextCard = await submitCardLimitChange(address, address, message, signatureBase64);
        const normalizedCard = await normalizeDbCardProfile(nextCard);
        if (normalizedCard) {
            const mergedCard = card
                ? { ...card, ...normalizedCard, limits: normalizedCard.limits }
                : normalizedCard;
            setCard(mergedCard);
            return mergedCard;
        }
        throw new Error('Card limit update response was empty.');
    };

    const sweepCardFundsToMain = async (pin?: string, cardSecret?: string) => {
        if (!address || !card) {
            throw new Error('Connect your main wallet and create a card first.');
        }

        const shouldUseTempUnlock = !decryptedCardKey && pin && cardSecret;
        const activeCardKey = decryptedCardKey || (shouldUseTempUnlock ? await unlockCard(pin!, cardSecret!, { persist: false }) : null);
        if (!activeCardKey) {
            throw new Error('Unlock the card before sweeping funds.');
        }

        try {
            const latestBalances = await fetchAllPrivateBalances(activeCardKey);
            setCardBalances(latestBalances);
            const transfers: Array<{ currency: 'ALEO' | 'USDCx' | 'USAD'; amount: number }> = [];

            if ((latestBalances.ALEO || 0) > 0) {
                transfers.push({ currency: 'ALEO', amount: latestBalances.ALEO });
            }
            if ((latestBalances.USDCx || 0) > 0) {
                transfers.push({ currency: 'USDCx', amount: latestBalances.USDCx });
            }
            if ((latestBalances.USAD || 0) > 0) {
                transfers.push({ currency: 'USAD', amount: latestBalances.USAD });
            }

            if (transfers.length === 0) {
                throw new Error('This card has no private funds to sweep.');
            }

            const txIds: string[] = [];
            for (const transfer of transfers) {
                const result = await sweepBurnerFundsToDestination({
                    decryptedBurnerKey: activeCardKey,
                    amount: transfer.amount,
                    currency: transfer.currency,
                    destination: address
                });
                txIds.push(...result.txIds);
            }

            for (const txId of txIds) {
                await pollForFinalTransactionId(txId);
            }

            await pollCardBalancesUntilEmpty(activeCardKey);

            return txIds;
        } finally {
            if (shouldUseTempUnlock && activeCardKey) {
                resetKeyMaterial(activeCardKey);
            }
        }
    };

    const findCardProfileRecord = async () => {
        if (!card) {
            throw new Error('Create your NullPay card first.');
        }
        if (!requestRecords) {
            throw new Error('Wallet record access is unavailable.');
        }

        console.group('[CardWalletProvider] Locating on-chain card profile record for deletion');
        console.log('[CardWalletProvider] Card address:', card.card_address);
        console.log('[CardWalletProvider] Card hash hex:', card.card_number_hash);

        const records = await requestRecords(WALLET_PROGRAM_ID, true);
        const expectedHashField = card.card_number_hash_field
            || (card.card_number_hash ? sha256HexToField(card.card_number_hash) : null);

        console.log('[CardWalletProvider] Wallet program:', WALLET_PROGRAM_ID);
        console.log('[CardWalletProvider] requestRecords returned count:', Array.isArray(records) ? records.length : 0);
        console.log('[CardWalletProvider] Expected card hash field:', expectedHashField);

        if (!expectedHashField) {
            console.groupEnd();
            throw new Error('Card hash metadata is missing. Refresh the card and try again.');
        }

        for (const [index, record] of ((records as any[]) || []).entries()) {
            console.log(`[CardWalletProvider] Record[${index}] summary`, {
                spent: Boolean(record?.spent),
                hasPlaintext: Boolean(record?.plaintext),
                hasCiphertext: Boolean(record?.ciphertext),
                hasRecordCiphertext: Boolean(record?.recordCiphertext),
                id: record?.id || record?.recordId || null
            });
            if (record.spent) continue;

            let plaintext = record.plaintext;
            if (!plaintext && record.recordCiphertext && decrypt) {
                try {
                    plaintext = await decrypt(record.recordCiphertext);
                    console.log(`[CardWalletProvider] Record[${index}] decrypted successfully.`);
                } catch (error) {
                    console.warn(`[CardWalletProvider] Record[${index}] decrypt failed:`, error);
                    plaintext = undefined;
                }
            }

            const parsed = parseCardProfileRecord({ plaintext });
            if (!parsed) {
                if (plaintext) {
                    console.log(`[CardWalletProvider] Record[${index}] is not a card profile record.`, plaintext.slice(0, 220));
                }
                continue;
            }

            console.log(`[CardWalletProvider] Record[${index}] parsed card hash field:`, parsed.cardNumberHashField);

            const hashMatches = String(parsed.cardNumberHashField).trim() === String(expectedHashField).trim();
            const encryptedAddressMatches = Boolean(
                card.encrypted_card_address
                && parsed.encryptedCardAddress
                && String(parsed.encryptedCardAddress).trim() === String(card.encrypted_card_address).trim()
            );

            let decryptedAddressMatches = false;
            if (!hashMatches && !encryptedAddressMatches && appPassword && parsed.encryptedCardAddress && card.card_address) {
                try {
                    const decryptedParsedAddress = await decryptWithPassword(parsed.encryptedCardAddress, appPassword);
                    decryptedAddressMatches = decryptedParsedAddress === card.card_address;
                    console.log(`[CardWalletProvider] Record[${index}] decrypted parsed card address:`, decryptedParsedAddress);
                } catch (error) {
                    console.warn(`[CardWalletProvider] Record[${index}] failed to decrypt parsed encrypted_card_address:`, error);
                }
            }

            console.log(`[CardWalletProvider] Record[${index}] match status`, {
                hashMatches,
                encryptedAddressMatches,
                decryptedAddressMatches
            });

            if (hashMatches || encryptedAddressMatches || decryptedAddressMatches) {
                if (!hashMatches) {
                    console.warn(`[CardWalletProvider] Record[${index}] matched by card address fallback because the stored card hash field differs from the on-chain record.`);
                }
                console.log(`[CardWalletProvider] Record[${index}] matched expected card profile record.`);
                console.groupEnd();
                return plaintext || record.ciphertext || record.recordCiphertext || null;
            }
        }

        console.error('[CardWalletProvider] No matching unspent on-chain card profile record was found for deletion.');
        console.groupEnd();
        throw new Error('Could not locate an unspent on-chain card profile record.');
    };

    const deleteCard = async () => {
        if (!address || !executeTransaction || !wallet?.adapter?.signMessage) {
            throw new Error('Connect your main wallet first.');
        }
        if (!card) {
            throw new Error('Create your NullPay card first.');
        }

        console.group('[CardWalletProvider] Delete card flow start');
        console.log('[CardWalletProvider] Main address:', address);
        console.log('[CardWalletProvider] Card address:', card.card_address);
        console.log('[CardWalletProvider] Current scanned balances:', cardBalances);

        const message = buildCardDeletionMessage(card);
        console.log('[CardWalletProvider] Card deletion message payload:', message);
        const signatureResult = await wallet.adapter.signMessage(new TextEncoder().encode(message));
        const signatureBytes = signatureResult instanceof Uint8Array
            ? signatureResult
            : (signatureResult as any)?.signature;

        if (!signatureBytes) {
            console.groupEnd();
            throw new Error('Main wallet did not return a usable signature for card deletion.');
        }
        console.log('[CardWalletProvider] Card deletion message signed successfully.');

        const cardRecord = await findCardProfileRecord();
        const inputs = [cardRecord];
        console.log('[CardWalletProvider] delete_card_profile inputs prepared.');

        const estimatedDeleteFee = await estimateExecutionFee({
            programName: WALLET_PROGRAM_ID,
            functionName: 'delete_card_profile',
            inputs,
            fallbackMicrocredits: DEFAULT_TOP_UP_FEE
        });

        const result = await executeWithShieldRetry(
            () => executeTransaction({
                program: WALLET_PROGRAM_ID,
                function: 'delete_card_profile',
                inputs,
                fee: estimatedDeleteFee,
                privateFee: false
            } as TransactionOptions),
            { onRetry: () => void 0 }
        );

        if (!result?.transactionId) {
            console.groupEnd();
            throw new Error('The wallet did not return a transaction id for card deletion.');
        }

        console.log('[CardWalletProvider] Initial deletion transaction id:', result.transactionId);
        const finalTransactionId = await pollForFinalTransactionId(result.transactionId);
        console.log('[CardWalletProvider] Final deletion transaction id:', finalTransactionId);

        const signatureBase64 = toBase64(signatureBytes);
        console.log('[CardWalletProvider] Sending signed deletion confirmation to backend.');
        await deleteCardWalletEntry(address, address, message, signatureBase64, finalTransactionId);

        clearCachedCard(address);
        setCard(null);
        setCardBalances(null);
        lockCard();
        console.log('[CardWalletProvider] Card deletion completed successfully.');
        console.groupEnd();
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
                topUpCard,
                requestCardLimitChange,
                sweepCardFundsToMain,
                deleteCard
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
