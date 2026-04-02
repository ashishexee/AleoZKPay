import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { PrivateKey } from '@provablehq/sdk';
import {
    CardTokenCode,
    CardWalletProfile,
    getCardWallet,
    submitCardLimitChange,
    upsertCardWallet
} from '../services/api';
import { encryptCardPrivateKey, decryptCardPrivateKey, type CardKdfAlgorithm } from '../utils/card-crypto';
import { decryptWithPassword, encryptWithPassword, hashAddress } from '../utils/crypto';
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
        max_balance: 25_000_000
    },
    USDCX: {
        max_balance: 25_000_000
    },
    USAD: {
        max_balance: 25_000_000
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
    // Strings are immutable in JS, so we only drop references here.
    void value;
}

function buildLimitChangeMessage(card: CardWalletProfile, token: CardTokenCode, nextLimits: CardLimitDraft) {
    return JSON.stringify({
        action: 'nullpay_card_limit_change_v1',
        card_address: card.encrypted_card_address || card.card_address,
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

    const normalizeCardProfile = async (profile: CardWalletProfile | null): Promise<CardWalletProfile | null> => {
        if (!profile) {
            return null;
        }

        const encryptedCardAddress = profile.card_address || null;
        const encryptedCardNumber = profile.encrypted_card_number || null;

        const decryptClientValue = async (encryptedValue: string | null, testPlaintext: (value: string) => boolean) => {
            if (!encryptedValue) {
                return '';
            }

            if (testPlaintext(encryptedValue)) {
                return encryptedValue;
            }

            if (!appPassword) {
                return '';
            }

            try {
                return await decryptWithPassword(encryptedValue, appPassword);
            } catch (error) {
                console.warn('Could not decrypt card value for local use', error);
                return '';
            }
        };

        const decryptedCardAddress = await decryptClientValue(encryptedCardAddress, (value) => value.startsWith('aleo1'));
        const decryptedCardNumber = await decryptClientValue(encryptedCardNumber, (value) => /^\d{16}$/.test(value));

        return {
            ...profile,
            encrypted_card_address: encryptedCardAddress,
            encrypted_card_number: encryptedCardNumber,
            card_address: decryptedCardAddress,
            card_number: decryptedCardNumber
        };
    };

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
            const fetchedCard = await getCardWallet(address);
            const nextCard = await normalizeCardProfile(fetchedCard);
            setCard(nextCard);
            if (!fetchedCard) {
                setCardBalances(null);
                lockCard();
            }
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
        const statusReader = transactionStatus || wallet?.adapter?.transactionStatus;
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
                const statusResponse = await statusReader(initialTxId);
                const currentStatus = typeof (statusResponse as any) === 'string'
                    ? ((statusResponse as any) as string).toLowerCase()
                    : (statusResponse as any)?.status?.toLowerCase();

                if (typeof statusResponse === 'object' && (statusResponse as any)?.transactionId) {
                    finalTransactionId = (statusResponse as any).transactionId;
                }

                if (currentStatus !== 'pending' && currentStatus !== 'processing' && currentStatus !== 'submitted') {
                    isPending = false;

                    if (currentStatus === 'completed' || currentStatus === 'finalized' || currentStatus === 'accepted') {
                        return finalTransactionId;
                    }

                    throw new Error(`Top-up transaction failed with status: ${currentStatus}`);
                }
            } catch (error: any) {
                if (typeof error?.message === 'string' && error.message.startsWith('Top-up transaction failed with status:')) {
                    throw error;
                }
                console.warn('[CardWalletProvider] Top-up status polling attempt failed:', error?.message || error);
            }
        }

        return finalTransactionId;
    };

    const createCard = async (pin: string, cardSecret: string, options: CreateCardOptions) => {
        if (!address) {
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
        const cardLast4 = normalizeCardNumber(cardNumber).slice(-4) || generateCardLast4();
        const cardNumberHash = await hashAddress(cardNumber);
        const encrypted = await encryptCardPrivateKey(privateKeyString, pin, cardSecret);
        const encryptedCardAddress = await encryptWithPassword(cardAddress, appPassword);
        const encryptedCardNumber = await encryptWithPassword(cardNumber, appPassword);
        const encryptedMainAddress = await encryptWithPassword(address, appPassword);

        const savedCardRaw = await upsertCardWallet(address, {
            main_address: encryptedMainAddress,
            card_address: encryptedCardAddress,
            encrypted_card_number: encryptedCardNumber,
            card_number_hash: cardNumberHash,
            card_last4: cardLast4,
            encrypted_card_private_key: encrypted.encryptedPrivateKey,
            card_kdf_salt: encrypted.saltBase64,
            card_kdf_algorithm: encrypted.kdfAlgorithm,
            card_kdf_params: encrypted.kdfParams as unknown as Record<string, unknown>,
            card_status: 'ACTIVE',
            card_label: options.label.trim(),
            card_hint: cardHint,
            limits: DEFAULT_CARD_LIMITS
        });

        const savedCard = await normalizeCardProfile(savedCardRaw);
        if (!savedCard) {
            throw new Error('Card wallet could not be loaded after creation.');
        }

        setCard(savedCard);
        setDecryptedCardKey(privateKeyString);
        scheduleAutoLock();
        await refreshCardBalances(pin, cardSecret);
        return savedCard;
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
                    const decrypted = await decrypt(record.recordCiphertext);
                    if (decrypted) {
                        record.plaintext = decrypted;
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
                topUpCard,
                requestCardLimitChange
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
