import { AleoKeyProvider, AleoNetworkClient, NetworkRecordProvider, ProgramManager } from '@provablehq/sdk';
import { PROGRAM_ID } from '../aleo/aleoUtils';
import { findOwnedInvoiceRecord, getScannerSession } from '../../pages/Profile/components/BurnerWallet/scanner';

interface DeleteBurnerInvoiceParams {
    decryptedBurnerKey: string;
    invoiceHash: string;
}

export const sponsorBurnerInvoiceDeletion = async ({
    decryptedBurnerKey,
    invoiceHash
}: DeleteBurnerInvoiceParams): Promise<string> => {
    if (!decryptedBurnerKey) {
        throw new Error('Burner wallet must be unlocked to delete this invoice.');
    }

    const host = 'https://api.explorer.provable.com/v1';
    const networkClient = new AleoNetworkClient(host);
    const keyProvider = new AleoKeyProvider();
    keyProvider.useCache(true);

    const session = await getScannerSession(decryptedBurnerKey);
    const recordProvider = new NetworkRecordProvider(session.account, networkClient);
    const programManager = new ProgramManager(host, keyProvider, recordProvider);
    programManager.setAccount(session.account);

    const invoiceRecord = await findOwnedInvoiceRecord(session, PROGRAM_ID, invoiceHash);
    if (!invoiceRecord) {
        throw new Error('Could not locate an unspent on-chain invoice record for this burner invoice.');
    }

    const authorization = await programManager.buildAuthorization({
        programName: PROGRAM_ID,
        functionName: 'delete_invoice',
        inputs: [invoiceRecord]
    });

    const apiUrl = import.meta.env.VITE_API_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api';
    const sponsorResponse = await fetch(`${apiUrl}/dps/sponsor-sweep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            execution_authorization_string: authorization.toString(),
            programName: PROGRAM_ID
        })
    });

    const payload = await sponsorResponse.json().catch(() => null);
    if (!sponsorResponse.ok) {
        throw new Error(payload?.error || payload?.message || 'Failed to sponsor burner invoice deletion.');
    }

    const txId = payload?.transaction?.id || payload?.transactionId || '';
    if (!txId) {
        throw new Error('Burner invoice deletion did not return a transaction id.');
    }

    return txId;
};
