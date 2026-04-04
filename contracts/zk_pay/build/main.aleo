import credits.aleo;
import merkle_tree.aleo;
import test_usdcx_multisig_core.aleo;
import test_usdcx_freezelist.aleo;
import test_usdcx_stablecoin.aleo;
import test_usad_multisig_core.aleo;
import test_usad_freezelist.aleo;
import test_usad_stablecoin.aleo;
program zk_pay_proofs_privacy_v23.aleo;

record PayerReceipt:
    owner as address.private;
    merchant as address.private;
    receipt_hash as field.private;
    invoice_hash as field.private;
    amount as u64.private;
    token_type as u8.private;
    timestamp as u64.private;

record MerchantReceipt:
    owner as address.private;
    receipt_hash as field.private;
    invoice_hash as field.private;
    amount as u64.private;
    token_type as u8.private;

record Invoice:
    owner as address.private;
    invoice_hash as field.private;
    amount as u64.private;
    token_type as u8.private;
    invoice_type as u8.private;
    salt as field.private;
    memo as field.private;
    wallet_type as u8.private;

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

struct InvoiceData:
    expiry_height as u32;
    status as u8;
    invoice_type as u8;
    token_type as u8;
    wallet_type as u8;

struct CardLookupData:
    main_owner as address;
    card_address as address;
    card_status as u8;
    profile_version as u8;
    card_kdf_algorithm as u8;
    card_kdf_iterations as u32;
    card_kdf_opslimit as u64;
    card_kdf_memlimit as u64;
    card_kdf_alg as u8;
    card_kdf_hash as u8;
    card_kdf_version as u8;
    encrypted_card_private_key_1 as field;
    encrypted_card_private_key_2 as field;
    encrypted_card_private_key_3 as field;
    encrypted_card_private_key_4 as field;
    encrypted_card_private_key_5 as field;
    encrypted_card_private_key_6 as field;
    encrypted_card_private_key_7 as field;
    encrypted_card_private_key_8 as field;
    card_kdf_salt_1 as field;
    card_kdf_salt_2 as field;
    card_kdf_salt_3 as field;

mapping invoices:
    key as field.public;
    value as InvoiceData.public;

mapping salt_to_invoice:
    key as field.public;
    value as field.public;

mapping card_lookup:
    key as field.public;
    value as CardLookupData.public;

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
    input r0 as address.private;
    input r1 as field.public;
    input r2 as u8.public;
    input r3 as u8.public;
    input r4 as u32.public;
    input r5 as u64.public;
    input r6 as u64.public;
    input r7 as u8.public;
    input r8 as u8.public;
    input r9 as u8.public;
    input r10 as [field; 8u32].private;
    input r11 as [field; 3u32].private;
    input r12 as [field; 6u32].private;
    input r13 as [field; 10u32].private;
    input r14 as [field; 10u32].private;
    input r15 as [field; 8u32].private;
    cast self.caller r1 r2 r12 r13 r14 r15 into r16 as CardProfileRecord.record;
    async create_card_profile self.caller r0 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r1 into r17;
    output r16 as CardProfileRecord.record;
    output r17 as zk_pay_proofs_privacy_v23.aleo/create_card_profile.future;

finalize create_card_profile:
    input r0 as address.public;
    input r1 as address.public;
    input r2 as u8.public;
    input r3 as u8.public;
    input r4 as u32.public;
    input r5 as u64.public;
    input r6 as u64.public;
    input r7 as u8.public;
    input r8 as u8.public;
    input r9 as u8.public;
    input r10 as [field; 8u32].public;
    input r11 as [field; 3u32].public;
    input r12 as field.public;
    cast r0 r1 0u8 r2 r3 r4 r5 r6 r7 r8 r9 r10[0u32] r10[1u32] r10[2u32] r10[3u32] r10[4u32] r10[5u32] r10[6u32] r10[7u32] r11[0u32] r11[1u32] r11[2u32] into r13 as CardLookupData;
    set r13 into card_lookup[r12];

