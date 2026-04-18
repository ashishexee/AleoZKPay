import { AleoKeyProvider, AleoNetworkClient, NetworkRecordProvider, ProgramManager } from '@provablehq/sdk';
import { getScannerSession, listSpendableRecords } from '../pages/Profile/components/BurnerWallet/scanner';

import { BurnerSweepCurrency } from '../types/tokens';

interface SweepBurnerFundsParams {
    decryptedBurnerKey: string;
    amount: number;
    currency: BurnerSweepCurrency;
    destination: string;
    onStatus?: (status: string) => void;
    onLog?: (message: string) => void;
}

interface SweepBurnerFundsResult {
    txIds: string[];
    amount: number;
    currency: BurnerSweepCurrency;
}

const emit = (message: string, onStatus?: (status: string) => void, onLog?: (message: string) => void) => {
    onStatus?.(message);
    onLog?.(message);
};

export const sweepBurnerFundsToDestination = async ({
    decryptedBurnerKey,
    amount,
    currency,
    destination,
    onStatus,
    onLog
}: SweepBurnerFundsParams): Promise<SweepBurnerFundsResult> => {
    if (!decryptedBurnerKey) {
        throw new Error('Burner wallet must be unlocked to sweep funds.');
    }
    if (!destination) {
        throw new Error('Destination address is required.');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Sweep amount must be greater than zero.');
    }

    emit(`Preparing ${currency} sweep from burner wallet...`, onStatus, onLog);

    const host = 'https://api.explorer.provable.com/v1';
    const networkClient = new AleoNetworkClient(host);
    const keyProvider = new AleoKeyProvider();
    keyProvider.useCache(true);

    emit('Authenticating with Record Scanner...', onStatus, onLog);
    const session = await getScannerSession(decryptedBurnerKey);
    emit(`Scanner registered. UUID: ${session.scannerUuid.substring(0, 20)}...`, onStatus, onLog);

    const recordProvider = new NetworkRecordProvider(session.account, networkClient);
    const programManager = new ProgramManager(host, keyProvider, recordProvider);
    programManager.setAccount(session.account);

    const microsRequired = Math.round(amount * 1_000_000);
    let programName: string;
    const functionName = 'transfer_private';
    let proofsInput = '';
    let spendableRecords: Array<{ plaintext: string; microcredits: number }> = [];

    if (currency === 'ALEO') {
        programName = 'credits.aleo';
        emit(`Scanning burner wallet for private ${currency} records...`, onStatus, onLog);
        spendableRecords = await listSpendableRecords(session, programName, 'credits', true);
    } else {
        programName = currency === 'USDCx' ? 'test_usdcx_stablecoin.aleo' : 'test_usad_stablecoin.aleo';

        emit(`Generating compliance proofs for ${currency} sweep...`, onStatus, onLog);
        const { generateFreezeListProof, getFreezeListIndex } = await import('./aleo-utils');
        const { Address } = await import('@provablehq/wasm');
        const firstIndex = await getFreezeListIndex(0);
        let index0FieldStr: string | undefined;
        if (firstIndex) {
            try {
                index0FieldStr = Address.from_string(firstIndex).toGroup().toXCoordinate().toString();
            } catch {
                index0FieldStr = undefined;
            }
        }
        const proof = await generateFreezeListProof(1, index0FieldStr);
        proofsInput = `[${proof}, ${proof}]`;
        emit('Compliance proofs ready.', onStatus, onLog);

        emit(`Scanning burner wallet for private ${currency} records...`, onStatus, onLog);
        spendableRecords = await listSpendableRecords(session, programName, 'Token', false);
    }

    const totalSpendable = spendableRecords.reduce((sum, record) => sum + record.microcredits, 0);
    if (totalSpendable < microsRequired) {
        throw new Error(`Insufficient private ${currency} balance to sweep ${amount.toFixed(2)} ${currency}.`);
    }

    let remainingMicros = microsRequired;
    const selectedRecords: Array<{ plaintext: string; microcredits: number }> = [];

    for (const record of spendableRecords) {
        if (remainingMicros <= 0) break;
        selectedRecords.push(record);
        remainingMicros -= Math.min(record.microcredits, remainingMicros);
    }

    if (remainingMicros > 0) {
        throw new Error(`Insufficient private ${currency} balance to sweep ${amount.toFixed(2)} ${currency}.`);
    }

    emit(`Preparing ${selectedRecords.length} transfer${selectedRecords.length === 1 ? '' : 's'} for ${amount.toFixed(2)} ${currency}...`, onStatus, onLog);

    const txIds: string[] = [];
    let microsLeftToSweep = microsRequired;

    for (let index = 0; index < selectedRecords.length; index += 1) {
        const record = selectedRecords[index];
        const sweepMicros = Math.min(record.microcredits, microsLeftToSweep);
        const amountFormatted = currency === 'ALEO' ? `${sweepMicros}u64` : `${sweepMicros}u128`;
        const inputs = currency === 'ALEO'
            ? [record.plaintext, destination, amountFormatted]
            : [destination, amountFormatted, record.plaintext, proofsInput];

        emit(
            `Building authorization for transfer ${index + 1}/${selectedRecords.length} (${(sweepMicros / 1_000_000).toFixed(2)} ${currency})...`,
            onStatus,
            onLog
        );
        const authorization = await programManager.buildAuthorization({ programName, functionName, inputs });

        emit(`Submitting transfer ${index + 1}/${selectedRecords.length} through NullPay relayer...`, onStatus, onLog);
        const apiUrl = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
        const sponsorResponse = await fetch(`${apiUrl}/dps/sponsor-sweep`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                execution_authorization_string: authorization.toString(),
                programName
            })
        });

        const payload = await sponsorResponse.json().catch(() => null);
        if (!sponsorResponse.ok) {
            throw new Error(payload?.error || payload?.message || `Failed to sponsor ${currency} sweep.`);
        }

        const txId = payload?.transaction?.id || payload?.transactionId || '';
        if (!txId) {
            throw new Error(`${currency} sweep did not return a transaction id.`);
        }

        txIds.push(txId);
        microsLeftToSweep -= sweepMicros;
    }

    emit(`${currency} sweep submitted successfully across ${txIds.length} transaction${txIds.length === 1 ? '' : 's'}.`, onStatus, onLog);
    return { txIds, amount, currency };
};
