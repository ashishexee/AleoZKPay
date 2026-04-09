import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import type { InvoiceData, InvoiceItem } from '../types/invoice';
import { useBurnerWallet } from './BurnerWalletProvider';
import { getUtf8ByteLength, LEO_MEMO_MAX_BYTES } from '../utils/leo-input-limits';
import { createInvoiceViaWallet } from '../utils/invoiceCreation';

export type InvoiceType = 'standard' | 'multipay' | 'donation';

export const useCreateInvoice = () => {
    const { address, executeTransaction, transactionStatus, requestTransactionHistory } = useWallet();
    const { decryptedBurnerAddress, appPassword } = useBurnerWallet();
    const publicKey = address;
    const [amount, setAmount] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);
    const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
    const [memo, setMemo] = useState('');
    const [status, setStatus] = useState('');
    const [invoiceType, setInvoiceType] = useState<InvoiceType>('standard');
    const [tokenType, setTokenType] = useState(0);
    const [walletType, setWalletType] = useState(0);
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [showItems, setShowItems] = useState(false);
    const [forSdk, setForSdk] = useState(false);

    useEffect(() => {
        if (walletType === 1 && forSdk) {
            setForSdk(false);
        }
    }, [walletType, forSdk]);

    useEffect(() => {
        if (invoiceType !== 'donation' && tokenType === 3) {
            setTokenType(0);
        }
    }, [invoiceType, tokenType]);

    const addItem = useCallback(() => {
        setItems((previous) => [...previous, { name: '', quantity: 1, unitPrice: 0, total: 0 }]);
    }, []);

    const updateItem = useCallback((index: number, field: keyof InvoiceItem, value: string | number) => {
        setItems((previous) => {
            const updated = [...previous];
            const item = { ...updated[index] };

            if (field === 'name') {
                item.name = value as string;
            } else if (field === 'quantity') {
                item.quantity = Number(value) || 0;
                item.total = item.quantity * item.unitPrice;
            } else if (field === 'unitPrice') {
                item.unitPrice = Number(value) || 0;
                item.total = item.quantity * item.unitPrice;
            }

            updated[index] = item;
            const total = updated.reduce((sum, entry) => sum + entry.total, 0);
            setAmount(total > 0 ? total : '');
            return updated;
        });
    }, []);

    const removeItem = useCallback((index: number) => {
        setItems((previous) => {
            const updated = previous.filter((_, itemIndex) => itemIndex !== index);
            const total = updated.reduce((sum, entry) => sum + entry.total, 0);
            setAmount(updated.length > 0 && total > 0 ? total : '');
            return updated;
        });
    }, []);

    const handleCreate = async () => {
        if (!publicKey || !executeTransaction || !transactionStatus) {
            setStatus('Wallet not fully supported or connected. Please update wallet.');
            return;
        }

        if (invoiceType !== 'donation' && (!amount || amount <= 0)) {
            setStatus('Please enter a valid amount.');
            return;
        }

        if (!appPassword) {
            setStatus('Application is locked. Please refresh and enter your password.');
            return;
        }

        if (memo && getUtf8ByteLength(memo) > LEO_MEMO_MAX_BYTES) {
            setStatus(`Memo is too long for one Leo field. Keep it within ${LEO_MEMO_MAX_BYTES} bytes.`);
            return;
        }

        setLoading(true);
        setStatus('Initializing invoice creation...');

        try {
            const result = await createInvoiceViaWallet({
                publicKey,
                executeTransaction,
                transactionStatus,
                requestTransactionHistory,
                amount: Number(amount),
                memo,
                invoiceType,
                tokenType,
                walletType,
                appPassword,
                decryptedBurnerAddress,
                forSdk,
                showItems,
                items,
                onStatus: setStatus
            });

            setInvoiceData(result.invoiceData);
            setStatus('Invoice Created Successfully!');
        } catch (error: any) {
            console.error(error);
            setStatus(`Error: ${error.message || 'Failed to create invoice'}`);
        } finally {
            setLoading(false);
        }
    };

    const resetInvoice = () => {
        setInvoiceData(null);
        setAmount('');
        setMemo('');
        setStatus('');
        setInvoiceType('standard');
        setTokenType(0);
        setWalletType(0);
        setItems([]);
        setShowItems(false);
        setForSdk(false);
    };

    return {
        amount,
        setAmount,
        memo,
        setMemo,
        status,
        loading,
        invoiceData,
        handleCreate,
        resetInvoice,
        publicKey,
        invoiceType,
        setInvoiceType,
        tokenType,
        setTokenType,
        walletType,
        setWalletType,
        items,
        showItems,
        setShowItems,
        forSdk,
        setForSdk,
        addItem,
        updateItem,
        removeItem
    };
};