function set_card_status:
    input r0 as field.public;
    input r1 as u8.public;
    async set_card_status r1 r0 self.caller into r2;
    output r2 as zk_pay_proofs_privacy_v23.aleo/set_card_status.future;

finalize set_card_status:
    input r0 as u8.public;
    input r1 as field.public;
    input r2 as address.public;
    is.neq r0 0u8 into r3;
    branch.eq r3 false to end_then_0_0;
    assert.eq r0 1u8;
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    position end_otherwise_0_1;
    get card_lookup[r1] into r4;
    is.neq r2 r4.main_owner into r5;
    branch.eq r5 false to end_then_0_2;
    assert.eq r2 r4.card_address;
    branch.eq true true to end_otherwise_0_3;
    position end_then_0_2;
    position end_otherwise_0_3;
    cast r4.main_owner r4.card_address r0 r4.profile_version r4.card_kdf_algorithm r4.card_kdf_iterations r4.card_kdf_opslimit r4.card_kdf_memlimit r4.card_kdf_alg r4.card_kdf_hash r4.card_kdf_version r4.encrypted_card_private_key_1 r4.encrypted_card_private_key_2 r4.encrypted_card_private_key_3 r4.encrypted_card_private_key_4 r4.encrypted_card_private_key_5 r4.encrypted_card_private_key_6 r4.encrypted_card_private_key_7 r4.encrypted_card_private_key_8 r4.card_kdf_salt_1 r4.card_kdf_salt_2 r4.card_kdf_salt_3 into r6 as CardLookupData;
    set r6 into card_lookup[r1];

function create_invoice:
    input r0 as address.private;
    input r1 as u64.private;
    input r2 as field.private;
    input r3 as field.private;
    input r4 as u32.public;
    input r5 as u8.public;
    input r6 as u8.public;
    cast r0 into r7 as field;
    cast r1 into r8 as field;
    hash.bhp256 r7 into r9 as field;
    hash.bhp256 r8 into r10 as field;
    hash.bhp256 r2 into r11 as field;
    add r9 r10 into r12;
    add r12 r11 into r13;
    cast r0 r13 r1 0u8 r5 r2 r3 r6 into r14 as Invoice.record;
    async create_invoice r4 r5 r6 r13 r2 into r15;
    output r14 as Invoice.record;
    output r13 as field.public;
    output r15 as zk_pay_proofs_privacy_v23.aleo/create_invoice.future;

finalize create_invoice:
    input r0 as u32.public;
    input r1 as u8.public;
    input r2 as u8.public;
    input r3 as field.public;
    input r4 as field.public;
    mul r0 360u32 into r5;
    is.neq r0 0u32 into r6;
    add block.height r5 into r7;
    ternary r6 r7 0u32 into r8;
    cast r8 0u8 r1 0u8 r2 into r9 as InvoiceData;
    set r9 into invoices[r3];
    set r3 into salt_to_invoice[r4];

function create_invoice_usdcx:
    input r0 as address.private;
    input r1 as u128.private;
    input r2 as field.private;
    input r3 as field.private;
    input r4 as u32.public;
    input r5 as u8.public;
    input r6 as u8.public;
    cast r0 into r7 as field;
    cast r1 into r8 as field;
    hash.bhp256 r7 into r9 as field;
    hash.bhp256 r8 into r10 as field;
    hash.bhp256 r2 into r11 as field;
    add r9 r10 into r12;
    add r12 r11 into r13;
    cast r1 into r14 as u64;
    cast r0 r13 r14 1u8 r5 r2 r3 r6 into r15 as Invoice.record;
    async create_invoice_usdcx r4 r5 r6 r13 r2 into r16;
    output r15 as Invoice.record;
    output r13 as field.public;
    output r16 as zk_pay_proofs_privacy_v23.aleo/create_invoice_usdcx.future;

