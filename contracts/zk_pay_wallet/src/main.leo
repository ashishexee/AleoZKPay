import credits.aleo;
import test_usdcx_stablecoin.aleo;
import test_usad_stablecoin.aleo;

program zk_pay_proofs_privacy_wallet_v4.aleo {

    @admin(address="aleo1d5hc09stpfpp3y7xhw9v306th9hrjt6qj8jj3h0rxjwv2y4rrypspfycge")
    constructor() {
        // The Leo compiler automatically generates the constructor logic.
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
        amount: u64,          // Amount Paid
        token_type: u8,       // 0 = Credits, 1 = USDCx, 2 = USAD
        payer_note: field,    // Payer-only note
        timestamp: u64,       // Approximate block time
    }

    record MerchantReceipt {
        owner: address,       // The Merchant
        receipt_hash: field,  // Unique Payment ID
        invoice_hash: field,  // Link to specific invoice
        amount: u64,          // Amount Received
        token_type: u8,       // 0 = Credits, 1 = USDCx, 2 = USAD
        merchant_note: field, // Merchant-visible note
    }

    mapping oracle_address: u8 => address;  // key 0u8 => trusted oracle address

    record BurnerWalletRecord {
        owner: address,
        burner_address: address,
        password_part: field,
        pk_part_1: field,
        pk_part_2: field,
        pk_part_3: field,
        pk_part_4: field,
        pk_part_5: field,
        pk_part_6: field,
        pk_part_7: field,
        pk_part_8: field,
        pk_part_9: field,
        pk_part_10: field
    }

    record CardProfileRecord {
        owner: address,
        card_number_hash: field,
        profile_version: u8,
        encrypted_card_number: [field; 6],
        encrypted_card_address: [field; 10],
        encrypted_label: [field; 10],
        encrypted_hint: [field; 8]
    }

    record GiftCardRecord {
        owner: address,
        gift_card_address: address,
        gift_private_key: [field; 8],
        label: field
    }

    fn backup_password(
        private password_part: field
    ) -> BurnerWalletRecord {
        return BurnerWalletRecord {
            owner: self.caller,
            burner_address: self.caller,
            password_part: password_part,
            pk_part_1: 0field,
            pk_part_2: 0field,
            pk_part_3: 0field,
            pk_part_4: 0field,
            pk_part_5: 0field,
            pk_part_6: 0field,
            pk_part_7: 0field,
            pk_part_8: 0field,
            pk_part_9: 0field,
            pk_part_10: 0field
        };
    }

    fn backup_burner_wallet(
        private burner_address: address,
        private password_part: field,
        private pk_part_1: field,
        private pk_part_2: field,
        private pk_part_3: field,
        private pk_part_4: field,
        private pk_part_5: field,
        private pk_part_6: field,
        private pk_part_7: field,
        private pk_part_8: field,
        private pk_part_9: field,
        private pk_part_10: field
    ) -> BurnerWalletRecord {
        return BurnerWalletRecord {
            owner: self.caller,
            burner_address: burner_address,
            password_part: password_part,
            pk_part_1: pk_part_1,
            pk_part_2: pk_part_2,
            pk_part_3: pk_part_3,
            pk_part_4: pk_part_4,
            pk_part_5: pk_part_5,
            pk_part_6: pk_part_6,
            pk_part_7: pk_part_7,
            pk_part_8: pk_part_8,
            pk_part_9: pk_part_9,
            pk_part_10: pk_part_10
        };
    }

    fn create_card_profile(
        private card_number_hash: field,
        public profile_version: u8,
        private encrypted_card_number: [field; 6],
        private encrypted_card_address: [field; 10],
        private encrypted_label: [field; 10],
        private encrypted_hint: [field; 8]
    ) -> CardProfileRecord {
        let caller: address = self.caller;
        let card_profile_record: CardProfileRecord = CardProfileRecord {
            owner: caller,
            card_number_hash: card_number_hash,
            profile_version: profile_version,
            encrypted_card_number: encrypted_card_number,
            encrypted_card_address: encrypted_card_address,
            encrypted_label: encrypted_label,
            encrypted_hint: encrypted_hint
        };

        return card_profile_record;
    }

    fn create_gift_card_record(
        private gift_card_address: address,
        private gift_private_key: [field; 8],
        private label: field
    ) -> GiftCardRecord {
        return GiftCardRecord {
            owner: self.caller,
            gift_card_address: gift_card_address,
            gift_private_key: gift_private_key,
            label: label
        };
    }

    // ─── Admin: Set Oracle Address ─────────────────────────────────
    fn set_oracle_address(
        public oracle_addr: address
    ) -> Final {
        // Admin matches constructor
        assert_eq(self.caller, aleo1d5hc09stpfpp3y7xhw9v306th9hrjt6qj8jj3h0rxjwv2y4rrypspfycge);
        return final {
            oracle_address.set(0u8, oracle_addr);
        };
    }

    // ─── Cross-Token Payments Logic ────────────────────────────────

    fn pay_invoice_credits_via_usdcx(
        pay_record: test_usdcx_stablecoin.aleo::Token,
        merchant: address,
        public payer_owner: address,
        original_amount: u64,
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
            original_amount_micro: original_amount,
            converted_amount_micro: converted_amount as u64,
            from_token_type: 0u8,
            to_token_type: 1u8,
            expires_at: expires_at
        };
        let quote_hash: field = BHP256::hash_to_field(quote);
        
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
                let trusted_oracle: address = oracle_address.get(0u8);
                assert(signature::verify(oracle_sig, trusted_oracle, quote_hash));
                if expires_at != 0u32 {
                    assert(block.height <= expires_at);
                }
            }
        );
    }

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
            to_token_type: 2u8,
            expires_at: expires_at
        };
        let quote_hash: field = BHP256::hash_to_field(quote);
        
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
                let trusted_oracle: address = oracle_address.get(0u8);
                assert(signature::verify(oracle_sig, trusted_oracle, quote_hash));
                if expires_at != 0u32 {
                    assert(block.height <= expires_at);
                }
            }
        );
    }

    fn pay_invoice_usdcx_via_credits(
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
            from_token_type: 1u8,
            to_token_type: 0u8,
            expires_at: expires_at
        };
        let quote_hash: field = BHP256::hash_to_field(quote);
        
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
                let trusted_oracle: address = oracle_address.get(0u8);
                assert(signature::verify(oracle_sig, trusted_oracle, quote_hash));
                if expires_at != 0u32 {
                    assert(block.height <= expires_at);
                }
            }
        );
    }

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
                let trusted_oracle: address = oracle_address.get(0u8);
                assert(signature::verify(oracle_sig, trusted_oracle, quote_hash));
                if expires_at != 0u32 {
                    assert(block.height <= expires_at);
                }
            }
        );
    }

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
            from_token_type: 2u8,
            to_token_type: 0u8,
            expires_at: expires_at
        };
        let quote_hash: field = BHP256::hash_to_field(quote);
        
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
                let trusted_oracle: address = oracle_address.get(0u8);
                assert(signature::verify(oracle_sig, trusted_oracle, quote_hash));
                if expires_at != 0u32 {
                    assert(block.height <= expires_at);
                }
            }
        );
    }

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
                let trusted_oracle: address = oracle_address.get(0u8);
                assert(signature::verify(oracle_sig, trusted_oracle, quote_hash));
                if expires_at != 0u32 {
                    assert(block.height <= expires_at);
                }
            }
        );
    }
}
