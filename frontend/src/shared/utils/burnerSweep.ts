import { AleoKeyProvider, AleoNetworkClient, NetworkRecordProvider, ProgramManager } from '@provablehq/sdk';
import { getScannerSession, findSpendableRecord } from '../pages/Profile/components/BurnerWallet/scanner';

export type BurnerSweepCurrency = 'ALEO' | 'USDCx' | 'USAD';

interface SweepBurnerFundsParams {
    decryptedBurnerKey: string;
    amount: number;
    currency: BurnerSweepCurrency;
    destination: string;
    onStatus?: (status: string) => void;
    onLog?: (message: string) => void;
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
}: SweepBurnerFundsParams): Promise<string> => {
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
    let amountFormatted: string;
    let inputs: string[];

    if (currency === 'ALEO') {
        programName = 'credits.aleo';
        amountFormatted = `${microsRequired}u64`;
        emit(`Scanning burner wallet for a private ${currency} record...`, onStatus, onLog);
        const recordPlaintext = await findSpendableRecord(session, programName, 'credits', microsRequired, true);
        if (!recordPlaintext) {
            throw new Error(`No private ${currency} record large enough for ${amount.toFixed(2)} ${currency} was found in burner wallet.`);
        }
        emit(`Found private ${currency} record.`, onStatus, onLog);
        inputs = [recordPlaintext, destination, amountFormatted];
    } else {
        programName = currency === 'USDCx' ? 'test_usdcx_stablecoin.aleo' : 'test_usad_stablecoin.aleo';
        amountFormatted = `${microsRequired}u128`;

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
        const proofsInput = `[${proof}, ${proof}]`;
        emit('Compliance proofs ready.', onStatus, onLog);

        emit(`Scanning burner wallet for a private ${currency} record...`, onStatus, onLog);
        const recordPlaintext = await findSpendableRecord(session, programName, 'Token', microsRequired, false);
        if (!recordPlaintext) {
            throw new Error(`No private ${currency} record large enough for ${amount.toFixed(2)} ${currency} was found in burner wallet.`);
        }
        emit(`Found private ${currency} record.`, onStatus, onLog);
        inputs = [destination, amountFormatted, recordPlaintext, proofsInput];
    }

    emit(`Building authorization for ${currency} sweep...`, onStatus, onLog);
    const authorization = await programManager.buildAuthorization({ programName, functionName, inputs });

    emit(`Submitting ${currency} sweep through NullPay relayer...`, onStatus, onLog);
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

    emit(`${currency} sweep submitted successfully. TxID: ${txId}`, onStatus, onLog);
    return txId;
};
