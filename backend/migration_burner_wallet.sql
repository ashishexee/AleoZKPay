-- ==========================================
-- MIGRATION: BURNER WALLET SUPPORT
-- ==========================================

-- 1. Create users table for storing merchant profiles with burner wallet info
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    main_address TEXT NOT NULL,          -- Server-side encrypted (AES)
    burner_address TEXT,                 -- Server-side encrypted (AES)
    encrypted_burner_key TEXT,           -- Client-side base64 + Server-side encrypted (AES)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_main_address UNIQUE (main_address)
);

CREATE INDEX IF NOT EXISTS idx_users_main_address ON users(main_address);

-- 2. Add burner wallet columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS designated_address TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_burner BOOLEAN DEFAULT FALSE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS token_type INTEGER DEFAULT 0;

-- 3. Index for filtering by burner invoices
CREATE INDEX IF NOT EXISTS idx_invoices_designated_address ON invoices(designated_address);
CREATE INDEX IF NOT EXISTS idx_invoices_is_burner ON invoices(is_burner);
