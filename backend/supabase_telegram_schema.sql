-- Run this on your Supabase SQL Editor to create the telegram_users table
CREATE TABLE IF NOT EXISTS public.telegram_users (
    telegram_id BIGINT PRIMARY KEY,
    aleo_address TEXT NOT NULL,
    username TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_users_address ON public.telegram_users(aleo_address);

-- Optional RLS
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Service Role full access to telegram_users" ON public.telegram_users USING (true) WITH CHECK (true);