finalize create_invoice_usdcx:
    input r0 as u32.public;
    input r1 as u8.public;
    input r2 as u8.public;
    input r3 as field.public;
    input r4 as field.public;
    mul r0 360u32 into r5;
    is.neq r0 0u32 into r6;
    add block.height r5 into r7;
    ternary r6 r7 0u32 into r8;
    cast r8 0u8 r1 1u8 r2 into r9 as InvoiceData;
    set r9 into invoices[r3];
    set r3 into salt_to_invoice[r4];

function create_invoice_usad:
    input r0 as address.private;
    input r1 as u128.private;
    input r2 as field.private;
    input r3 as field.private;
    input r4 as u32.public;
    input r5 as u8.public;
    input r6 as u8.public;
    cast r0 into r7 as field;
    cast r1 into r8 as field;
    hash.bhp256 r7 into r9 as field;
    hash.bhp256 r8 into r10 as field;
    hash.bhp256 r2 into r11 as field;
    add r9 r10 into r12;
    add r12 r11 into r13;
    cast r1 into r14 as u64;
    cast r0 r13 r14 2u8 r5 r2 r3 r6 into r15 as Invoice.record;
    async create_invoice_usad r4 r5 r6 r13 r2 into r16;
    output r15 as Invoice.record;
    output r13 as field.public;
    output r16 as zk_pay_proofs_privacy_v23.aleo/create_invoice_usad.future;

finalize create_invoice_usad:
    input r0 as u32.public;
    input r1 as u8.public;
    input r2 as u8.public;
    input r3 as field.public;
    input r4 as field.public;
    mul r0 360u32 into r5;
    is.neq r0 0u32 into r6;
    add block.height r5 into r7;
    ternary r6 r7 0u32 into r8;
    cast r8 0u8 r1 2u8 r2 into r9 as InvoiceData;
    set r9 into invoices[r3];
    set r3 into salt_to_invoice[r4];

function create_invoice_any:
    input r0 as address.private;
    input r1 as u128.private;
    input r2 as field.private;
    input r3 as field.private;
    input r4 as u32.public;
    input r5 as u8.public;
    input r6 as u8.public;
    cast r0 into r7 as field;
    cast r1 into r8 as field;
    hash.bhp256 r7 into r9 as field;
    hash.bhp256 r8 into r10 as field;
    hash.bhp256 r2 into r11 as field;
    add r9 r10 into r12;
    add r12 r11 into r13;
    cast r1 into r14 as u64;
    cast r0 r13 r14 3u8 r5 r2 r3 r6 into r15 as Invoice.record;
    async create_invoice_any r4 r5 r6 r13 r2 into r16;
    output r15 as Invoice.record;
    output r13 as field.public;
    output r16 as zk_pay_proofs_privacy_v23.aleo/create_invoice_any.future;

finalize create_invoice_any:
    input r0 as u32.public;
    input r1 as u8.public;
    input r2 as u8.public;
    input r3 as field.public;
    input r4 as field.public;
    mul r0 360u32 into r5;
    is.neq r0 0u32 into r6;
    add block.height r5 into r7;
    ternary r6 r7 0u32 into r8;
    cast r8 0u8 r1 3u8 r2 into r9 as InvoiceData;
    set r9 into invoices[r3];
    set r3 into salt_to_invoice[r4];

function pay_donation:
    input r0 as credits.aleo/credits.record;
    input r1 as address.private;
    input r2 as u64.private;
    input r3 as field.private;
    input r4 as field.private;
    input r5 as field.public;
    call credits.aleo/transfer_private r0 r1 r2 into r6 r7;
    cast r1 into r8 as field;
    hash.bhp256 r8 into r9 as field;
    hash.bhp256 0field into r10 as field;
    hash.bhp256 r3 into r11 as field;
    add r9 r10 into r12;
    add r12 r11 into r13;
    hash.bhp256 r3 into r14 as scalar;
    cast r2 into r15 as field;
    hash.bhp256 r15 into r16 as field;
    add r4 r16 into r17;
    add r17 6483909679030553276222748262902265455236698137743464346806854780005049792424field into r18;
    commit.bhp256 r18 r14 into r19 as field;
    cast self.caller r1 r19 r13 r2 0u8 0u64 into r20 as PayerReceipt.record;
    cast r1 r19 r13 r2 0u8 into r21 as MerchantReceipt.record;
    async pay_donation r3 r13 into r22;
    output r6 as credits.aleo/credits.record;
    output r7 as credits.aleo/credits.record;
    output r20 as PayerReceipt.record;
    output r21 as MerchantReceipt.record;
    output r22 as zk_pay_proofs_privacy_v23.aleo/pay_donation.future;

