do $$
begin
    if exists (
        select 1
        from pg_constraint
        where conname = 'users_card_label_length_check'
          and conrelid = 'public.users'::regclass
    ) then
        alter table public.users drop constraint users_card_label_length_check;
    end if;
exception when undefined_table then
    null;
end $$;

do $$
begin
    if exists (
        select 1
        from pg_constraint
        where conname = 'users_card_hint_length_check'
          and conrelid = 'public.users'::regclass
    ) then
        alter table public.users drop constraint users_card_hint_length_check;
    end if;
exception when undefined_table then
    null;
end $$;

alter table public.users
    alter column card_label type text,
    alter column card_hint type text;

alter table public.users
    add column if not exists card_main_address text;
