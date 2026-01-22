import credits.aleo;
program zk_pay_proofs_privacy_v2.aleo;

struct InvoiceData:
    expiry_height as u32;
    status as u8;

mapping invoices:
    key as field.public;
    value as InvoiceData.public;

function create_invoice:
    input r0 as field.public;
    input r1 as u32.public;
    async create_invoice r0 r1 into r2;
    output r2 as zk_pay_proofs_privacy_v2.aleo/create_invoice.future;

finalize create_invoice:
    input r0 as field.public;
    input r1 as u32.public;
    mul r1 360u32 into r2;
    is.neq r1 0u32 into r3;
    add block.height r2 into r4;
    ternary r3 r4 0u32 into r5;
    cast r5 0u8 into r6 as InvoiceData;
    set r6 into invoices[r0];

function pay_invoice:
    input r0 as credits.aleo/credits.record;
    input r1 as address.private;
    input r2 as u64.private;
    input r3 as field.private;
    input r4 as field.public;
    call credits.aleo/transfer_private r0 r1 r2 into r5 r6;
    hash.bhp256 r1 into r7 as field;
    hash.bhp256 r2 into r8 as field;
    hash.bhp256 r3 into r9 as field;
    add r7 r8 into r10;
    add r10 r9 into r11;
    assert.eq r4 r11;
    async pay_invoice r4 into r12;
    output r5 as credits.aleo/credits.record;
    output r6 as credits.aleo/credits.record;
    output r12 as zk_pay_proofs_privacy_v2.aleo/pay_invoice.future;

finalize pay_invoice:
    input r0 as field.public;
    get invoices[r0] into r1;
    is.neq r1.expiry_height 0u32 into r2;
    branch.eq r2 false to end_then_0_0;
    lte block.height r1.expiry_height into r3;
    assert.eq r3 true;
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    position end_otherwise_0_1;
    assert.eq r1.status 0u8;
    cast r1.expiry_height 1u8 into r4 as InvoiceData;
    set r4 into invoices[r0];

function get_invoice_status:
    input r0 as field.public;
    async get_invoice_status r0 into r1;
    output r1 as zk_pay_proofs_privacy_v2.aleo/get_invoice_status.future;

finalize get_invoice_status:
    input r0 as field.public;
    get invoices[r0] into r1;

constructor:
    assert.eq edition 0u16;
