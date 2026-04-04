import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { TransactionOptions } from '@provablehq/aleo-types';
import { Account, PrivateKey, AleoNetworkClient, AleoKeyProvider, ProgramManager, NetworkRecordProvider } from '@provablehq/sdk';
import {
    type CardTokenCode,
    type CardWalletProfile,
    getCardWallet,
    submitCardLimitChange,
    upsertCardWallet
} from '../services/api';
import { executeWithShieldRetry } from '../utils/shieldRetry';
import { decryptCardPrivateKey, encryptCardPrivateKey, type CardKdfAlgorithm } from '../utils/card-crypto';
import { decryptWithPassword, encryptWithPassword, hashAddress } from '../utils/crypto';
import {
    CARD_STATUS_ACTIVE,
    CARD_STATUS_FROZEN,
    buildCardStatusInputs,
    buildCreateCardRecordInputs,
    fetchOnChainCardLookup,
    parseCardProfileRecord,
    sha256HexToField
} from '../utils/card-chain';
import { PROGRAM_ID } from '../utils/aleo-utils';
import { fetchAllPrivateBalances } from '../pages/Profile/components/BurnerWallet/scanner';
import { useWalletErrorHandler } from './Wallet/WalletErrorBoundary';
import { useBurnerWallet } from './BurnerWalletProvider';

type BalanceKey = 'ALEO' | 'USDCx' | 'USAD';

interface CardLimitDraft {
    max_balance: number;
}

interface CreateCardOptions {
    label: string;
    hint?: string;
}

interface CardStatusUpdateOptions {
    pin?: string;
    cardSecret?: string;
    preferCardCredentials?: boolean;
}

interface CardWalletContextValue {
    card: CardWalletProfile | null;
    isLoading: boolean;
    isUnlocked: boolean;
    decryptedCardKey: string | null;
    cardBalances: Record<BalanceKey, number> | null;
    isRefreshingBalances: boolean;
    isStatusChangePending: boolean;
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
    updateCardStatus: (
        nextStatus: typeof CARD_STATUS_ACTIVE | typeof CARD_STATUS_FROZEN,
        options?: CardStatusUpdateOptions
    ) => Promise<string>;
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
        token,
        previous_limits: {
            max_balance: card.limits[token].max_balance
        },
        next_limits: nextLimits,
        nonce: window.crypto.randomUUID(),
        timestamp: new Date().toISOString()
    });
}

