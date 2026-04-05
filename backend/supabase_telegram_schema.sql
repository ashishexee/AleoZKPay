create table if not exists public.telegram_users (
    telegram_id bigint primary key,
    username text,
    chat_id bigint,
    aleo_address text,
    aleo_address_hash text,
    notifications_enabled boolean not null default true,
    linked_at timestamptz,
    updated_at timestamptz not null default timezone('utc', now())
);

alter table public.telegram_users add column if not exists username text;
alter table public.telegram_users add column if not exists chat_id bigint;
alter table public.telegram_users add column if not exists aleo_address text;
alter table public.telegram_users add column if not exists aleo_address_hash text;
alter table public.telegram_users add column if not exists notifications_enabled boolean not null default true;
alter table public.telegram_users add column if not exists linked_at timestamptz;
alter table public.telegram_users add column if not exists updated_at timestamptz not null default timezone('utc', now());

create index if not exists telegram_users_aleo_address_hash_idx
    on public.telegram_users (aleo_address_hash);

create table if not exists public.telegram_link_sessions (
    token text primary key,
    telegram_id bigint not null,
    chat_id bigint not null,
    nonce text not null,
    expires_at timestamptz not null,
    consumed_at timestamptz,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists telegram_link_sessions_telegram_id_idx
    on public.telegram_link_sessions (telegram_id);

create index if not exists telegram_link_sessions_expires_at_idx
    on public.telegram_link_sessions (expires_at);

create table if not exists public.telegram_notification_deliveries (
    dedupe_key text primary key,
    telegram_id bigint not null,
    chat_id bigint not null,
    invoice_hash text not null,
    event_type text not null,
    payment_tx_id text,
    delivered_at timestamptz not null default timezone('utc', now())
);

create index if not exists telegram_notification_deliveries_invoice_idx
    on public.telegram_notification_deliveries (invoice_hash);
