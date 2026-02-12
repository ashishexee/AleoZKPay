import credits.aleo;
import test_usdcx_stablecoin.aleo;

program zk_pay_proofs_privacy_v8.aleo {

    @noupgrade
    async constructor() {
        // The Leo compiler automatically generates the constructor logic.
    }

    struct InvoiceData {
        expiry_height: u32,
        status: u8, // 0 = Open, 1 = Settled/Paid
        invoice_type: u8, // 0 = Standard, 1 = Multi Pay
        token_type: u8 // 0 = Credits, 1 = USDCx
    }

    // Invoice Storage
    mapping invoices: field => InvoiceData;
    mapping salt_to_invoice: field => field;

    // Payment Receipts for Verification
    // Key: Hash(payment_secret, invoice_salt)
    // Value: amount_paid
    mapping payment_receipts: field => u128; // Updated to u128 to support both tokens

    async transition create_invoice(
        private merchant: address,
        private amount: u64,
        private salt: field,
        public expiry_hours: u32,
        public invoice_type: u8
    ) -> (public field, Future) {
        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;

        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);

        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        // Default token_type 0 for Credits
        return (invoice_hash, finalize_create_invoice(invoice_hash, expiry_hours, salt, invoice_type, 0u8));
    }

    async transition create_invoice_usdcx(
        private merchant: address,
        private amount: u128,
        private salt: field,
        public expiry_hours: u32,
        public invoice_type: u8
    ) -> (public field, Future) {
        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;

        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);

        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        // token_type 1 for USDCx
        return (invoice_hash, finalize_create_invoice(invoice_hash, expiry_hours, salt, invoice_type, 1u8));
    }

    async function finalize_create_invoice(
        invoice_hash: field,
        expiry_hours: u32,
        salt: field,
        invoice_type: u8,
        token_type: u8
    ) {
        let blocks_to_add: u32 = expiry_hours * 360u32;
        let expiry_height: u32 =
            expiry_hours != 0u32 ? block.height + blocks_to_add : 0u32;

        let invoice_data: InvoiceData = InvoiceData {
            expiry_height: expiry_height,
            status: 0u8,
            invoice_type: invoice_type,
            token_type: token_type
        };

        invoices.set(invoice_hash, invoice_data);
        salt_to_invoice.set(salt, invoice_hash);
    }

    async transition pay_invoice(
        pay_record: credits.aleo/credits,
        merchant: address,
        amount: u64,
        salt: field,
        private payment_secret: field,
        public message: field
    ) -> (credits.aleo/credits, credits.aleo/credits, Future) {
        let (r1, r2): (credits.aleo/credits, credits.aleo/credits) = 
            credits.aleo/transfer_private(pay_record, merchant, amount);
        
        // Note: credits.aleo/transfer_private returns a Future in newer versions, 
        // but existing codebase logic implies it might not have been captured or 
        // used to work with an older interface. 
        // We will assume V3/V4 semantics where it might just return records.
        // If compilation fails, we will adjust to capture the future.
        
        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
        
        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_key: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        // Pass 0u8 as expected_token_type for Credits
        let f0: Future = finalize_pay_invoice(invoice_hash, salt, receipt_key, amount as u128, 0u8);
        return (r1, r2, f0);
    }

    async transition pay_invoice_usdcx(
        pay_record: test_usdcx_stablecoin.aleo/Token,
        merchant: address,
        amount: u128,
        salt: field,
        private payment_secret: field,
        public message: field,
        private proofs: [test_usdcx_stablecoin.aleo/MerkleProof; 2]
    ) -> (test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/ComplianceRecord, Future) {
        
        // Call USDCx transfer_private
        // Network version returns a Future
        let (compliance_record, transfer_output_1, transfer_output_2, transfer_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) = 
            test_usdcx_stablecoin.aleo/transfer_private(merchant, amount, pay_record, proofs);

        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
        
        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_key: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        // Pass 1u8 as expected_token_type for USDCx
        // We use a specialized finalize function to await the USDCx transfer future AND do our logic
        let f0: Future = finalize_pay_invoice_usdcx(invoice_hash, salt, receipt_key, amount, 1u8, transfer_future);
        
        return (transfer_output_1, transfer_output_2, compliance_record, f0); 
    }

    async function finalize_pay_invoice(
        computed_hash: field, 
        salt: field,
        receipt_key: field,
        amount: u128,
        expected_token_type: u8
    ) {
        let stored_hash: field = salt_to_invoice.get(salt);
        assert_eq(computed_hash, stored_hash);

        let invoice_data: InvoiceData = invoices.get(stored_hash);
        assert_eq(invoice_data.token_type, expected_token_type);

        if invoice_data.expiry_height != 0u32 {
            assert(block.height <= invoice_data.expiry_height);
        }

        if (invoice_data.invoice_type == 0u8) {
             assert_eq(invoice_data.status, 0u8);
             
             let updated_data: InvoiceData = InvoiceData {
                expiry_height: invoice_data.expiry_height,
                status: 1u8,
                invoice_type: invoice_data.invoice_type,
                token_type: invoice_data.token_type
            };
            invoices.set(stored_hash, updated_data);
        }

        let exists: bool = payment_receipts.contains(receipt_key);
        assert(!exists);

        payment_receipts.set(receipt_key, amount);
    }
    
    async function finalize_pay_invoice_usdcx(
        computed_hash: field, 
        salt: field,
        receipt_key: field,
        amount: u128,
        expected_token_type: u8,
        f: Future
    ) {
        f.await(); // Critical: Ensure USDCx transfer succeeds
        
        let stored_hash: field = salt_to_invoice.get(salt);
        assert_eq(computed_hash, stored_hash);

        let invoice_data: InvoiceData = invoices.get(stored_hash);
        assert_eq(invoice_data.token_type, expected_token_type);

        if invoice_data.expiry_height != 0u32 {
            assert(block.height <= invoice_data.expiry_height);
        }

        if (invoice_data.invoice_type == 0u8) {
             assert_eq(invoice_data.status, 0u8);
             
             let updated_data: InvoiceData = InvoiceData {
                expiry_height: invoice_data.expiry_height,
                status: 1u8,
                invoice_type: invoice_data.invoice_type,
                token_type: invoice_data.token_type
            };
            invoices.set(stored_hash, updated_data);
        }

        let exists: bool = payment_receipts.contains(receipt_key);
        assert(!exists);

        payment_receipts.set(receipt_key, amount);
    }

    async transition settle_invoice(
        public salt: field,
        private amount: u64
    ) -> (Future) {
        let merchant_field: field = self.caller as field;
        let amount_field: field = amount as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let calculated_hash: field = merchant_hash + amount_hash + salt_hash;
        
        return finalize_settle_invoice(calculated_hash, salt);
    }

    async function finalize_settle_invoice(
        calculated_hash: field,
        salt: field
    ) {
        let stored_hash: field = salt_to_invoice.get(salt);
        assert_eq(calculated_hash, stored_hash);
        
        let invoice_data: InvoiceData = invoices.get(stored_hash);
        
        let updated_data: InvoiceData = InvoiceData {
            expiry_height: invoice_data.expiry_height,
            status: 1u8,
            invoice_type: invoice_data.invoice_type,
            token_type: invoice_data.token_type
        };
        
        invoices.set(stored_hash, updated_data);
    }

    async transition get_invoice_status(
        public invoice_hash: field
    ) -> Future {
        return finalize_get_invoice_status(invoice_hash);
    }

    async function finalize_get_invoice_status(invoice_hash: field) {
        let invoice_data: InvoiceData = invoices.get(invoice_hash);
    }
}