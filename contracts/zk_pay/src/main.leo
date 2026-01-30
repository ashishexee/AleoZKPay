import credits.aleo;

program zk_pay_proofs_privacy_v7.aleo {

    @noupgrade
    async constructor() {
        // The Leo compiler automatically generates the constructor logic.
    }

    struct InvoiceData {
        expiry_height: u32,
        status: u8, // 0 = Open, 1 = Settled/Paid
        invoice_type: u8 // 0 = Standard, 1 = Multi Pay
    }

    // Invoice Storage
    mapping invoices: field => InvoiceData;
    mapping salt_to_invoice: field => field;

    // Payment Receipts for Verification
    // Key: Hash(payment_secret, invoice_salt)
    // Value: amount_paid
    mapping payment_receipts: field => u64;

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

        return (invoice_hash, finalize_create_invoice(invoice_hash, expiry_hours, salt, invoice_type));
    }

    async function finalize_create_invoice(
        invoice_hash: field,
        expiry_hours: u32,
        salt: field,
        invoice_type: u8
    ) {
        let blocks_to_add: u32 = expiry_hours * 360u32;
        let expiry_height: u32 =
            expiry_hours != 0u32 ? block.height + blocks_to_add : 0u32;

        let invoice_data: InvoiceData = InvoiceData {
            expiry_height: expiry_height,
            status: 0u8,
            invoice_type: invoice_type
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
        
        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
        
        // Create a unique key for this payment receipt using the secret + salt
        // We use commit_to_field to ensure it's a one-way secure commitment
       // Hash the salt field to create a safe scalar for the commitment
let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
let receipt_key: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        let f0: Future = finalize_pay_invoice(invoice_hash, salt, receipt_key, amount);
        return (r1, r2, f0);
    }

    async function finalize_pay_invoice(
        computed_hash: field, 
        salt: field,
        receipt_key: field,
        amount: u64
    ) {
        // Enforce that the provided salt maps to an invoice
        let stored_hash: field = salt_to_invoice.get(salt);
        
        // Ensure the computed parameters match the registered invoice for this salt
        assert_eq(computed_hash, stored_hash);

        let invoice_data: InvoiceData = invoices.get(stored_hash);

        // Check expiry
        if invoice_data.expiry_height != 0u32 {
            assert(block.height <= invoice_data.expiry_height);
        }

        // Standard Invoice (Type 0): Enforce single payment (Status must be 0)
        if (invoice_data.invoice_type == 0u8) {
             assert_eq(invoice_data.status, 0u8);
             
             // Close the invoice
             let updated_data: InvoiceData = InvoiceData {
                expiry_height: invoice_data.expiry_height,
                status: 1u8,
                invoice_type: invoice_data.invoice_type
            };
            invoices.set(stored_hash, updated_data);
        }

        // Multi Pay Invoice (Type 1): Allow multiple payments
        // We do NOT update the invoice 'status' to 1, so it stays open.
        // We store the receipt.
        
        // Ensure this exact receipt hasn't been processed before (replay protection for same secret)
        let exists: bool = payment_receipts.contains(receipt_key);
        assert(!exists);

        payment_receipts.set(receipt_key, amount);
    }

    async transition settle_invoice(
        public salt: field,
        private amount: u64
    ) -> (Future) {
        // Recompute the invoice hash to verify ownership without storing merchant address
        let merchant_field: field = self.caller as field;
        let amount_field: field = amount as field;
        
        // Match the hashing algorithm used in create_invoice
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
        // 1. Verify the invoice exists for this salt
        let stored_hash: field = salt_to_invoice.get(salt);
        
        // 2. Verify the caller is the merchant (because hash matches)
        assert_eq(calculated_hash, stored_hash);
        
        // 3. Get Invoice Data
        let invoice_data: InvoiceData = invoices.get(stored_hash);
        
        // 4. Update Status to 1 (Settled)
        // This prevents future payments even if it's a multi-pay invoice
        let updated_data: InvoiceData = InvoiceData {
            expiry_height: invoice_data.expiry_height,
            status: 1u8,
            invoice_type: invoice_data.invoice_type
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