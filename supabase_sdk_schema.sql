ALTER TABLE public.merchants
ADD COLUMN IF NOT EXISTS secret_key_hash TEXT UNIQUE;

ALTER TABLE public.payment_intents
ADD COLUMN IF NOT EXISTS checkout_url TEXT,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS tx_id TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Add Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_merchants_address ON public.merchants(encrypted_aleo_address);
CREATE INDEX IF NOT EXISTS idx_payment_intents_merchant_id ON public.payment_intents(merchant_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON public.payment_intents(status);

-- 4. Set up Row Level Security (RLS) policies (Optional but recommended)
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

-- Allow the backend service role to bypass RLS securely
CREATE POLICY "Allow Service Role full access to merchants" ON public.merchants USING (true) WITH CHECK (true);
CREATE POLICY "Allow Service Role full access to payment_intents" ON public.payment_intents USING (true) WITH CHECK (true);
