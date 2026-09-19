-- Phase 2: one row per processed Gmail message. Never stores the body — only what we extracted.
-- Serves idempotent rescans and the "email orders" half of Closet Coverage.
create table public.email_records (
  user_id uuid not null references auth.users on delete cascade,
  message_id text not null,
  sender_domain text,
  subject text,                       -- subject line only (no body)
  email_date date,
  retailer text,
  order_date date,
  is_clothing_order boolean not null default false,
  items_found int not null default 0,
  status text not null default 'processed' check (status in ('prefiltered','processed','failed')),
  cost_usd numeric(10,6) not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id)
);
create index email_records_user_idx on public.email_records (user_id, created_at desc);
alter table public.email_records enable row level security;
create policy email_records_select on public.email_records for select to authenticated using (user_id = auth.uid());
-- inserts come from the server (service role)
