-- Phase 4: linked card accounts (Plaid sandbox) + charge metadata. Service role only.
create table public.plaid_items (
  user_id uuid not null references auth.users on delete cascade,
  item_id text primary key,
  access_token text not null,
  institution text,
  cursor text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.plaid_items enable row level security;   -- no policies: service role only
alter table public.transactions add column if not exists plaid_category text;
alter table public.transactions add column if not exists pending boolean not null default false;
alter table public.transactions add column if not exists source text not null default 'plaid' check (source in ('plaid','mock'));
alter publication supabase_realtime add table public.transactions;
