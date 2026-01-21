program zk_pay_proofs_privacy.aleo {
    
    // Invoice data structure
    struct InvoiceData {
        expiry_height: u32,  // Block height when invoice expires (0u32 = never expires)
        status: u8           // 0u8 = PENDING, 1u8 = SETTLED
    }
    
    mapping invoices: field => InvoiceData;
    
    
    // Merchant creates invoice with optional expiry
    // expiry_hours: 0u32 = never expires, otherwise converts to block height
    // Aleo produces ~1 block every 10 seconds, so 1 hour ≈ 360 blocks
    async transition create_invoice(
        public invoice_hash: field,
        public expiry_hours: u32
    ) -> Future {
        return finalize_create_invoice(invoice_hash, expiry_hours);
    }
    
    async function finalize_create_invoice(
        invoice_hash: field,
        expiry_hours: u32
    ) {
        // Calculate expiry block height using ternary operator
        // 0u32 = never expires, otherwise add blocks (360 blocks per hour)
        let blocks_to_add: u32 = expiry_hours * 360u32;
        let expiry_height: u32 = expiry_hours != 0u32 ? block.height + blocks_to_add : 0u32;
        
        // Store invoice data
        let invoice_data: InvoiceData = InvoiceData {
            expiry_height: expiry_height,
            status: 0u8
        };
        
        Mapping::set(invoices, invoice_hash, invoice_data);
    }
    
    
    // User submits payment proof after sending credits directly to merchant
    // This updates the invoice status on the explorer
    async transition pay_invoice(
        merchant: address,
        amount: u64,
        salt: field,
        memo_hash: field,  // Hash of memo for verification
        public invoice_hash: field
    ) -> Future {
        
        // Verify commitment (ZK proof)
        let hash_merchant: field = BHP256::hash_to_field(merchant);
        let hash_amount: field = BHP256::hash_to_field(amount);
        let hash_salt: field = BHP256::hash_to_field(salt);
        let hash_memo: field = memo_hash;
        
        // Combine all hashes to verify invoice
        let computed_hash: field = hash_merchant + hash_amount + hash_salt + hash_memo;
        
        assert_eq(invoice_hash, computed_hash);
        
        // Mark invoice as settled (after user has sent credits separately)
        return finalize_pay_invoice(invoice_hash);
    }
    
    async function finalize_pay_invoice(invoice_hash: field) {
        // Get invoice data
        let invoice_data: InvoiceData = Mapping::get(invoices, invoice_hash);
        
        // Check if invoice has expired
        if invoice_data.expiry_height != 0u32 {
            assert(block.height <= invoice_data.expiry_height);
        }
        
        // Check invoice is still pending
        assert_eq(invoice_data.status, 0u8);
        
        // Update status to SETTLED
        let updated_data: InvoiceData = InvoiceData {
            expiry_height: invoice_data.expiry_height,
            status: 1u8  // SETTLED
        };
        
        Mapping::set(invoices, invoice_hash, updated_data);
    }
    
    
    // Query invoice status and expiry
    async transition get_invoice_status(
        public invoice_hash: field
    ) -> Future {
        return finalize_get_invoice_status(invoice_hash);
    }
    
    async function finalize_get_invoice_status(invoice_hash: field) {
        let invoice_data: InvoiceData = Mapping::get(invoices, invoice_hash);
        // Status can be read via RPC query
    }
}
