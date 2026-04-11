alter table public.invoices
    add column if not exists payment_timestamps jsonb not null default '{}'::jsonb;