finalize pay_donation:
    input r0 as field.public;
    input r1 as field.public;
    get salt_to_invoice[r0] into r2;
    assert.eq r1 r2;
    get invoices[r2] into r3;
    is.neq r3.token_type 3u8 into r4;
    branch.eq r4 false to end_then_0_4;
    assert.eq r3.token_type 0u8;
    branch.eq true true to end_otherwise_0_5;
    position end_then_0_4;
    position end_otherwise_0_5;
    assert.eq r3.invoice_type 2u8;
    assert.eq r3.status 0u8;
    is.neq r3.expiry_height 0u32 into r5;
    branch.eq r5 false to end_then_0_6;
    lte block.height r3.expiry_height into r6;
    assert.eq r6 true;
    branch.eq true true to end_otherwise_0_7;
    position end_then_0_6;
    position end_otherwise_0_7;

function pay_invoice:
    input r0 as credits.aleo/credits.record;
    input r1 as address.private;
    input r2 as u64.private;
    input r3 as field.private;
    input r4 as field.private;
    input r5 as field.public;
    call credits.aleo/transfer_private r0 r1 r2 into r6 r7;
    cast r1 into r8 as field;
    cast r2 into r9 as field;
    hash.bhp256 r8 into r10 as field;
    hash.bhp256 r9 into r11 as field;
    hash.bhp256 r3 into r12 as field;
    add r10 r11 into r13;
    add r13 r12 into r14;
    hash.bhp256 r3 into r15 as scalar;
    commit.bhp256 r4 r15 into r16 as field;
    cast self.caller r1 r16 r14 r2 0u8 0u64 into r17 as PayerReceipt.record;
    cast r1 r16 r14 r2 0u8 into r18 as MerchantReceipt.record;
    async pay_invoice r3 r14 into r19;
    output r6 as credits.aleo/credits.record;
    output r7 as credits.aleo/credits.record;
    output r17 as PayerReceipt.record;
    output r18 as MerchantReceipt.record;
    output r19 as zk_pay_proofs_privacy_v23.aleo/pay_invoice.future;

finalize pay_invoice:
    input r0 as field.public;
    input r1 as field.public;
    get salt_to_invoice[r0] into r2;
    assert.eq r1 r2;
    get invoices[r2] into r3;
    assert.eq r3.token_type 0u8;
    is.neq r3.expiry_height 0u32 into r4;
    branch.eq r4 false to end_then_0_8;
    lte block.height r3.expiry_height into r5;
    assert.eq r5 true;
    branch.eq true true to end_otherwise_0_9;
    position end_then_0_8;
    position end_otherwise_0_9;
    assert.eq r3.status 0u8;
    is.eq r3.invoice_type 0u8 into r6;
    branch.eq r6 false to end_then_0_10;
    cast r3.expiry_height 1u8 r3.invoice_type r3.token_type r3.wallet_type into r7 as InvoiceData;
    set r7 into invoices[r2];
    branch.eq true true to end_otherwise_0_11;
    position end_then_0_10;
    position end_otherwise_0_11;

