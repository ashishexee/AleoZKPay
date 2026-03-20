ALTER TABLE invoices ADD COLUMN IF NOT EXISTS for_sdk BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_invoices_for_sdk ON invoices(for_sdk);
