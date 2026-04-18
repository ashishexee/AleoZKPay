import type { TransactionOptions } from '@provablehq/aleo-types';
import { executeWithShieldRetry } from '../payments/shieldRetry';
import { createInvoice } from '../../services/api';
import { encryptWithPassword, hashAddress } from '../core/crypto';
import { estimateExecutionFee, generateSalt, getInvoiceHashFromMapping, PROGRAM_ID, stringToField } from '../aleo/aleoUtils';
import type { InvoiceData, InvoiceItem, PromptInvoiceType } from '../../types/invoice';


interface CreateInvoiceViaWalletParams {
    publicKey: string;
    executeTransaction: (transaction: TransactionOptions) => Promise<any>;
    transactionStatus: (transactionId: string) => Promise<any>;
    requestTransactionHistory?: ((programId: string) => Promise<any>) | undefined;
    amount: number;
    title?: string;
    memo?: string;
    invoiceType?: PromptInvoiceType;
    tokenType?: number;
    walletType?: number;
    appPassword: string;
    decryptedBurnerAddress?: string | null;
    forSdk?: boolean;
    showItems?: boolean;
    items?: InvoiceItem[];
    allowedTokens?: string[];
    onStatus?: (status: string) => void;
}

interface CreatedInvoiceResult {
    invoiceData: InvoiceData;
    txId: string;
    hash: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getInvoiceHashFromChain = async (finalTxId: string): Promise<string | null> => {
    const safeTxId = finalTxId.replace(/['"]+/g, '').trim();

    try {
        const response = await fetch(`https://api.explorer.aleo.org/v1/testnet3/transaction/${safeTxId}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        if (data?.execution?.transitions?.[0]?.outputs?.[0]?.value) {
            return data.execution.transitions[0].outputs[0].value;
        }
    } catch (error) {
        console.warn('Public chain fetch failed:', error);
    }

    return null;
};

const getInvoiceHashFromWallet = async (
    finalTxId: string,
    programId: string,
    requestTransactionHistory?: ((programId: string) => Promise<any>) | undefined
): Promise<string | null> => {
    const safeTxId = finalTxId.replace(/['"]+/g, '').trim();

    if (!requestTransactionHistory) {
        return null;
    }

    let attempts = 0;
    const maxRetries = 60;

    while (attempts < maxRetries) {
        try {
            const history = await requestTransactionHistory(programId);
            const foundTx = history.transactions.find((transaction: any) => transaction.transactionId === safeTxId || transaction.id === safeTxId);
            const executionOutput = foundTx?.execution?.transitions?.[0]?.outputs?.[0]?.value;

            if (executionOutput) {
                return executionOutput;
            }
        } catch (error: any) {
            if (
                error?.message?.includes('NOT_GRANTED') ||
                error?.message?.includes('Permission') ||
                error?.message?.includes('Wallet not connected')
            ) {
                return null;
            }
        }

        await sleep(2000);
        attempts += 1;
    }

    return null;
};

export const createInvoiceViaWallet = async ({
    publicKey,
    executeTransaction,
    transactionStatus,
    requestTransactionHistory,
    amount,
    title = '',
    memo = '',
    invoiceType = 'standard',
    tokenType = 0,
    walletType = 0,
    appPassword,
    decryptedBurnerAddress,
    forSdk = false,
    showItems = false,
    items = [],
    allowedTokens = [],
    onStatus
}: CreateInvoiceViaWalletParams): Promise<CreatedInvoiceResult> => {
    let salt = generateSalt();
    onStatus?.('Requesting wallet signature...');

    let typeInput = '0u8';
    if (invoiceType === 'multipay') typeInput = '1u8';
    else if (invoiceType === 'donation') typeInput = '2u8';

    const isDonation = invoiceType === 'donation';
    const amountMicro = isDonation ? 0 : Math.round(Number(amount) * 1_000_000);
    if (!isDonation && tokenType === 3) {
        throw new Error('Any-token invoices are donation-only.');
    }

    let functionName = 'create_invoice';
    let amountInput = `${amountMicro}u64`;

    if (tokenType === 1) {
        functionName = 'create_invoice_usdcx';
        amountInput = `${amountMicro}u128`;
    } else if (tokenType === 2) {
        functionName = 'create_invoice_usad';
        amountInput = `${amountMicro}u128`;
    } else if (tokenType === 3) {
        functionName = 'create_invoice_any';
        amountInput = `${amountMicro}u128`;
    }

    const titleField = title ? stringToField(title) : '0field';
    const memoField = memo ? stringToField(memo) : '0field';
    const merchantAddress = walletType === 1 && decryptedBurnerAddress && !forSdk
        ? decryptedBurnerAddress
        : publicKey;

    const inputs = [
        merchantAddress,
        amountInput,
        salt,
        titleField,
        memoField,
        '0u32',
        typeInput,
        `${walletType}u8`
    ];

    const estimatedFee = await estimateExecutionFee({
        programName: PROGRAM_ID,
        functionName,
        inputs,
        fallbackMicrocredits: 100_000
    });

    const transaction: TransactionOptions = {
        program: PROGRAM_ID,
        function: functionName,
        inputs,
        fee: estimatedFee,
        privateFee: false
    };

    const result = await executeWithShieldRetry(
        () => executeTransaction(transaction),
        { onRetry: () => onStatus?.('Shield Wallet gave no response. Retrying invoice creation request...') }
    );

    const initialTxId = result?.transactionId || '';
    if (!initialTxId) {
        throw new Error('Failed to get transaction ID from wallet.');
    }

    onStatus?.('Transaction broadcasted. Waiting for on-chain confirmation...');

    let isPending = true;
    let finalTransactionId = initialTxId;
    let attempts = 0;
    const maxAttempts = 120;
    let hashFromStatus: string | null = null;

    while (isPending && attempts < maxAttempts) {
        attempts += 1;
        await sleep(1000);

        try {
            const statusResponse = await transactionStatus(initialTxId);
            const currentStatus = typeof statusResponse === 'string'
                ? statusResponse.toLowerCase()
                : statusResponse?.status?.toLowerCase();

            if (typeof statusResponse === 'object' && statusResponse?.transactionId) {
                finalTransactionId = statusResponse.transactionId;
            }

            if (statusResponse?.execution?.transitions?.[0]?.outputs?.[0]?.value) {
                hashFromStatus = statusResponse.execution.transitions[0].outputs[0].value;
            }

            if (currentStatus && currentStatus !== 'pending' && currentStatus !== 'processing' && currentStatus !== 'submitted') {
                isPending = false;

                if (currentStatus !== 'completed' && currentStatus !== 'finalized' && currentStatus !== 'accepted') {
                    throw new Error(`Transaction failed with status: ${currentStatus}`);
                }
            }
        } catch (error) {
            console.warn('Error polling invoice status:', error);
        }
    }

    if (isPending) {
        throw new Error('Transaction polling timed out.');
    }

    onStatus?.('Wallet approved. Resolving invoice hash...');

    let hash = hashFromStatus;
    if (!hash) {
        for (let attempts = 0; attempts < 5 && !hash; attempts += 1) {
            hash = await getInvoiceHashFromMapping(salt);
            if (!hash) {
                await sleep(2000);
            }
        }
    }

    if (!hash) {
        hash = await getInvoiceHashFromWallet(finalTransactionId, PROGRAM_ID, requestTransactionHistory);
    }

    if (!hash) {
        await sleep(2000);
        hash = await getInvoiceHashFromChain(finalTransactionId);
    }

    if (!hash) {
        throw new Error('Could not retrieve invoice hash from wallet execution.');
    }

    onStatus?.('Invoice hash resolved. Saving invoice metadata...');

    let dbInvoiceType = 0;
    if (invoiceType === 'multipay') dbInvoiceType = 1;
    if (invoiceType === 'donation') dbInvoiceType = 2;

    const encryptedMerchant = await encryptWithPassword(merchantAddress, appPassword);
    const merchantHash = await hashAddress(merchantAddress);

    await createInvoice({
        invoice_hash: hash,
        merchant_address: encryptedMerchant,
        merchant_address_hash: merchantHash,
        designated_address: encryptedMerchant,
        status: 'PENDING',
        invoice_transaction_id: finalTransactionId,
        salt,
        invoice_type: dbInvoiceType,
        token_type: tokenType,
        is_burner: walletType === 1 && !forSdk,
        for_sdk: forSdk,
        invoice_items: showItems && items.length > 0 ? items : undefined,
        allowed_tokens: allowedTokens && allowedTokens.length > 0 ? allowedTokens : undefined,
    });

    const params = new URLSearchParams({
        merchant: merchantAddress,
        amount: amount.toString(),
        salt
    });
    if (title) params.append('title', title);
    if (memo) params.append('memo', memo);
    if (invoiceType === 'multipay') params.append('type', 'multipay');
    if (invoiceType === 'donation') params.append('type', 'donation');
    if (tokenType === 1) params.append('token', 'usdcx');
    if (tokenType === 2) params.append('token', 'usad');
    if (tokenType === 3) params.append('token', 'any');

    const invoiceData: InvoiceData = {
        merchant: merchantAddress,
        amount: Number(amount),
        salt,
        hash,
        link: `${window.location.origin}/pay?${params.toString()}`,
        title,
        type: dbInvoiceType
    };

    onStatus?.('Invoice created successfully.');

    return {
        invoiceData,
        txId: finalTransactionId,
        hash
    };
};
