-- Stores product-level token filters for invoices that share the on-chain ANY token_type.
-- Example: ["USDCX", "USAD"] for standard/multipay stablecoin-only invoices.

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS allowed_tokens JSONB DEFAULT NULL;
