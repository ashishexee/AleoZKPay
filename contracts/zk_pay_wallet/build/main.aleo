import credits.aleo;
import merkle_tree.aleo;
import test_usdcx_multisig_core.aleo;
import test_usdcx_freezelist.aleo;
import test_usdcx_stablecoin.aleo;
import test_usad_multisig_core.aleo;
import test_usad_freezelist.aleo;
import test_usad_stablecoin.aleo;
program zk_pay_proofs_privacy_wallet_v2.aleo;

record BurnerWalletRecord:
    owner as address.private;
    burner_address as address.private;
    password_part as field.private;
    pk_part_1 as field.private;
    pk_part_2 as field.private;
    pk_part_3 as field.private;
    pk_part_4 as field.private;
    pk_part_5 as field.private;
    pk_part_6 as field.private;
    pk_part_7 as field.private;
    pk_part_8 as field.private;
    pk_part_9 as field.private;
    pk_part_10 as field.private;

record CardProfileRecord:
    owner as address.private;
    card_number_hash as field.private;
    profile_version as u8.private;
    encrypted_card_number as [field; 6u32].private;
    encrypted_card_address as [field; 10u32].private;
    encrypted_label as [field; 10u32].private;
    encrypted_hint as [field; 8u32].private;

record GiftCardRecord:
    owner as address.private;
    gift_card_address as address.private;
    gift_private_key as [field; 8u32].private;
    label as field.private;

function backup_password:
    input r0 as field.private;
    cast self.caller self.caller r0 0field 0field 0field 0field 0field 0field 0field 0field 0field 0field into r1 as BurnerWalletRecord.record;
    output r1 as BurnerWalletRecord.record;

function backup_burner_wallet:
    input r0 as address.private;
    input r1 as field.private;
    input r2 as field.private;
    input r3 as field.private;
    input r4 as field.private;
    input r5 as field.private;
    input r6 as field.private;
    input r7 as field.private;
    input r8 as field.private;
    input r9 as field.private;
    input r10 as field.private;
    input r11 as field.private;
    cast self.caller r0 r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 into r12 as BurnerWalletRecord.record;
    output r12 as BurnerWalletRecord.record;

function create_card_profile:
    input r0 as field.private;
    input r1 as u8.public;
    input r2 as [field; 6u32].private;
    input r3 as [field; 10u32].private;
    input r4 as [field; 10u32].private;
    input r5 as [field; 8u32].private;
    cast self.caller r0 r1 r2 r3 r4 r5 into r6 as CardProfileRecord.record;
    output r6 as CardProfileRecord.record;

function create_gift_card_record:
    input r0 as address.private;
    input r1 as [field; 8u32].private;
    input r2 as field.private;
    cast self.caller r0 r1 r2 into r3 as GiftCardRecord.record;
    output r3 as GiftCardRecord.record;

constructor:
    assert.eq program_owner aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0;
