import credits.aleo;

program zk_pay_proofs_privacy_v4.aleo {

    @noupgrade
    async constructor() {
        // The Leo compiler automatically generates the constructor logic.
    }

    struct InvoiceData {
        expiry_height: u32,
        status: u8
    }

    mapping invoices: field => InvoiceData;

    async transition create_invoice(
        private merchant: address,
        private amount: u64,
        private salt: field,
        public expiry_hours: u32
    ) -> (public field, Future) {
        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;

        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);

        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        return (invoice_hash, finalize_create_invoice(invoice_hash, expiry_hours));
    }

    async function finalize_create_invoice(
        invoice_hash: field,
        expiry_hours: u32
    ) {
        let blocks_to_add: u32 = expiry_hours * 360u32;
        let expiry_height: u32 =
            expiry_hours != 0u32 ? block.height + blocks_to_add : 0u32;

        let invoice_data: InvoiceData = InvoiceData {
            expiry_height: expiry_height,
            status: 0u8
        };

        invoices.set(invoice_hash, invoice_data);
    }

    async transition pay_invoice(
        pay_record: credits.aleo/credits,
        merchant: address,
        amount: u64,
        salt: field,
        public invoice_hash: field
    ) -> (credits.aleo/credits, credits.aleo/credits, Future) {
        let (r1, r2): (credits.aleo/credits, credits.aleo/credits) = 
            credits.aleo/transfer_private(pay_record, merchant, amount);
        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let computed_hash: field = merchant_hash + amount_hash + salt_hash;

        assert_eq(invoice_hash, computed_hash);

        let f0: Future = finalize_pay_invoice(invoice_hash);
        return (r1, r2, f0);
    }

    async function finalize_pay_invoice(invoice_hash: field) {
        let invoice_data: InvoiceData = invoices.get(invoice_hash);

        if invoice_data.expiry_height != 0u32 {
            assert(block.height <= invoice_data.expiry_height);
        }

        assert_eq(invoice_data.status, 0u8);

        let updated_data: InvoiceData = InvoiceData {
            expiry_height: invoice_data.expiry_height,
            status: 1u8
        };

        invoices.set(invoice_hash, updated_data);
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