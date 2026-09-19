-- Identify-the-item: cache every product search forever, keyed by normalized query. Protects the SerpAPI quota
-- and makes demos replayable offline.
create table public.product_lookups (
  query text primary key,
  engine text not null default 'google_shopping',
  results jsonb not null default '[]',
  hits int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.product_lookups enable row level security;   -- service role only
