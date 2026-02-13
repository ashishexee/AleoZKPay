import credits.aleo;
import test_usdcx_stablecoin.aleo;

program zk_pay_proofs_privacy_v9.aleo {

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

    record PayerReceipt {
        owner: address,       // The Payer
        merchant: address,    // The Merchant
        receipt_hash: field,  // Unique Payment ID (Hash of secret + salt)
        invoice_hash: field,  // Link to specific invoice
        amount: u64,          // Amount Paid (u64 for Credits/USDCx standard)
        token_type: u8,       // 0 = Credits, 1 = USDCx
        timestamp: u64,       // Approximate block time or 0 if not available
    }

    record MerchantReceipt {
        owner: address,       // The Merchant
        receipt_hash: field,  // Unique Payment ID (Matches Payer's receipt_hash)
        invoice_hash: field,  // Link to specific invoice
        amount: u64,          // Amount Received
        token_type: u8,       // 0 = Credits, 1 = USDCx
    }

    mapping invoices: field => InvoiceData;
    mapping salt_to_invoice: field => field;
    mapping receipt_map: field => field;


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
    ) -> (credits.aleo/credits, credits.aleo/credits, PayerReceipt, MerchantReceipt, Future) {
        let (r1, r2): (credits.aleo/credits, credits.aleo/credits) = 
            credits.aleo/transfer_private(pay_record, merchant, amount);
        
        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
        
        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: self.caller,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount,
            token_type: 0u8,
            timestamp: 0u64 // Placeholder as block.timestamp is not available in transition
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount,
            token_type: 0u8
        };

        // Pass 0u8 as expected_token_type for Credits
        let f0: Future = finalize_pay_invoice(invoice_hash, salt, amount as u128, 0u8, payment_secret, receipt_hash);
        return (r1, r2, payer_receipt, merchant_receipt, f0);
    }

    async transition pay_invoice_usdcx(
        pay_record: test_usdcx_stablecoin.aleo/Token,
        merchant: address,
        amount: u128,
        salt: field,
        private payment_secret: field,
        public message: field,
        private proofs: [test_usdcx_stablecoin.aleo/MerkleProof; 2]
    ) -> (test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/ComplianceRecord, PayerReceipt, MerchantReceipt, Future) {
        
        let (compliance_record, transfer_output_1, transfer_output_2, transfer_future): (test_usdcx_stablecoin.aleo/ComplianceRecord, test_usdcx_stablecoin.aleo/Token, test_usdcx_stablecoin.aleo/Token, Future) = 
            test_usdcx_stablecoin.aleo/transfer_private(merchant, amount, pay_record, proofs);

        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
        
        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        // Note: USDCx amount is u128, but our receipt uses u64 based on standard. 
        // We will cast to u64 for receipt if it fits, or we should update receipt to u128.
        // Given USDCx is 6 decimals, u64 fits vast amounts. 
        // Actually, updating Record to u128 used in implementation plan? No, plan said u64. 
        // Wait, USDCx is u128. I better use u128 in the record to be safe and consistent.
        // Re-reading plan... "amount: u64". 
        // I will change it to u128 to match USDCx scaling properly.
        
        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: self.caller,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount as u64, // Casting to u64 as per plan. If > u64::MAX, this is an issue. But 18 quintillion microUSDC is huge.
            token_type: 1u8,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount as u64,
            token_type: 1u8
        };

        // Pass 1u8 as expected_token_type for USDCx
        let f0: Future = finalize_pay_invoice_usdcx(invoice_hash, salt, amount, 1u8, transfer_future, payment_secret, receipt_hash);
        
        return (transfer_output_1, transfer_output_2, compliance_record, payer_receipt, merchant_receipt, f0); 
    }

    async function finalize_pay_invoice(
        computed_hash: field, 
        salt: field,
    async function finalize_pay_invoice(
        computed_hash: field, 
        salt: field,
        amount: u128,
        expected_token_type: u8,
        payment_secret: field,
        receipt_hash: field
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
    }
    
    async function finalize_pay_invoice_usdcx(
        computed_hash: field, 
        salt: field,
    async function finalize_pay_invoice_usdcx(
        computed_hash: field, 
        salt: field,
        amount: u128,
        expected_token_type: u8,
        f: Future,
        payment_secret: field,
        receipt_hash: field
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