function pay_invoice_usdcx:
    input r0 as test_usdcx_stablecoin.aleo/Token.record;
    input r1 as address.private;
    input r2 as u128.private;
    input r3 as field.private;
    input r4 as field.private;
    input r5 as field.public;
    input r6 as [test_usdcx_stablecoin.aleo/MerkleProof; 2u32].private;
    call test_usdcx_stablecoin.aleo/transfer_private r1 r2 r0 r6 into r7 r8 r9 r10;
    cast r1 into r11 as field;
    cast r2 into r12 as field;
    hash.bhp256 r11 into r13 as field;
    hash.bhp256 r12 into r14 as field;
    hash.bhp256 r3 into r15 as field;
    add r13 r14 into r16;
    add r16 r15 into r17;
    hash.bhp256 r3 into r18 as scalar;
    commit.bhp256 r4 r18 into r19 as field;
    cast r2 into r20 as u64;
    cast self.caller r1 r19 r17 r20 1u8 0u64 into r21 as PayerReceipt.record;
    cast r2 into r22 as u64;
    cast r1 r19 r17 r22 1u8 into r23 as MerchantReceipt.record;
    async pay_invoice_usdcx r10 r3 r17 into r24;
    output r8 as test_usdcx_stablecoin.aleo/Token.record;
    output r9 as test_usdcx_stablecoin.aleo/Token.record;
    output r7 as test_usdcx_stablecoin.aleo/ComplianceRecord.record;
    output r21 as PayerReceipt.record;
    output r23 as MerchantReceipt.record;
    output r24 as zk_pay_proofs_privacy_v23.aleo/pay_invoice_usdcx.future;

finalize pay_invoice_usdcx:
    input r0 as test_usdcx_stablecoin.aleo/transfer_private.future;
    input r1 as field.public;
    input r2 as field.public;
    await r0;
    get salt_to_invoice[r1] into r3;
    assert.eq r2 r3;
    get invoices[r3] into r4;
    assert.eq r4.token_type 1u8;
    is.neq r4.expiry_height 0u32 into r5;
    branch.eq r5 false to end_then_0_12;
    lte block.height r4.expiry_height into r6;
    assert.eq r6 true;
    branch.eq true true to end_otherwise_0_13;
    position end_then_0_12;
    position end_otherwise_0_13;
    assert.eq r4.status 0u8;
    is.eq r4.invoice_type 0u8 into r7;
    branch.eq r7 false to end_then_0_14;
    cast r4.expiry_height 1u8 r4.invoice_type r4.token_type r4.wallet_type into r8 as InvoiceData;
    set r8 into invoices[r3];
    branch.eq true true to end_otherwise_0_15;
    position end_then_0_14;
    position end_otherwise_0_15;

function pay_invoice_usad:
    input r0 as test_usad_stablecoin.aleo/Token.record;
    input r1 as address.private;
    input r2 as u128.private;
    input r3 as field.private;
    input r4 as field.private;
    input r5 as field.public;
    input r6 as [test_usad_stablecoin.aleo/MerkleProof; 2u32].private;
    call test_usad_stablecoin.aleo/transfer_private r1 r2 r0 r6 into r7 r8 r9 r10;
    cast r1 into r11 as field;
    cast r2 into r12 as field;
    hash.bhp256 r11 into r13 as field;
    hash.bhp256 r12 into r14 as field;
    hash.bhp256 r3 into r15 as field;
    add r13 r14 into r16;
    add r16 r15 into r17;
    hash.bhp256 r3 into r18 as scalar;
    commit.bhp256 r4 r18 into r19 as field;
    cast r2 into r20 as u64;
    cast self.caller r1 r19 r17 r20 2u8 0u64 into r21 as PayerReceipt.record;
    cast r2 into r22 as u64;
    cast r1 r19 r17 r22 2u8 into r23 as MerchantReceipt.record;
    async pay_invoice_usad r10 r3 r17 into r24;
    output r8 as test_usad_stablecoin.aleo/Token.record;
    output r9 as test_usad_stablecoin.aleo/Token.record;
    output r7 as test_usad_stablecoin.aleo/ComplianceRecord.record;
    output r21 as PayerReceipt.record;
    output r23 as MerchantReceipt.record;
    output r24 as zk_pay_proofs_privacy_v23.aleo/pay_invoice_usad.future;

