let AleoNetworkClient, Account, ProgramManager, AleoKeyProvider, NetworkRecordProvider, initThreadPool;

async function loadSDK() {
    const sdk = await import('@provablehq/sdk');
    AleoNetworkClient = sdk.AleoNetworkClient;
    Account = sdk.Account;
    ProgramManager = sdk.ProgramManager;
    AleoKeyProvider = sdk.AleoKeyProvider;
    NetworkRecordProvider = sdk.NetworkRecordProvider;
    initThreadPool = sdk.initThreadPool;

    // Initialize the thread pool for fast ZK proof execution
    await initThreadPool();
}
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;

if (!supabaseUrl || !supabaseKey || !relayerPrivateKey) {
    console.error('Missing required environment variables for Relayer Worker.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const PROGRAM_ID = "zk_pay_proofs_privacy_v19.aleo";

/**
 * Executes a zero-knowledge transition on the Aleo network.
 */
async function executeRelayerTransition(merchantAddress, amount, tokenType, salt, intentId) {
    console.log(`[Relayer] Starting transition for Intent: ${intentId}`);

    try {
        const networkClient = new AleoNetworkClient("https://api.explorer.aleo.org/v1");
        const keyProvider = new AleoKeyProvider();
        keyProvider.useCache(true);
        const account = new Account({ privateKey: relayerPrivateKey });
        const recordProvider = new NetworkRecordProvider(account, networkClient);
        const programManager = new ProgramManager("https://api.explorer.aleo.org/v1", keyProvider, recordProvider);
        programManager.setAccount(account);

        // 2. Determine function based on token type
        let functionName = "create_invoice";
        let amountStr = `${amount}u64`;

        switch (tokenType) {
            case "USDCX":
                functionName = "create_invoice_usdcx";
                amountStr = `${amount * 1_000_000}u128`; // Assuming 6 decimals
                break;
            case "USAD":
                functionName = "create_invoice_usad";
                amountStr = `${amount * 1_000_000}u128`; // Assuming 6 decimals
                break;
            case "CREDITS":
            default:
                functionName = "create_invoice";
                amountStr = `${amount * 1_000_000}u64`; // Convert to microcredits
                break;
        }

        // 3. Build inputs matching main.leo signature
        const inputs = [
            merchantAddress, // private merchant: address
            amountStr,       // private amount (u64 for credits, u128 for others)
            salt,            // private salt
            "0field",        // private memo
            "24u32",         // public expiry_hours
            "0u8",           // public invoice_type (0 = Standard)
            "0u8"            // public wallet_type (0 = Main)
        ];

        console.log(`[Relayer] Executing: ${PROGRAM_ID}/${functionName}`, inputs);

        // 4. Execute the transition on-chain
        // The Relayer pays the gas fee
        const txId = await programManager.execute({
            programName: PROGRAM_ID,
            functionName: functionName,
            priorityFee: 1_000_000, // fee
            privateFee: false,      // public fee
            inputs: inputs,
            keySearchParams: { cacheKey: `${PROGRAM_ID}:${functionName}` }
        });

        console.log(`[Relayer] Transaction broadcasted: ${txId}`);
        console.timeEnd('[Relayer Execution Time]');
        console.log(`[Relayer] Memory Info After Execution: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB used`);

        const { getInvoiceHashFromMapping } = require('../frontend/src/utils/aleo-utils'); // We might need a backend equivalent or just generate a random hash for now if backend crypto is complex.
        console.log(`[Relayer] Fetching real invoice_hash from chain for TX: ${txId}...`);

        let realInvoiceHash = null;
        let attempts = 0;
        while (!realInvoiceHash && attempts < 25) {
            attempts++;
            await new Promise(r => setTimeout(r, 2000));
            try {
                const url = `https://api.provable.com/v2/testnet/program/${PROGRAM_ID}/mapping/salt_to_invoice/${salt}`;
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (data) {
                        realInvoiceHash = data.toString().replace(/(['"])/g, '');
                        console.log(`[Relayer] Found real invoice_hash from mapping: ${realInvoiceHash}`);
                    }
                }
            } catch (err) {
                console.log(`[Relayer] Attempt ${attempts}: Waiting for invoice hash to map...`);
            }
        }

        if (!realInvoiceHash) {
            throw new Error("Could not retrieve real invoice_hash from chain execution.");
        }

        // 6. Save the STANDARD Invoice to the `invoices` table
        const { encrypt } = require('./encryption');
        const encryptedMerchant = encrypt(merchantAddress);

        // Determine token_type int
        let typeInt = 0;
        if (tokenType === 'USDCX') typeInt = 1;
        if (tokenType === 'USAD') typeInt = 2;

        await supabase.from('invoices').insert([{
            invoice_hash: realInvoiceHash,
            merchant_address: encryptedMerchant,
            designated_address: encryptedMerchant, // Default to merchant
            is_burner: false,
            status: 'PENDING',
            invoice_transaction_id: txId,
            salt: salt,
            invoice_type: 0, // Standard
            token_type: typeInt,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }]);

        // 7. Update the Checkout Session Intent
        await supabase
            .from('payment_intents')
            .update({
                status: 'PENDING',
                invoice_hash: realInvoiceHash // Update with the REAL hash so the UI can listen!
            })
            .eq('id', intentId);

        console.log(`[Relayer] Intent ${intentId} updated to PENDING with real hash.`);
        return { success: true, invoice_hash: realInvoiceHash, txId };

    } catch (error) {
        console.error(`[Relayer] Error executing transition for Intent ${intentId}:`, error);

        // Mark intent as FAILED
        await supabase
            .from('payment_intents')
            .update({ status: 'FAILED' })
            .eq('id', intentId);

        return { success: false, error: error.message };
    }
}

// The daemon worker is removed. The relayer is now on-demand.

module.exports = { executeRelayerTransition, loadSDK };
