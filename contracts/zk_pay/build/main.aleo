import credits.aleo;
import merkle_tree.aleo;
import test_usdcx_multisig_core.aleo;
import test_usdcx_freezelist.aleo;
import test_usdcx_stablecoin.aleo;
program zk_pay_proofs_privacy_v9.aleo;

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

struct InvoiceData:
    expiry_height as u32;
    status as u8;
    invoice_type as u8;
    token_type as u8;

struct MerkleProof:
    siblings as [field; 16u32];
    leaf_index as u32;

struct WalletEcdsaSigner:
    wallet_id as address;
    ecdsa_signer as [u8; 20u32];

struct AdminOp:
    op as u8;
    threshold as u8;
    aleo_signer as address;
    ecdsa_signer as [u8; 20u32];

mapping invoices:
    key as field.public;
    value as InvoiceData.public;

mapping salt_to_invoice:
    key as field.public;
    value as field.public;

function create_invoice:
    input r0 as address.private;
    input r1 as u64.private;
    input r2 as field.private;
    input r3 as u32.public;
    input r4 as u8.public;
    cast r0 into r5 as field;
    cast r1 into r6 as field;
    hash.bhp256 r5 into r7 as field;
    hash.bhp256 r6 into r8 as field;
    hash.bhp256 r2 into r9 as field;
    add r7 r8 into r10;
    add r10 r9 into r11;
    async create_invoice r11 r3 r2 r4 0u8 into r12;
    output r11 as field.public;
    output r12 as zk_pay_proofs_privacy_v9.aleo/create_invoice.future;

finalize create_invoice:
    input r0 as field.public;
    input r1 as u32.public;
    input r2 as field.public;
    input r3 as u8.public;
    input r4 as u8.public;
    mul r1 360u32 into r5;
    is.neq r1 0u32 into r6;
    add block.height r5 into r7;
    ternary r6 r7 0u32 into r8;
    cast r8 0u8 r3 r4 into r9 as InvoiceData;
    set r9 into invoices[r0];
    set r0 into salt_to_invoice[r2];

function create_invoice_usdcx:
    input r0 as address.private;
    input r1 as u128.private;
    input r2 as field.private;
    input r3 as u32.public;
    input r4 as u8.public;
    cast r0 into r5 as field;
    cast r1 into r6 as field;
    hash.bhp256 r5 into r7 as field;
    hash.bhp256 r6 into r8 as field;
    hash.bhp256 r2 into r9 as field;
    add r7 r8 into r10;
    add r10 r9 into r11;
    async create_invoice_usdcx r11 r3 r2 r4 1u8 into r12;
    output r11 as field.public;
    output r12 as zk_pay_proofs_privacy_v9.aleo/create_invoice_usdcx.future;

finalize create_invoice_usdcx:
    input r0 as field.public;
    input r1 as u32.public;
    input r2 as field.public;
    input r3 as u8.public;
    input r4 as u8.public;
    mul r1 360u32 into r5;
    is.neq r1 0u32 into r6;
    add block.height r5 into r7;
    ternary r6 r7 0u32 into r8;
    cast r8 0u8 r3 r4 into r9 as InvoiceData;
    set r9 into invoices[r0];
    set r0 into salt_to_invoice[r2];

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
    cast r2 into r19 as u128;
    async pay_invoice r14 r3 r19 0u8 into r20;
    output r6 as credits.aleo/credits.record;
    output r7 as credits.aleo/credits.record;
    output r17 as PayerReceipt.record;
    output r18 as MerchantReceipt.record;
    output r20 as zk_pay_proofs_privacy_v9.aleo/pay_invoice.future;

finalize pay_invoice:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u128.public;
    input r3 as u8.public;
    get salt_to_invoice[r1] into r4;
    assert.eq r0 r4;
    get invoices[r4] into r5;
    assert.eq r5.token_type r3;
    is.neq r5.expiry_height 0u32 into r6;
    branch.eq r6 false to end_then_0_0;
    lte block.height r5.expiry_height into r7;
    assert.eq r7 true;
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    position end_otherwise_0_1;
    is.eq r5.invoice_type 0u8 into r8;
    branch.eq r8 false to end_then_0_2;
    assert.eq r5.status 0u8;
    cast r5.expiry_height 1u8 r5.invoice_type r5.token_type into r9 as InvoiceData;
    set r9 into invoices[r4];
    branch.eq true true to end_otherwise_0_3;
    position end_then_0_2;
    position end_otherwise_0_3;

function pay_invoice_usdcx:
    input r0 as test_usdcx_stablecoin.aleo/Token.record;
    input r1 as address.private;
    input r2 as u128.private;
    input r3 as field.private;
    input r4 as field.private;
    input r5 as field.public;
    input r6 as [MerkleProof; 2u32].private;
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
    async pay_invoice_usdcx r17 r3 r2 1u8 r10 into r24;
    output r8 as test_usdcx_stablecoin.aleo/Token.record;
    output r9 as test_usdcx_stablecoin.aleo/Token.record;
    output r7 as test_usdcx_stablecoin.aleo/ComplianceRecord.record;
    output r21 as PayerReceipt.record;
    output r23 as MerchantReceipt.record;
    output r24 as zk_pay_proofs_privacy_v9.aleo/pay_invoice_usdcx.future;

finalize pay_invoice_usdcx:
    input r0 as field.public;
    input r1 as field.public;
    input r2 as u128.public;
    input r3 as u8.public;
    input r4 as test_usdcx_stablecoin.aleo/transfer_private.future;
    await r4;
    get salt_to_invoice[r1] into r5;
    assert.eq r0 r5;
    get invoices[r5] into r6;
    assert.eq r6.token_type r3;
    is.neq r6.expiry_height 0u32 into r7;
    branch.eq r7 false to end_then_0_4;
    lte block.height r6.expiry_height into r8;
    assert.eq r8 true;
    branch.eq true true to end_otherwise_0_5;
    position end_then_0_4;
    position end_otherwise_0_5;
    is.eq r6.invoice_type 0u8 into r9;
    branch.eq r9 false to end_then_0_6;
    assert.eq r6.status 0u8;
    cast r6.expiry_height 1u8 r6.invoice_type r6.token_type into r10 as InvoiceData;
    set r10 into invoices[r5];
    branch.eq true true to end_otherwise_0_7;
    position end_then_0_6;
    position end_otherwise_0_7;

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
    async settle_invoice r8 r0 into r9;
    output r9 as zk_pay_proofs_privacy_v9.aleo/settle_invoice.future;

finalize settle_invoice:
    input r0 as field.public;
    input r1 as field.public;
    get salt_to_invoice[r1] into r2;
    assert.eq r0 r2;
    get invoices[r2] into r3;
    cast r3.expiry_height 1u8 r3.invoice_type r3.token_type into r4 as InvoiceData;
    set r4 into invoices[r2];

function get_invoice_status:
    input r0 as field.public;
    async get_invoice_status r0 into r1;
    output r1 as zk_pay_proofs_privacy_v9.aleo/get_invoice_status.future;

finalize get_invoice_status:
    input r0 as field.public;
    get invoices[r0] into r1;

constructor:
    assert.eq program_owner aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0;