function hasPositiveBalance(balances: Record<BalanceKey, number>) {
    return Object.values(balances).some((value) => value > 0);
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
    const { address, wallet, executeTransaction, requestRecords, decrypt } = useWallet();
    const { handleWalletError } = useWalletErrorHandler();
    const { appPassword } = useBurnerWallet();
    const [card, setCard] = useState<CardWalletProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [decryptedCardKey, setDecryptedCardKey] = useState<string | null>(null);
    const [cardBalances, setCardBalances] = useState<Record<BalanceKey, number> | null>(null);
    const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);
    const [isStatusChangePending, setIsStatusChangePending] = useState(false);
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

    const hydrateCardFromChain = async (dbFallback?: CardWalletProfile | null): Promise<CardWalletProfile | null> => {
        if (!address || !requestRecords) {
            return null;
        }

        try {
            const records = await requestRecords(PROGRAM_ID, true);
            if (!records || (records as any[]).length === 0) {
                return null;
            }

            const addressHash = await hashAddress(address);
            for (const record of records as any[]) {
                let plaintext = record.plaintext;
                const ciphertext = record.recordCiphertext || record.ciphertext;
                if (!plaintext && ciphertext && decrypt) {
                    try {
                        plaintext = await decrypt(ciphertext);
                    } catch {
                        continue;
                    }
                }

                const parsed = parseCardProfileRecord({ plaintext });
                if (!parsed) {
                    continue;
                }

                const lookup = await fetchOnChainCardLookup(parsed.cardNumberHashField);
                if (!lookup) {
                    continue;
                }

                if (lookup.mainOwner && lookup.mainOwner !== address) {
                    continue;
                }

                const decryptedCardNumber = await normalizeMaybeEncryptedValue(
                    parsed.encryptedCardNumber,
                    appPassword,
                    (value) => /^\d{16}$/.test(value)
                );
                const decryptedCardAddress = await normalizeMaybeEncryptedValue(
                    parsed.encryptedCardAddress,
                    appPassword,
                    (value) => value.startsWith('aleo1')
                );
                const decryptedLabel = await normalizeMaybeEncryptedValue(
                    parsed.encryptedLabel,
                    appPassword,
                    () => false
                );
                const decryptedHint = await normalizeMaybeEncryptedValue(
                    parsed.encryptedHint,
                    appPassword,
                    () => false
                );

                const mirrorCardNumber = dbFallback?.card_number || dbFallback?.encrypted_card_number || null;
                const cardNumber = decryptedCardNumber || (mirrorCardNumber && /^\d{16}$/.test(mirrorCardNumber) ? mirrorCardNumber : null);
                const cardAddress = decryptedCardAddress || lookup.cardAddress || dbFallback?.card_address || '';
                const cardLast4 = normalizeCardNumber(cardNumber || '').slice(-4) || dbFallback?.card_last4 || null;

                return {
                    address_hash: dbFallback?.address_hash || addressHash,
                    card_address: cardAddress,
                    encrypted_card_address: parsed.encryptedCardAddress || null,
                    card_number: cardNumber,
                    encrypted_card_number: parsed.encryptedCardNumber || null,
                    card_number_hash: dbFallback?.card_number_hash || null,
                    card_number_hash_field: parsed.cardNumberHashField,
                    card_last4: cardLast4,
                    encrypted_card_private_key: lookup.encryptedCardPrivateKey,
                    card_kdf_salt: lookup.cardKdfSalt,
                    card_kdf_algorithm: lookup.cardKdfAlgorithm,
                    card_kdf_params: lookup.cardKdfParams as unknown as Record<string, unknown>,
                    card_status: lookup.cardStatus,
                    card_label: decryptedLabel || dbFallback?.card_label || 'NullPay Card',
                    card_hint: decryptedHint || dbFallback?.card_hint || null,
                    card_limits_updated_at: dbFallback?.card_limits_updated_at || null,
                    limits: dbFallback?.limits || DEFAULT_CARD_LIMITS
                };
            }
        } catch (error) {
            console.warn('[CardWalletProvider] On-chain card bootstrap failed', error);
        }

        return null;
    };

    const waitForChainCard = async (cardNumberHashField: string): Promise<CardWalletProfile | null> => {
        const dbFallback = await fetchMirrorCard();

        for (let attempt = 0; attempt < 20; attempt += 1) {
            const chainCard = await hydrateCardFromChain(dbFallback);
            if (chainCard?.card_number_hash_field === cardNumberHashField) {
                return chainCard;
            }
            await new Promise((resolve) => window.setTimeout(resolve, 1500));
        }

        return null;
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
            const dbFallback = await fetchMirrorCard();
            const chainCard = await hydrateCardFromChain(dbFallback);
            setCardState(chainCard || dbFallback || null);
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
            return cardBalances;
        }

        try {
            setIsRefreshingBalances(true);
            let balances = await fetchAllPrivateBalances(activeKey);

            if (options?.retryOnZero && !hasPositiveBalance(balances)) {
                await new Promise((resolve) => window.setTimeout(resolve, 1500));
                balances = await fetchAllPrivateBalances(activeKey);
            }

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

    const pollForFinalTransactionId = async (initialTxId: string): Promise<string> => {
        const statusReader = wallet?.adapter?.transactionStatus;
        if (!statusReader) {
            return initialTxId;
        }

        let isPending = true;
        let attempts = 0;
        let finalTransactionId = initialTxId;
        const maxAttempts = 120;

        while (isPending && attempts < maxAttempts) {
            attempts += 1;
            await new Promise((resolve) => setTimeout(resolve, 1000));

            try {
                const statusResponse: any = await statusReader(initialTxId);
                const currentStatus = typeof statusResponse === 'string'
                    ? statusResponse.toLowerCase()
                    : statusResponse?.status?.toLowerCase();

                if (typeof statusResponse === 'object' && statusResponse?.transactionId) {
                    finalTransactionId = statusResponse.transactionId;
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
                console.warn('[CardWalletProvider] Status polling attempt failed:', error?.message || error);
            }
        }

        return finalTransactionId;
    };

    const pollSponsoredTransactionFinality = async (initialTxId: string): Promise<string> => {
        for (let attempt = 0; attempt < 120; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            try {
                const res = await fetch(`https://api.explorer.provable.com/v1/testnet/transaction/${initialTxId}`);
                if (res.ok) {
                    return initialTxId;
                }
            } catch {
                // Keep polling until explorer sees the transaction.
            }
        }
        throw new Error('Timed out waiting for on-chain confirmation.');
    };

    const persistMirrorCard = async (
        ownerAddress: string,
        payload: {
            encryptedMainAddress: string;
            encryptedCardAddress: string;
            encryptedCardNumber: string;
            cardNumberHashHex: string;
            cardLast4: string;
            encryptedPrivateKey: string;
            cardKdfSalt: string;
            cardKdfAlgorithm: string;
            cardKdfParams: Record<string, unknown>;
            cardStatus: string;
            cardLabel: string;
            cardHint: string | null;
        }
    ) => {
        try {
            await upsertCardWallet(ownerAddress, {
                main_address: payload.encryptedMainAddress,
                card_address: payload.encryptedCardAddress,
                encrypted_card_number: payload.encryptedCardNumber,
                card_number_hash: payload.cardNumberHashHex,
                card_last4: payload.cardLast4,
                encrypted_card_private_key: payload.encryptedPrivateKey,
                card_kdf_salt: payload.cardKdfSalt,
                card_kdf_algorithm: payload.cardKdfAlgorithm,
                card_kdf_params: payload.cardKdfParams,
                card_status: payload.cardStatus,
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
        const encryptedMainAddress = await encryptWithPassword(address, appPassword);

        const inputs = buildCreateCardRecordInputs({
            cardAddress,
            cardNumberHashField,
            encryptedCardPrivateKey: encrypted.encryptedPrivateKey,
            cardKdfSalt: encrypted.saltBase64,
            cardKdfAlgorithm: encrypted.kdfAlgorithm,
            cardKdfParams: encrypted.kdfParams,
            encryptedCardNumber,
            encryptedCardAddress,
            encryptedLabel: encryptedCardLabel,
            encryptedHint: encryptedCardHint
        });

        try {
            setIsLoading(true);
            const tx = await executeWithShieldRetry(
                () => executeTransaction({
                    program: PROGRAM_ID,
                    function: 'create_card_profile',
                    inputs,
                    fee: DEFAULT_TOP_UP_FEE,
                    privateFee: false
                } as TransactionOptions),
                { onRetry: () => void 0 }
            );

            if (!tx?.transactionId) {
                throw new Error('The wallet did not return a transaction id for card creation.');
            }

            await pollForFinalTransactionId(tx.transactionId);
            const chainCard = await waitForChainCard(cardNumberHashField);
            if (!chainCard) {
                throw new Error('Card publish succeeded, but the on-chain card record is not readable yet. Please retry in a moment.');
            }

            const finalizedCard = {
                ...chainCard,
                card_number_hash: cardNumberHashHex
            };
            setCard(finalizedCard);
            setDecryptedCardKey(privateKeyString);
            scheduleAutoLock();
            await refreshCardBalances(pin, cardSecret, { retryOnZero: true });

            await persistMirrorCard(address, {
                encryptedMainAddress,
                encryptedCardAddress,
                encryptedCardNumber,
                cardNumberHashHex,
                cardLast4,
                encryptedPrivateKey: encrypted.encryptedPrivateKey,
                cardKdfSalt: encrypted.saltBase64,
                cardKdfAlgorithm: encrypted.kdfAlgorithm,
                cardKdfParams: encrypted.kdfParams as unknown as Record<string, unknown>,
                cardStatus: CARD_STATUS_ACTIVE,
                cardLabel: options.label.trim(),
                cardHint
            });

            return finalizedCard;
        } catch (err: any) {
            if (handleWalletError(err)) {
                throw err;
            }
            throw err;
        } finally {
            setIsLoading(false);
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
        if (card.card_status === CARD_STATUS_FROZEN) {
            throw new Error('This card is frozen. Unfreeze it before topping up.');
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

        try {
            const result = await executeWithShieldRetry(
                () => executeTransaction({
                    program: programName,
                    function: 'transfer_private',
                    inputs,
                    fee: DEFAULT_TOP_UP_FEE,
                    privateFee: false
                }),
                { onRetry: () => void 0 }
            );

            if (!result?.transactionId) {
                throw new Error('The wallet did not return a transaction id for the top-up.');
            }

            const finalTransactionId = await pollForFinalTransactionId(result.transactionId);

            window.setTimeout(() => {
                if (decryptedCardKey) {
                    refreshCardBalances(undefined, undefined, { retryOnZero: true }).catch(() => null);
                } else if (pin && cardSecret) {
                    refreshCardBalances(pin, cardSecret, { retryOnZero: true }).catch(() => null);
                }
            }, 1500);

            return finalTransactionId;
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
            max_balance: Math.round(nextLimits.max_balance)
        };

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
        const normalizedCard = await normalizeDbCardProfile(nextCard);
        if (normalizedCard) {
            setCard((current) => current ? { ...current, ...normalizedCard, limits: normalizedCard.limits } : normalizedCard);
            return normalizedCard;
        }
        throw new Error('Card limit update response was empty.');
    };

    const persistCardStatusMirror = async (nextStatus: string) => {
        if (!address || !card) {
            return;
        }

        try {
            await upsertCardWallet(address, {
                card_status: nextStatus
            });
        } catch (error) {
            console.warn('[CardWalletProvider] Failed to mirror card status update', error);
        }
    };

    const updateCardStatus = async (
        nextStatus: typeof CARD_STATUS_ACTIVE | typeof CARD_STATUS_FROZEN,
        options?: CardStatusUpdateOptions
    ) => {
        const cardNumberHashField = card?.card_number_hash_field;
        if (!cardNumberHashField) {
            throw new Error('Card lookup hash is unavailable.');
        }

        setIsStatusChangePending(true);
        try {
            let finalTxId = '';
            const shouldUseCardCredentials = Boolean(options?.preferCardCredentials || decryptedCardKey || (options?.pin && options?.cardSecret));

            if (shouldUseCardCredentials) {
                const temporaryUnlock = !decryptedCardKey && options?.pin && options?.cardSecret;
                const activeKey = decryptedCardKey || await unlockCard(options!.pin!, options!.cardSecret!, { persist: false });

                try {
                    const host = 'https://api.explorer.provable.com/v1';
                    const networkClient = new AleoNetworkClient(host);
                    const keyProvider = new AleoKeyProvider();
                    keyProvider.useCache(true);
                    const account = new Account({ privateKey: activeKey });
                    const recordProvider = new NetworkRecordProvider(account, networkClient);
                    const programManager = new ProgramManager(host, keyProvider, recordProvider);
                    programManager.setAccount(account);

                    const authorization = await programManager.buildAuthorization({
                        programName: PROGRAM_ID,
                        functionName: 'set_card_status',
                        inputs: buildCardStatusInputs(cardNumberHashField, nextStatus)
                    });

                    const API_URL = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
                    const sponsorRes = await fetch(`${API_URL}/dps/sponsor-sweep`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            execution_authorization_string: authorization.toString(),
                            programName: PROGRAM_ID
                        })
                    });
                    const response = await sponsorRes.json();
                    if (!sponsorRes.ok) {
                        throw new Error(response?.error || response?.message || 'Card status sponsorship failed.');
                    }

                    const initialTxId = response.transaction?.id || response.transactionId || '';
                    if (!initialTxId) {
                        throw new Error('The relayer did not return a transaction id for card status change.');
                    }
                    finalTxId = await pollSponsoredTransactionFinality(initialTxId);
                } finally {
                    if (temporaryUnlock) {
                        resetKeyMaterial(activeKey);
                    } else if (decryptedCardKey) {
                        scheduleAutoLock();
                    }
                }
            } else {
                if (!executeTransaction) {
                    throw new Error('Main wallet transaction support is unavailable.');
                }

                const tx = await executeWithShieldRetry(
                    () => executeTransaction({
                        program: PROGRAM_ID,
                        function: 'set_card_status',
                        inputs: buildCardStatusInputs(cardNumberHashField, nextStatus),
                        fee: DEFAULT_TOP_UP_FEE,
                        privateFee: false
                    }),
                    { onRetry: () => void 0 }
                );

                if (!tx?.transactionId) {
                    throw new Error('The wallet did not return a transaction id for card status change.');
                }
                finalTxId = await pollForFinalTransactionId(tx.transactionId);
            }

            setCard((current) => current ? { ...current, card_status: nextStatus } : current);
            await persistCardStatusMirror(nextStatus);
            return finalTxId;
        } catch (err: any) {
            if (handleWalletError(err)) {
                throw err;
            }
            throw err;
        } finally {
            setIsStatusChangePending(false);
        }
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
                isStatusChangePending,
                createCard,
                unlockCard,
                lockCard,
                refreshCard,
                refreshCardBalances,
                topUpCard,
                requestCardLimitChange,
                updateCardStatus
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