finalize pay_invoice_usad:
    input r0 as test_usad_stablecoin.aleo/transfer_private.future;
    input r1 as field.public;
    input r2 as field.public;
    await r0;
    get salt_to_invoice[r1] into r3;
    assert.eq r2 r3;
    get invoices[r3] into r4;
    assert.eq r4.token_type 2u8;
    is.neq r4.expiry_height 0u32 into r5;
    branch.eq r5 false to end_then_0_16;
    lte block.height r4.expiry_height into r6;
    assert.eq r6 true;
    branch.eq true true to end_otherwise_0_17;
    position end_then_0_16;
    position end_otherwise_0_17;
    assert.eq r4.status 0u8;
    is.eq r4.invoice_type 0u8 into r7;
    branch.eq r7 false to end_then_0_18;
    cast r4.expiry_height 1u8 r4.invoice_type r4.token_type r4.wallet_type into r8 as InvoiceData;
    set r8 into invoices[r3];
    branch.eq true true to end_otherwise_0_19;
    position end_then_0_18;
    position end_otherwise_0_19;

function pay_donation_usdcx:
    input r0 as test_usdcx_stablecoin.aleo/Token.record;
    input r1 as address.private;
    input r2 as u128.private;
    input r3 as field.private;
    input r4 as field.private;
    input r5 as field.public;
    input r6 as [test_usdcx_stablecoin.aleo/MerkleProof; 2u32].private;
    call test_usdcx_stablecoin.aleo/transfer_private r1 r2 r0 r6 into r7 r8 r9 r10;
    cast r1 into r11 as field;
    hash.bhp256 r11 into r12 as field;
    hash.bhp256 0field into r13 as field;
    hash.bhp256 r3 into r14 as field;
    add r12 r13 into r15;
    add r15 r14 into r16;
    hash.bhp256 r3 into r17 as scalar;
    cast r2 into r18 as field;
    hash.bhp256 r18 into r19 as field;
    add r4 r19 into r20;
    add r20 3260460799406925384450789443848721250796883831019095717716089006895746294528field into r21;
    commit.bhp256 r21 r17 into r22 as field;
    cast r2 into r23 as u64;
    cast self.caller r1 r22 r16 r23 1u8 0u64 into r24 as PayerReceipt.record;
    cast r2 into r25 as u64;
    cast r1 r22 r16 r25 1u8 into r26 as MerchantReceipt.record;
    async pay_donation_usdcx r10 r3 r16 into r27;
    output r8 as test_usdcx_stablecoin.aleo/Token.record;
    output r9 as test_usdcx_stablecoin.aleo/Token.record;
    output r7 as test_usdcx_stablecoin.aleo/ComplianceRecord.record;
    output r24 as PayerReceipt.record;
    output r26 as MerchantReceipt.record;
    output r27 as zk_pay_proofs_privacy_v23.aleo/pay_donation_usdcx.future;

finalize pay_donation_usdcx:
    input r0 as test_usdcx_stablecoin.aleo/transfer_private.future;
    input r1 as field.public;
    input r2 as field.public;
    await r0;
    get salt_to_invoice[r1] into r3;
    assert.eq r2 r3;
    get invoices[r3] into r4;
    is.neq r4.token_type 3u8 into r5;
    branch.eq r5 false to end_then_0_20;
    assert.eq r4.token_type 1u8;
    branch.eq true true to end_otherwise_0_21;
    position end_then_0_20;
    position end_otherwise_0_21;
    assert.eq r4.invoice_type 2u8;
    assert.eq r4.status 0u8;
    is.neq r4.expiry_height 0u32 into r6;
    branch.eq r6 false to end_then_0_22;
    lte block.height r4.expiry_height into r7;
    assert.eq r7 true;
    branch.eq true true to end_otherwise_0_23;
    position end_then_0_22;
    position end_otherwise_0_23;

