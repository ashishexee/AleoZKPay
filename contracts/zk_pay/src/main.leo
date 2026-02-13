import credits.aleo;
import test_usdcx_stablecoin.aleo;

program zk_pay_proofs_privacy_v10.aleo {
    
    @admin(address="aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0")
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

    record Invoice {
        owner: address,       // Merchant
        invoice_hash: field,
        amount: u64,          // Amount
        token_type: u8,       // 0 = Credits, 1 = USDCx
        invoice_type: u8,     // 0 = Standard, 1 = Multi Pay
        salt: field,          // For checking against hash
    }

    mapping invoices: field => InvoiceData;
    mapping salt_to_invoice: field => field;

    async transition create_invoice(
        private merchant: address,
        private amount: u64,
        private salt: field,
        public expiry_hours: u32,
        public invoice_type: u8
    ) -> (Invoice, public field, Future) {
        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;

        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);

        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let invoice_record: Invoice = Invoice {
            owner: merchant,
            invoice_hash: invoice_hash,
            amount: amount,
            token_type: 0u8,
            invoice_type: invoice_type,
            salt: salt
        };

        // Default token_type 0 for Credits
        return (invoice_record, invoice_hash, finalize_create_invoice(invoice_hash, expiry_hours, salt, invoice_type, 0u8));
    }

    async transition create_invoice_usdcx(
        private merchant: address,
        private amount: u128,
        private salt: field,
        public expiry_hours: u32,
        public invoice_type: u8
    ) -> (Invoice, public field, Future) {
        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;

        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);

        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        // Note: Casting amount to u64 for the record for consistency, 
        // assuming standard UX amounts won't overflow u64 easily even for USDCx (which has 6 decimals usually).
        // If high precision is needed, we might need to adjust record or keep u128. 
        // However, standard `PayerReceipt` uses u64. Let's stick to u64 for uniformity in display if possible,
        // or we need to change Invoice record to u128.
        // Given USDC has 6 decimals, u64 max is ~18 trillion units, which is 18 million USDC. 
        // Wait, u64 max is 1.8e19. USDC with 6 decimals: 1.8e13 USDC. usage is fine.
        let amount_u64: u64 = amount as u64; 

        let invoice_record: Invoice = Invoice {
            owner: merchant,
            invoice_hash: invoice_hash,
            amount: amount_u64,
            token_type: 1u8,
            invoice_type: invoice_type,
            salt: salt
        };

        // token_type 1 for USDCx
        return (invoice_record, invoice_hash, finalize_create_invoice(invoice_hash, expiry_hours, salt, invoice_type, 1u8));
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
        let f0: Future = finalize_pay_invoice(invoice_hash, salt, amount as u128, 0u8);
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
        
        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: self.caller,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount as u64,
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
        let f0: Future = finalize_pay_invoice_usdcx(invoice_hash, salt, amount, 1u8, transfer_future);
        
        return (transfer_output_1, transfer_output_2, compliance_record, payer_receipt, merchant_receipt, f0); 
    }


    async function finalize_pay_invoice_usdcx(
        invoice_hash: field,
        salt: field,
        amount: u128,
        expected_token_type: u8,
        f0: Future
    ) {
        f0.await();
        let stored_hash: field = salt_to_invoice.get(salt);
        assert_eq(invoice_hash, stored_hash);

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

    async function finalize_pay_invoice(
        invoice_hash: field,
        salt: field,
        amount: u128,
        expected_token_type: u8
    ) {

        
        let stored_hash: field = salt_to_invoice.get(salt);
        assert_eq(invoice_hash, stored_hash);

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