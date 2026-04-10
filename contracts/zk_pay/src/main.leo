import credits.aleo;
import test_usdcx_stablecoin.aleo;
import test_usad_stablecoin.aleo;

program zk_pay_proofs_privacy_v27.aleo {
    
    @admin(address="aleo1d5hc09stpfpp3y7xhw9v306th9hrjt6qj8jj3h0rxjwv2y4rrypspfycge")
    constructor() {
        // The Leo compiler automatically generates the constructor logic.
    }

    struct InvoiceData {
        expiry_height: u32,
        status: u8, // 0 = Open, 1 = Settled/Paid
        invoice_type: u8, // 0 = Standard, 1 = Multi Pay, 2 = Donation
        token_type: u8, // 0 = Credits, 1 = USDCx, 2 = USAD
        wallet_type: u8 // 0 = Main Wallet, 1 = Burner Wallet
    }

    struct OracleQuote {
        original_amount_micro: u64,    // Invoice amount in base token micros
        converted_amount_micro: u64,   // Payer amount in their token micros
        from_token_type: u8,           // Base token (0=Credits, 1=USDCx, 2=USAD)
        to_token_type: u8,             // Payer token
        expires_at: u32                // Block height expiry
    }

    record PayerReceipt {
        owner: address,       // The Payer
        merchant: address,    // The Merchant
        receipt_hash: field,  // Unique Payment ID (Hash of secret + salt)
        invoice_hash: field,  // Link to specific invoice
        amount: u64,          // Amount Paid (u64 for Credits/USDCx standard)
        token_type: u8,       // 0 = Credits, 1 = USDCx, 2 = USAD
        payer_note: field,    // Payer-only note (max ~31 chars)
        timestamp: u64,       // Approximate block time or 0 if not available
    }

    record MerchantReceipt {
        owner: address,       // The Merchant
        receipt_hash: field,  // Unique Payment ID (Matches Payer's receipt_hash)
        invoice_hash: field,  // Link to specific invoice
        amount: u64,          // Amount Received
        token_type: u8,       // 0 = Credits, 1 = USDCx, 2 = USAD
        merchant_note: field, // Merchant-visible note (max ~31 chars)
    }

    record Invoice {
        owner: address,       // Merchant
        invoice_hash: field,
        amount: u64,          // Amount
        token_type: u8,       // 0 = Credits, 1 = USDCx, 2 = USAD
        invoice_type: u8,     // 0 = Standard, 1 = Multi Pay
        salt: field,          // For checking against hash
        title: field,         // Encoded Title (max ~31 chars)
        memo: field,          // Encoded Memo (max ~31 chars)
        wallet_type: u8,      // 0 = Main Wallet, 1 = Burner Wallet
    }

    mapping invoices: field => InvoiceData;
    mapping salt_to_invoice: field => field;
    mapping oracle_address: u8 => address;  // key 0u8 => trusted oracle address

    fn create_invoice(
        private merchant: address,
        private amount: u64,
        private salt: field,
        private title: field,
        private memo: field,
        public expiry_hours: u32,
        public invoice_type: u8,
        public wallet_type: u8
    ) -> (Invoice, public field, Final) {
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
            salt: salt,
            title: title,
            memo: memo,
            wallet_type: wallet_type
        };

        // Default token_type 0 for Credits
        return (
            invoice_record,
            invoice_hash,
            final {
                let blocks_to_add: u32 = expiry_hours * 360u32;
                let expiry_height: u32 =
                    expiry_hours != 0u32 ? block.height + blocks_to_add : 0u32;

                let invoice_data: InvoiceData = InvoiceData {
                    expiry_height: expiry_height,
                    status: 0u8,
                    invoice_type: invoice_type,
                    token_type: 0u8,
                    wallet_type: wallet_type
                };

                invoices.set(invoice_hash, invoice_data);
                salt_to_invoice.set(salt, invoice_hash);
            }
        );
    }

    fn create_invoice_usdcx(
        private merchant: address,
        private amount: u128,
        private salt: field,
        private title: field,
        private memo: field,
        public expiry_hours: u32,
        public invoice_type: u8,
        public wallet_type: u8
    ) -> (Invoice, public field, Final) {
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
            salt: salt,
            title: title,
            memo: memo,
            wallet_type: wallet_type
        };

        // token_type 1 for USDCx
        return (
            invoice_record,
            invoice_hash,
            final {
                let blocks_to_add: u32 = expiry_hours * 360u32;
                let expiry_height: u32 =
                    expiry_hours != 0u32 ? block.height + blocks_to_add : 0u32;

                let invoice_data: InvoiceData = InvoiceData {
                    expiry_height: expiry_height,
                    status: 0u8,
                    invoice_type: invoice_type,
                    token_type: 1u8,
                    wallet_type: wallet_type
                };

                invoices.set(invoice_hash, invoice_data);
                salt_to_invoice.set(salt, invoice_hash);
            }
        );
    }

    fn create_invoice_usad(
        private merchant: address,
        private amount: u128,
        private salt: field,
        private title: field,
        private memo: field,
        public expiry_hours: u32,
        public invoice_type: u8,
        public wallet_type: u8
    ) -> (Invoice, public field, Final) {
        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;

        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);

        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let amount_u64: u64 = amount as u64; 

        let invoice_record: Invoice = Invoice {
            owner: merchant,
            invoice_hash: invoice_hash,
            amount: amount_u64,
            token_type: 2u8,
            invoice_type: invoice_type,
            salt: salt,
            title: title,
            memo: memo,
            wallet_type: wallet_type
        };

        // token_type 2 for USAD
        return (
            invoice_record,
            invoice_hash,
            final {
                let blocks_to_add: u32 = expiry_hours * 360u32;
                let expiry_height: u32 =
                    expiry_hours != 0u32 ? block.height + blocks_to_add : 0u32;

                let invoice_data: InvoiceData = InvoiceData {
                    expiry_height: expiry_height,
                    status: 0u8,
                    invoice_type: invoice_type,
                    token_type: 2u8,
                    wallet_type: wallet_type
                };

                invoices.set(invoice_hash, invoice_data);
                salt_to_invoice.set(salt, invoice_hash);
            }
        );
    }

    fn create_invoice_any(
        private merchant: address,
        private amount: u128,
        private salt: field,
        private title: field,
        private memo: field,
        public expiry_hours: u32,
        public invoice_type: u8,
        public wallet_type: u8
    ) -> (Invoice, public field, Final) {
        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;

        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);

        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let amount_u64: u64 = amount as u64; 

        let invoice_record: Invoice = Invoice {
            owner: merchant,
            invoice_hash: invoice_hash,
            amount: amount_u64,
            token_type: 3u8,
            invoice_type: invoice_type,
            salt: salt,
            title: title,
            memo: memo,
            wallet_type: wallet_type
        };

        // token_type 3 for ANY
        return (
            invoice_record,
            invoice_hash,
            final {
                let blocks_to_add: u32 = expiry_hours * 360u32;
                let expiry_height: u32 =
                    expiry_hours != 0u32 ? block.height + blocks_to_add : 0u32;

                let invoice_data: InvoiceData = InvoiceData {
                    expiry_height: expiry_height,
                    status: 0u8,
                    invoice_type: invoice_type,
                    token_type: 3u8,
                    wallet_type: wallet_type
                };

                invoices.set(invoice_hash, invoice_data);
                salt_to_invoice.set(salt, invoice_hash);
            }
        );
    }
    fn pay_donation(
        pay_record: credits.aleo::credits,
        merchant: address,
        public payer_owner: address,
        amount_to_donate: u64,
        salt: field,
        private payment_secret: field,
        private payer_note: field,
        private merchant_note: field,
        public message: field
    ) -> (credits.aleo::credits, credits.aleo::credits, PayerReceipt, MerchantReceipt, Final) {
        assert(amount_to_donate > 0u64);
        let (r1, r2): (credits.aleo::credits, credits.aleo::credits) = 
            credits.aleo::transfer_private(pay_record, merchant, amount_to_donate);
        
        let merchant_field: field = merchant as field; 
        
        // For donation, the invoice was created with amount 0
        let amount_field: field = 0u64 as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
        
        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let amount_hash_for_receipt: field = BHP256::hash_to_field(amount_to_donate as field);
        let token_hash: field = BHP256::hash_to_field(0u8 as field);
        let combined_secret: field = payment_secret + amount_hash_for_receipt + token_hash;
        let receipt_hash: field = BHP256::commit_to_field(combined_secret, salt_scalar);

        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: payer_owner,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount_to_donate, // Actual donated amount
            token_type: 0u8,
            payer_note: payer_note,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount_to_donate, // Actual donated amount
            token_type: 0u8,
            merchant_note: merchant_note
        };

        return (
            r1,
            r2,
            payer_receipt,
            merchant_receipt,
            final {
                let stored_hash: field = salt_to_invoice.get(salt);
                assert_eq(invoice_hash, stored_hash);

                let invoice_data: InvoiceData = invoices.get(stored_hash);

                if invoice_data.token_type != 3u8 {
                    assert_eq(invoice_data.token_type, 0u8);
                }

                assert_eq(invoice_data.invoice_type, 2u8);
                assert_eq(invoice_data.status, 0u8);

                if invoice_data.expiry_height != 0u32 {
                    assert(block.height <= invoice_data.expiry_height);
                }
            }
        );
    }

    fn pay_invoice(
        pay_record: credits.aleo::credits,
        merchant: address,
        public payer_owner: address,
        amount: u64,
        salt: field,
        private payment_secret: field,
        private payer_note: field,
        private merchant_note: field,
        public message: field
    ) -> (credits.aleo::credits, credits.aleo::credits, PayerReceipt, MerchantReceipt, Final) {
        let (r1, r2): (credits.aleo::credits, credits.aleo::credits) = 
            credits.aleo::transfer_private(pay_record, merchant, amount);
        
        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
        
        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: payer_owner,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount,
            token_type: 0u8,
            payer_note: payer_note,
            timestamp: 0u64 // Placeholder as block.timestamp is not available in transition
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount,
            token_type: 0u8,
            merchant_note: merchant_note
        };

        return (
            r1,
            r2,
            payer_receipt,
            merchant_receipt,
            final {
                let stored_hash: field = salt_to_invoice.get(salt);
                assert_eq(invoice_hash, stored_hash);

                let invoice_data: InvoiceData = invoices.get(stored_hash);
                if invoice_data.token_type != 3u8 {
                    assert_eq(invoice_data.token_type, 0u8);
                }

                if invoice_data.expiry_height != 0u32 {
                    assert(block.height <= invoice_data.expiry_height);
                }

                assert_eq(invoice_data.status, 0u8);

                if invoice_data.invoice_type == 0u8 {
                    let updated_data: InvoiceData = InvoiceData {
                        expiry_height: invoice_data.expiry_height,
                        status: 1u8,
                        invoice_type: invoice_data.invoice_type,
                        token_type: invoice_data.token_type,
                        wallet_type: invoice_data.wallet_type
                    };
                    invoices.set(stored_hash, updated_data);
                }
            }
        );
    }

    fn pay_invoice_usdcx(
        pay_record: test_usdcx_stablecoin.aleo::Token,
        merchant: address,
        public payer_owner: address,
        amount: u128,
        salt: field,
        private payment_secret: field,
        private payer_note: field,
        private merchant_note: field,
        public message: field,
        private proofs: [test_usdcx_stablecoin.aleo::MerkleProof; 2]
    ) -> (test_usdcx_stablecoin.aleo::Token, test_usdcx_stablecoin.aleo::Token, test_usdcx_stablecoin.aleo::ComplianceRecord, PayerReceipt, MerchantReceipt, Final) {
        
        let (compliance_record, transfer_output_1, transfer_output_2, transfer_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, test_usdcx_stablecoin.aleo::Token, Final) = 
            test_usdcx_stablecoin.aleo::transfer_private(merchant, amount, pay_record, proofs);

        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
        
        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);
        
        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: payer_owner,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount as u64,
            token_type: 1u8,
            payer_note: payer_note,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount as u64,
            token_type: 1u8,
            merchant_note: merchant_note
        };

        return (
            transfer_output_1,
            transfer_output_2,
            compliance_record,
            payer_receipt,
            merchant_receipt,
            final {
                transfer_future.run();

                let stored_hash: field = salt_to_invoice.get(salt);
                assert_eq(invoice_hash, stored_hash);

                let invoice_data: InvoiceData = invoices.get(stored_hash);
                if invoice_data.token_type != 3u8 {
                    assert_eq(invoice_data.token_type, 1u8);
                }

                if invoice_data.expiry_height != 0u32 {
                    assert(block.height <= invoice_data.expiry_height);
                }

                assert_eq(invoice_data.status, 0u8);

                if invoice_data.invoice_type == 0u8 {
                    let updated_data: InvoiceData = InvoiceData {
                        expiry_height: invoice_data.expiry_height,
                        status: 1u8,
                        invoice_type: invoice_data.invoice_type,
                        token_type: invoice_data.token_type,
                        wallet_type: invoice_data.wallet_type
                    };
                    invoices.set(stored_hash, updated_data);
                }
            }
        );
    }

    fn pay_invoice_usad(
        pay_record: test_usad_stablecoin.aleo::Token,
        merchant: address,
        public payer_owner: address,
        amount: u128,
        salt: field,
        private payment_secret: field,
        private payer_note: field,
        private merchant_note: field,
        public message: field,
        private proofs: [test_usad_stablecoin.aleo::MerkleProof; 2]
    ) -> (test_usad_stablecoin.aleo::Token, test_usad_stablecoin.aleo::Token, test_usad_stablecoin.aleo::ComplianceRecord, PayerReceipt, MerchantReceipt, Final) {
        
        let (compliance_record, transfer_output_1, transfer_output_2, transfer_future): (test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, test_usad_stablecoin.aleo::Token, Final) = 
            test_usad_stablecoin.aleo::transfer_private(merchant, amount, pay_record, proofs);

        let merchant_field: field = merchant as field; 
        let amount_field: field = amount as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
        
        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);
        
        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: payer_owner,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount as u64,
            token_type: 2u8,
            payer_note: payer_note,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount as u64,
            token_type: 2u8,
            merchant_note: merchant_note
        };

        return (
            transfer_output_1,
            transfer_output_2,
            compliance_record,
            payer_receipt,
            merchant_receipt,
            final {
                transfer_future.run();

                let stored_hash: field = salt_to_invoice.get(salt);
                assert_eq(invoice_hash, stored_hash);

                let invoice_data: InvoiceData = invoices.get(stored_hash);
                if invoice_data.token_type != 3u8 {
                    assert_eq(invoice_data.token_type, 2u8);
                }

                if invoice_data.expiry_height != 0u32 {
                    assert(block.height <= invoice_data.expiry_height);
                }

                assert_eq(invoice_data.status, 0u8);

                if invoice_data.invoice_type == 0u8 {
                    let updated_data: InvoiceData = InvoiceData {
                        expiry_height: invoice_data.expiry_height,
                        status: 1u8,
                        invoice_type: invoice_data.invoice_type,
                        token_type: invoice_data.token_type,
                        wallet_type: invoice_data.wallet_type
                    };
                    invoices.set(stored_hash, updated_data);
                }
            }
        );
    }

    fn pay_donation_usdcx(
        pay_record: test_usdcx_stablecoin.aleo::Token,
        merchant: address,
        public payer_owner: address,
        amount_to_donate: u128,
        salt: field,
        private payment_secret: field,
        private payer_note: field,
        private merchant_note: field,
        public message: field,
        private proofs: [test_usdcx_stablecoin.aleo::MerkleProof; 2]
    ) -> (test_usdcx_stablecoin.aleo::Token, test_usdcx_stablecoin.aleo::Token, test_usdcx_stablecoin.aleo::ComplianceRecord, PayerReceipt, MerchantReceipt, Final) {
        assert(amount_to_donate > 0u128);
        let (compliance_record, transfer_output_1, transfer_output_2, transfer_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, test_usdcx_stablecoin.aleo::Token, Final) = 
            test_usdcx_stablecoin.aleo::transfer_private(merchant, amount_to_donate, pay_record, proofs);

        let merchant_field: field = merchant as field; 
        
        // For donation, the invoice was created with amount 0 (u128)
        let amount_field: field = 0u128 as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
        
        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let amount_hash_for_receipt: field = BHP256::hash_to_field(amount_to_donate as field);
        let token_hash: field = BHP256::hash_to_field(1u8 as field);
        let combined_secret: field = payment_secret + amount_hash_for_receipt + token_hash;
        let receipt_hash: field = BHP256::commit_to_field(combined_secret, salt_scalar);
        
        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: payer_owner,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount_to_donate as u64, // Cast to u64 for receipt consistency
            token_type: 1u8,
            payer_note: payer_note,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount_to_donate as u64,
            token_type: 1u8,
            merchant_note: merchant_note
        };

        return (
            transfer_output_1,
            transfer_output_2,
            compliance_record,
            payer_receipt,
            merchant_receipt,
            final {
                transfer_future.run();

                let stored_hash: field = salt_to_invoice.get(salt);
                assert_eq(invoice_hash, stored_hash);

                let invoice_data: InvoiceData = invoices.get(stored_hash);

                if invoice_data.token_type != 3u8 {
                    assert_eq(invoice_data.token_type, 1u8);
                }

                assert_eq(invoice_data.invoice_type, 2u8);
                assert_eq(invoice_data.status, 0u8);

                if invoice_data.expiry_height != 0u32 {
                    assert(block.height <= invoice_data.expiry_height);
                }
            }
        );
    }

    fn pay_donation_usad(
        pay_record: test_usad_stablecoin.aleo::Token,
        merchant: address,
        public payer_owner: address,
        amount_to_donate: u128,
        salt: field,
        private payment_secret: field,
        private payer_note: field,
        private merchant_note: field,
        public message: field,
        private proofs: [test_usad_stablecoin.aleo::MerkleProof; 2]
    ) -> (test_usad_stablecoin.aleo::Token, test_usad_stablecoin.aleo::Token, test_usad_stablecoin.aleo::ComplianceRecord, PayerReceipt, MerchantReceipt, Final) {
        assert(amount_to_donate > 0u128);
        let (compliance_record, transfer_output_1, transfer_output_2, transfer_future): (test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, test_usad_stablecoin.aleo::Token, Final) = 
            test_usad_stablecoin.aleo::transfer_private(merchant, amount_to_donate, pay_record, proofs);

        let merchant_field: field = merchant as field; 
        
        // For donation, the invoice was created with amount 0 (u128)
        let amount_field: field = 0u128 as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;
        
        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let amount_hash_for_receipt: field = BHP256::hash_to_field(amount_to_donate as field);
        let token_hash: field = BHP256::hash_to_field(2u8 as field);
        let combined_secret: field = payment_secret + amount_hash_for_receipt + token_hash;
        let receipt_hash: field = BHP256::commit_to_field(combined_secret, salt_scalar);
        
        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: payer_owner,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount_to_donate as u64, // Cast to u64 for receipt consistency
            token_type: 2u8,
            payer_note: payer_note,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: amount_to_donate as u64,
            token_type: 2u8,
            merchant_note: merchant_note
        };

        return (
            transfer_output_1,
            transfer_output_2,
            compliance_record,
            payer_receipt,
            merchant_receipt,
            final {
                transfer_future.run();

                let stored_hash: field = salt_to_invoice.get(salt);
                assert_eq(invoice_hash, stored_hash);

                let invoice_data: InvoiceData = invoices.get(stored_hash);

                if invoice_data.token_type != 3u8 {
                    assert_eq(invoice_data.token_type, 2u8);
                }

                assert_eq(invoice_data.invoice_type, 2u8);
                assert_eq(invoice_data.status, 0u8);

                if invoice_data.expiry_height != 0u32 {
                    assert(block.height <= invoice_data.expiry_height);
                }
            }
        );
    }

    // ─── Admin: Set Oracle Address ─────────────────────────────────
    fn set_oracle_address(
        public oracle_addr: address
    ) -> Final {
        assert_eq(self.caller, aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0);
        return final {
            oracle_address.set(0u8, oracle_addr);
        };
    }

    // ─── Cross-Token Payments: CREDITS invoice paid via USDCx ─────
    fn pay_invoice_credits_via_usdcx(
        pay_record: test_usdcx_stablecoin.aleo::Token,
        merchant: address,
        public payer_owner: address,
        original_amount: u64,          // Invoice amount in microcredits (for hash verification)
        converted_amount: u128,        // USDCx amount to actually transfer
        salt: field,
        private payment_secret: field,
        private payer_note: field,
        private merchant_note: field,
        public message: field,
        private proofs: [test_usdcx_stablecoin.aleo::MerkleProof; 2],
        oracle_sig: signature,
        public expires_at: u32
    ) -> (test_usdcx_stablecoin.aleo::Token, test_usdcx_stablecoin.aleo::Token, test_usdcx_stablecoin.aleo::ComplianceRecord, PayerReceipt, MerchantReceipt, Final) {
        // Transfer USDCx from payer to merchant
        let (compliance_record, transfer_output_1, transfer_output_2, transfer_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, test_usdcx_stablecoin.aleo::Token, Final) = 
            test_usdcx_stablecoin.aleo::transfer_private(merchant, converted_amount, pay_record, proofs);

        // Verify invoice hash using ORIGINAL amount (matches create_invoice)
        let merchant_field: field = merchant as field;
        let amount_field: field = original_amount as field;
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        // Verify oracle signature over the quote
        let quote: OracleQuote = OracleQuote {
            original_amount_micro: original_amount,
            converted_amount_micro: converted_amount as u64,
            from_token_type: 0u8,  // CREDITS
            to_token_type: 1u8,    // USDCx
            expires_at: expires_at
        };
        let quote_hash: field = BHP256::hash_to_field(quote);
        let is_valid: bool = signature::verify(oracle_sig, payer_owner, quote_hash);
        assert(is_valid);

        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: payer_owner,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: converted_amount as u64,
            token_type: 1u8,  // Paid in USDCx
            payer_note: payer_note,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: converted_amount as u64,
            token_type: 1u8,
            merchant_note: merchant_note
        };

        return (
            transfer_output_1,
            transfer_output_2,
            compliance_record,
            payer_receipt,
            merchant_receipt,
            final {
                transfer_future.run();

                let stored_hash: field = salt_to_invoice.get(salt);
                assert_eq(invoice_hash, stored_hash);

                let invoice_data: InvoiceData = invoices.get(stored_hash);
                assert_eq(invoice_data.token_type, 0u8); // Must be a CREDITS invoice
                assert_eq(invoice_data.status, 0u8);

                if expires_at != 0u32 {
                    assert(block.height <= expires_at);
                }

                if invoice_data.expiry_height != 0u32 {
                    assert(block.height <= invoice_data.expiry_height);
                }

                // Verify oracle address
                let trusted_oracle: address = oracle_address.get(0u8);
                assert(signature::verify(oracle_sig, trusted_oracle, quote_hash));

                if invoice_data.invoice_type == 0u8 {
                    let updated_data: InvoiceData = InvoiceData {
                        expiry_height: invoice_data.expiry_height,
                        status: 1u8,
                        invoice_type: invoice_data.invoice_type,
                        token_type: invoice_data.token_type,
                        wallet_type: invoice_data.wallet_type
                    };
                    invoices.set(stored_hash, updated_data);
                }
            }
        );
    }

    // ─── Cross-Token Payments: CREDITS invoice paid via USAD ──────
    fn pay_invoice_credits_via_usad(
        pay_record: test_usad_stablecoin.aleo::Token,
        merchant: address,
        public payer_owner: address,
        original_amount: u64,
        converted_amount: u128,
        salt: field,
        private payment_secret: field,
        private payer_note: field,
        private merchant_note: field,
        public message: field,
        private proofs: [test_usad_stablecoin.aleo::MerkleProof; 2],
        oracle_sig: signature,
        public expires_at: u32
    ) -> (test_usad_stablecoin.aleo::Token, test_usad_stablecoin.aleo::Token, test_usad_stablecoin.aleo::ComplianceRecord, PayerReceipt, MerchantReceipt, Final) {
        let (compliance_record, transfer_output_1, transfer_output_2, transfer_future): (test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, test_usad_stablecoin.aleo::Token, Final) = 
            test_usad_stablecoin.aleo::transfer_private(merchant, converted_amount, pay_record, proofs);

        let merchant_field: field = merchant as field;
        let amount_field: field = original_amount as field;
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let quote: OracleQuote = OracleQuote {
            original_amount_micro: original_amount,
            converted_amount_micro: converted_amount as u64,
            from_token_type: 0u8,
            to_token_type: 2u8,  // USAD
            expires_at: expires_at
        };
        let quote_hash: field = BHP256::hash_to_field(quote);
        let is_valid: bool = signature::verify(oracle_sig, payer_owner, quote_hash);
        assert(is_valid);

        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: payer_owner,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: converted_amount as u64,
            token_type: 2u8,
            payer_note: payer_note,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: converted_amount as u64,
            token_type: 2u8,
            merchant_note: merchant_note
        };

        return (
            transfer_output_1,
            transfer_output_2,
            compliance_record,
            payer_receipt,
            merchant_receipt,
            final {
                transfer_future.run();

                let stored_hash: field = salt_to_invoice.get(salt);
                assert_eq(invoice_hash, stored_hash);

                let invoice_data: InvoiceData = invoices.get(stored_hash);
                assert_eq(invoice_data.token_type, 0u8);
                assert_eq(invoice_data.status, 0u8);

                if expires_at != 0u32 {
                    assert(block.height <= expires_at);
                }

                if invoice_data.expiry_height != 0u32 {
                    assert(block.height <= invoice_data.expiry_height);
                }

                let trusted_oracle: address = oracle_address.get(0u8);
                assert(signature::verify(oracle_sig, trusted_oracle, quote_hash));

                if invoice_data.invoice_type == 0u8 {
                    let updated_data: InvoiceData = InvoiceData {
                        expiry_height: invoice_data.expiry_height,
                        status: 1u8,
                        invoice_type: invoice_data.invoice_type,
                        token_type: invoice_data.token_type,
                        wallet_type: invoice_data.wallet_type
                    };
                    invoices.set(stored_hash, updated_data);
                }
            }
        );
    }

    // ─── Cross-Token Payments: USDCx invoice paid via CREDITS ─────
    fn pay_invoice_usdcx_via_credits(
        pay_record: credits.aleo::credits,
        merchant: address,
        public payer_owner: address,
        original_amount: u128,         // Invoice amount in micro-USDCx (for hash verification)
        converted_amount: u64,         // Credits amount to actually transfer
        salt: field,
        private payment_secret: field,
        private payer_note: field,
        private merchant_note: field,
        public message: field,
        oracle_sig: signature,
        public expires_at: u32
    ) -> (credits.aleo::credits, credits.aleo::credits, PayerReceipt, MerchantReceipt, Final) {
        let (r1, r2): (credits.aleo::credits, credits.aleo::credits) = 
            credits.aleo::transfer_private(pay_record, merchant, converted_amount);

        let merchant_field: field = merchant as field;
        let amount_field: field = original_amount as field;
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let quote: OracleQuote = OracleQuote {
            original_amount_micro: original_amount as u64,
            converted_amount_micro: converted_amount,
            from_token_type: 1u8,  // USDCx
            to_token_type: 0u8,    // CREDITS
            expires_at: expires_at
        };
        let quote_hash: field = BHP256::hash_to_field(quote);
        let is_valid: bool = signature::verify(oracle_sig, payer_owner, quote_hash);
        assert(is_valid);

        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: payer_owner,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: converted_amount,
            token_type: 0u8,
            payer_note: payer_note,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: converted_amount,
            token_type: 0u8,
            merchant_note: merchant_note
        };

        return (
            r1,
            r2,
            payer_receipt,
            merchant_receipt,
            final {
                let stored_hash: field = salt_to_invoice.get(salt);
                assert_eq(invoice_hash, stored_hash);

                let invoice_data: InvoiceData = invoices.get(stored_hash);
                assert_eq(invoice_data.token_type, 1u8); // Must be a USDCx invoice
                assert_eq(invoice_data.status, 0u8);

                if expires_at != 0u32 {
                    assert(block.height <= expires_at);
                }

                if invoice_data.expiry_height != 0u32 {
                    assert(block.height <= invoice_data.expiry_height);
                }

                let trusted_oracle: address = oracle_address.get(0u8);
                assert(signature::verify(oracle_sig, trusted_oracle, quote_hash));

                if invoice_data.invoice_type == 0u8 {
                    let updated_data: InvoiceData = InvoiceData {
                        expiry_height: invoice_data.expiry_height,
                        status: 1u8,
                        invoice_type: invoice_data.invoice_type,
                        token_type: invoice_data.token_type,
                        wallet_type: invoice_data.wallet_type
                    };
                    invoices.set(stored_hash, updated_data);
                }
            }
        );
    }

    // ─── Cross-Token Payments: USDCx invoice paid via USAD ────────
    fn pay_invoice_usdcx_via_usad(
        pay_record: test_usad_stablecoin.aleo::Token,
        merchant: address,
        public payer_owner: address,
        original_amount: u128,
        converted_amount: u128,
        salt: field,
        private payment_secret: field,
        private payer_note: field,
        private merchant_note: field,
        public message: field,
        private proofs: [test_usad_stablecoin.aleo::MerkleProof; 2],
        oracle_sig: signature,
        public expires_at: u32
    ) -> (test_usad_stablecoin.aleo::Token, test_usad_stablecoin.aleo::Token, test_usad_stablecoin.aleo::ComplianceRecord, PayerReceipt, MerchantReceipt, Final) {
        let (compliance_record, transfer_output_1, transfer_output_2, transfer_future): (test_usad_stablecoin.aleo::ComplianceRecord, test_usad_stablecoin.aleo::Token, test_usad_stablecoin.aleo::Token, Final) = 
            test_usad_stablecoin.aleo::transfer_private(merchant, converted_amount, pay_record, proofs);

        let merchant_field: field = merchant as field;
        let amount_field: field = original_amount as field;
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let quote: OracleQuote = OracleQuote {
            original_amount_micro: original_amount as u64,
            converted_amount_micro: converted_amount as u64,
            from_token_type: 1u8,
            to_token_type: 2u8,
            expires_at: expires_at
        };
        let quote_hash: field = BHP256::hash_to_field(quote);
        let is_valid: bool = signature::verify(oracle_sig, payer_owner, quote_hash);
        assert(is_valid);

        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: payer_owner,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: converted_amount as u64,
            token_type: 2u8,
            payer_note: payer_note,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: converted_amount as u64,
            token_type: 2u8,
            merchant_note: merchant_note
        };

        return (
            transfer_output_1,
            transfer_output_2,
            compliance_record,
            payer_receipt,
            merchant_receipt,
            final {
                transfer_future.run();

                let stored_hash: field = salt_to_invoice.get(salt);
                assert_eq(invoice_hash, stored_hash);

                let invoice_data: InvoiceData = invoices.get(stored_hash);
                assert_eq(invoice_data.token_type, 1u8);
                assert_eq(invoice_data.status, 0u8);

                if expires_at != 0u32 {
                    assert(block.height <= expires_at);
                }

                if invoice_data.expiry_height != 0u32 {
                    assert(block.height <= invoice_data.expiry_height);
                }

                let trusted_oracle: address = oracle_address.get(0u8);
                assert(signature::verify(oracle_sig, trusted_oracle, quote_hash));

                if invoice_data.invoice_type == 0u8 {
                    let updated_data: InvoiceData = InvoiceData {
                        expiry_height: invoice_data.expiry_height,
                        status: 1u8,
                        invoice_type: invoice_data.invoice_type,
                        token_type: invoice_data.token_type,
                        wallet_type: invoice_data.wallet_type
                    };
                    invoices.set(stored_hash, updated_data);
                }
            }
        );
    }

    // ─── Cross-Token Payments: USAD invoice paid via CREDITS ──────
    fn pay_invoice_usad_via_credits(
        pay_record: credits.aleo::credits,
        merchant: address,
        public payer_owner: address,
        original_amount: u128,
        converted_amount: u64,
        salt: field,
        private payment_secret: field,
        private payer_note: field,
        private merchant_note: field,
        public message: field,
        oracle_sig: signature,
        public expires_at: u32
    ) -> (credits.aleo::credits, credits.aleo::credits, PayerReceipt, MerchantReceipt, Final) {
        let (r1, r2): (credits.aleo::credits, credits.aleo::credits) = 
            credits.aleo::transfer_private(pay_record, merchant, converted_amount);

        let merchant_field: field = merchant as field;
        let amount_field: field = original_amount as field;
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let quote: OracleQuote = OracleQuote {
            original_amount_micro: original_amount as u64,
            converted_amount_micro: converted_amount,
            from_token_type: 2u8,  // USAD
            to_token_type: 0u8,    // CREDITS
            expires_at: expires_at
        };
        let quote_hash: field = BHP256::hash_to_field(quote);
        let is_valid: bool = signature::verify(oracle_sig, payer_owner, quote_hash);
        assert(is_valid);

        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: payer_owner,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: converted_amount,
            token_type: 0u8,
            payer_note: payer_note,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: converted_amount,
            token_type: 0u8,
            merchant_note: merchant_note
        };

        return (
            r1,
            r2,
            payer_receipt,
            merchant_receipt,
            final {
                let stored_hash: field = salt_to_invoice.get(salt);
                assert_eq(invoice_hash, stored_hash);

                let invoice_data: InvoiceData = invoices.get(stored_hash);
                assert_eq(invoice_data.token_type, 2u8); // Must be USAD invoice
                assert_eq(invoice_data.status, 0u8);

                if expires_at != 0u32 {
                    assert(block.height <= expires_at);
                }

                if invoice_data.expiry_height != 0u32 {
                    assert(block.height <= invoice_data.expiry_height);
                }

                let trusted_oracle: address = oracle_address.get(0u8);
                assert(signature::verify(oracle_sig, trusted_oracle, quote_hash));

                if invoice_data.invoice_type == 0u8 {
                    let updated_data: InvoiceData = InvoiceData {
                        expiry_height: invoice_data.expiry_height,
                        status: 1u8,
                        invoice_type: invoice_data.invoice_type,
                        token_type: invoice_data.token_type,
                        wallet_type: invoice_data.wallet_type
                    };
                    invoices.set(stored_hash, updated_data);
                }
            }
        );
    }

    // ─── Cross-Token Payments: USAD invoice paid via USDCx ────────
    fn pay_invoice_usad_via_usdcx(
        pay_record: test_usdcx_stablecoin.aleo::Token,
        merchant: address,
        public payer_owner: address,
        original_amount: u128,
        converted_amount: u128,
        salt: field,
        private payment_secret: field,
        private payer_note: field,
        private merchant_note: field,
        public message: field,
        private proofs: [test_usdcx_stablecoin.aleo::MerkleProof; 2],
        oracle_sig: signature,
        public expires_at: u32
    ) -> (test_usdcx_stablecoin.aleo::Token, test_usdcx_stablecoin.aleo::Token, test_usdcx_stablecoin.aleo::ComplianceRecord, PayerReceipt, MerchantReceipt, Final) {
        let (compliance_record, transfer_output_1, transfer_output_2, transfer_future): (test_usdcx_stablecoin.aleo::ComplianceRecord, test_usdcx_stablecoin.aleo::Token, test_usdcx_stablecoin.aleo::Token, Final) = 
            test_usdcx_stablecoin.aleo::transfer_private(merchant, converted_amount, pay_record, proofs);

        let merchant_field: field = merchant as field;
        let amount_field: field = original_amount as field;
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

        let quote: OracleQuote = OracleQuote {
            original_amount_micro: original_amount as u64,
            converted_amount_micro: converted_amount as u64,
            from_token_type: 2u8,
            to_token_type: 1u8,
            expires_at: expires_at
        };
        let quote_hash: field = BHP256::hash_to_field(quote);
        let is_valid: bool = signature::verify(oracle_sig, payer_owner, quote_hash);
        assert(is_valid);

        let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
        let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);

        let payer_receipt: PayerReceipt = PayerReceipt {
            owner: payer_owner,
            merchant: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: converted_amount as u64,
            token_type: 1u8,
            payer_note: payer_note,
            timestamp: 0u64
        };

        let merchant_receipt: MerchantReceipt = MerchantReceipt {
            owner: merchant,
            receipt_hash: receipt_hash,
            invoice_hash: invoice_hash,
            amount: converted_amount as u64,
            token_type: 1u8,
            merchant_note: merchant_note
        };

        return (
            transfer_output_1,
            transfer_output_2,
            compliance_record,
            payer_receipt,
            merchant_receipt,
            final {
                transfer_future.run();

                let stored_hash: field = salt_to_invoice.get(salt);
                assert_eq(invoice_hash, stored_hash);

                let invoice_data: InvoiceData = invoices.get(stored_hash);
                assert_eq(invoice_data.token_type, 2u8);
                assert_eq(invoice_data.status, 0u8);

                if expires_at != 0u32 {
                    assert(block.height <= expires_at);
                }

                if invoice_data.expiry_height != 0u32 {
                    assert(block.height <= invoice_data.expiry_height);
                }

                let trusted_oracle: address = oracle_address.get(0u8);
                assert(signature::verify(oracle_sig, trusted_oracle, quote_hash));

                if invoice_data.invoice_type == 0u8 {
                    let updated_data: InvoiceData = InvoiceData {
                        expiry_height: invoice_data.expiry_height,
                        status: 1u8,
                        invoice_type: invoice_data.invoice_type,
                        token_type: invoice_data.token_type,
                        wallet_type: invoice_data.wallet_type
                    };
                    invoices.set(stored_hash, updated_data);
                }
            }
        );
    }

    fn settle_invoice(
        public salt: field,
        private amount: u64
    ) -> Final {
        let merchant_field: field = self.caller as field;
        let amount_field: field = amount as field;
        
        let merchant_hash: field = BHP256::hash_to_field(merchant_field);
        let amount_hash: field = BHP256::hash_to_field(amount_field);
        let salt_hash: field = BHP256::hash_to_field(salt);
        
        let calculated_hash: field = merchant_hash + amount_hash + salt_hash;
        
        return final {
            let stored_hash: field = salt_to_invoice.get(salt);
            assert_eq(calculated_hash, stored_hash);

            let invoice_data: InvoiceData = invoices.get(stored_hash);

            let updated_data: InvoiceData = InvoiceData {
                expiry_height: invoice_data.expiry_height,
                status: 1u8,
                invoice_type: invoice_data.invoice_type,
                token_type: invoice_data.token_type,
                wallet_type: invoice_data.wallet_type
            };

            invoices.set(stored_hash, updated_data);
        };
    }

    fn get_invoice_status(
        public invoice_hash: field
    ) -> Final {
        return final {
            let invoice_data: InvoiceData = invoices.get(invoice_hash);
        };
    }
}
