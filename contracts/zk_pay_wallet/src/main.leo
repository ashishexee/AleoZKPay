import credits.aleo;
import test_usdcx_stablecoin.aleo;
import test_usad_stablecoin.aleo;

program zk_pay_proofs_privacy_wallet_v1.aleo {

    @admin(address="aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0")
    constructor() {
        // The Leo compiler automatically generates the constructor logic.
    }

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

    struct CardLookupData {
        main_owner: address,
        card_status: u8,
        profile_version: u8
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

    mapping card_lookup: field => CardLookupData;

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
    ) -> (CardProfileRecord, Final) {
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

        return (
            card_profile_record,
            final {
                let lookup_data: CardLookupData = CardLookupData {
                    main_owner: caller,
                    card_status: 0u8,
                    profile_version: profile_version
                };

                card_lookup.set(card_number_hash, lookup_data);
            }
        );
    }

    fn set_card_status(
        public card_number_hash: field,
        public next_status: u8
    ) -> Final {
        let caller: address = self.caller;
        return final {
            if next_status != 0u8 {
                assert_eq(next_status, 1u8);
            }

            let current_lookup: CardLookupData = card_lookup.get(card_number_hash);

            assert_eq(caller, current_lookup.main_owner);

            let updated_lookup: CardLookupData = CardLookupData {
                main_owner: current_lookup.main_owner,
                card_status: next_status,
                profile_version: current_lookup.profile_version
            };

            card_lookup.set(card_number_hash, updated_lookup);
        };
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
}