function pay_donation_usad:
    input r0 as test_usad_stablecoin.aleo/Token.record;
    input r1 as address.private;
    input r2 as u128.private;
    input r3 as field.private;
    input r4 as field.private;
    input r5 as field.public;
    input r6 as [test_usad_stablecoin.aleo/MerkleProof; 2u32].private;
    call test_usad_stablecoin.aleo/transfer_private r1 r2 r0 r6 into r7 r8 r9 r10;
    cast r1 into r11 as field;
    hash.bhp256 r11 into r12 as field;
    hash.bhp256 0field into r13 as field;
    hash.bhp256 r3 into r14 as field;
    add r12 r13 into r15;
    add r15 r14 into r16;
    hash.bhp256 r3 into r17 as scalar;
    cast r2 into r18 as field;
    hash.bhp256 r18 into r19 as field;
    add r4 r19 into r20;
    add r20 3736522601382494394255789052466017870786031735005680174691203879959757105441field into r21;
    commit.bhp256 r21 r17 into r22 as field;
    cast r2 into r23 as u64;
    cast self.caller r1 r22 r16 r23 2u8 0u64 into r24 as PayerReceipt.record;
    cast r2 into r25 as u64;
    cast r1 r22 r16 r25 2u8 into r26 as MerchantReceipt.record;
    async pay_donation_usad r10 r3 r16 into r27;
    output r8 as test_usad_stablecoin.aleo/Token.record;
    output r9 as test_usad_stablecoin.aleo/Token.record;
    output r7 as test_usad_stablecoin.aleo/ComplianceRecord.record;
    output r24 as PayerReceipt.record;
    output r26 as MerchantReceipt.record;
    output r27 as zk_pay_proofs_privacy_v23.aleo/pay_donation_usad.future;

finalize pay_donation_usad:
    input r0 as test_usad_stablecoin.aleo/transfer_private.future;
    input r1 as field.public;
    input r2 as field.public;
    await r0;
    get salt_to_invoice[r1] into r3;
    assert.eq r2 r3;
    get invoices[r3] into r4;
    is.neq r4.token_type 3u8 into r5;
    branch.eq r5 false to end_then_0_24;
    assert.eq r4.token_type 2u8;
    branch.eq true true to end_otherwise_0_25;
    position end_then_0_24;
    position end_otherwise_0_25;
    assert.eq r4.invoice_type 2u8;
    assert.eq r4.status 0u8;
    is.neq r4.expiry_height 0u32 into r6;
    branch.eq r6 false to end_then_0_26;
    lte block.height r4.expiry_height into r7;
    assert.eq r7 true;
    branch.eq true true to end_otherwise_0_27;
    position end_then_0_26;
    position end_otherwise_0_27;

function settle_invoice:
    input r0 as field.public;
    input r1 as u64.private;
    cast self.caller into r2 as field;
    cast r1 into r3 as field;
    hash.bhp256 r2 into r4 as field;
    hash.bhp256 r3 into r5 as field;
    hash.bhp256 r0 into r6 as field;
    add r4 r5 into r7;
    add r7 r6 into r8;
    async settle_invoice r0 r8 into r9;
    output r9 as zk_pay_proofs_privacy_v23.aleo/settle_invoice.future;

finalize settle_invoice:
    input r0 as field.public;
    input r1 as field.public;
    get salt_to_invoice[r0] into r2;
    assert.eq r1 r2;
    get invoices[r2] into r3;
    cast r3.expiry_height 1u8 r3.invoice_type r3.token_type r3.wallet_type into r4 as InvoiceData;
    set r4 into invoices[r2];

function get_invoice_status:
    input r0 as field.public;
    async get_invoice_status r0 into r1;
    output r1 as zk_pay_proofs_privacy_v23.aleo/get_invoice_status.future;

finalize get_invoice_status:
    input r0 as field.public;
    get invoices[r0] into r1;

constructor:
    assert.eq program_owner aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0;
