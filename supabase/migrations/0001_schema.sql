-- Weave · schema (Claude-owned; schema owner session only). Phase 1 (re-planned 2026-09-19: no crews, no pairings).
create extension if not exists vector;
create extension if not exists pgcrypto;

-- ─── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  sizes jsonb not null default '{}',          -- {"top":"M","bottom":"30","shoes":"9"} shown to friends for borrow matching
  voice_persona text not null default 'bestie' check (voice_persona in ('bestie','stylist','cfo')),
  invite_code text unique,
  created_at timestamptz not null default now()
);

-- ─── items ───────────────────────────────────────────────────────────────────
create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  brand text,
  category text check (category in ('top','bottom','dress','outerwear','shoes','accessory','intimates','other')),
  slot text check (slot in ('top','bottom','one_piece','outer','shoes','accessory')),
  color text,
  formality smallint check (formality between 1 and 5),
  size text,
  price_cents int,
  purchase_date date,
  retailer text,
  image_url text,
  receipt_url text,                 -- photo of the paper receipt (proof for returns)
  source text not null check (source in ('email','receipt','tag','photo','quick_add','mystery','search')),
  return_by date,
  status text not null default 'owned' check (status in ('owned','returned','sold','donated')),
  shareable boolean not null default true,
  lendable boolean not null default true,
  est_resale_cents int,
  description text,
  embedding vector(1536),
  created_at timestamptz not null default now()
);
create index items_user_idx on public.items (user_id);
create index items_return_by_idx on public.items (return_by) where return_by is not null;
-- Dedupe key for email ingestion: (retailer, lower(name), size, purchase_date)
create unique index items_dedupe_idx on public.items (user_id, coalesce(retailer,''), lower(name), coalesce(size,''), coalesce(purchase_date, '1970-01-01'))
  where source = 'email';
-- ANN index (ivfflat needs rows; fine to create now, rebuild later if needed)
create index items_embedding_idx on public.items using hnsw (embedding vector_cosine_ops);

-- ─── friendships ─────────────────────────────────────────────────────────────
create table public.friendships (
  user_a uuid not null references auth.users on delete cascade,
  user_b uuid not null references auth.users on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  requested_by uuid references auth.users,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

-- ─── loans ───────────────────────────────────────────────────────────────────
create table public.loans (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items on delete cascade,
  owner_id uuid not null references auth.users on delete cascade,
  borrower_id uuid not null references auth.users on delete cascade,
  status text not null default 'requested' check (status in ('requested','accepted','declined','out','returned')),
  event_name text,
  needed_on date,
  due_back date,
  message text,
  saved_cents int,                 -- what the borrower would have spent (retail or used price)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index loans_owner_idx on public.loans (owner_id);
create index loans_borrower_idx on public.loans (borrower_id);

-- ─── transactions ────────────────────────────────────────────────────────────
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  external_id text unique,
  merchant text,
  amount_cents int,
  date date,
  is_clothing boolean,
  match_status text not null default 'unmatched' check (match_status in ('unmatched','matched','captured','mystery','skipped')),
  item_ids uuid[] not null default '{}',
  decision text check (decision in ('keep','returning','not_clothes')),  -- purchase confirmation answer
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index transactions_user_idx on public.transactions (user_id, match_status);

-- ─── wears ────────────────────────────────────────────────────────────────────
create table public.wears (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items on delete cascade,
  worn_on date not null
);
create index wears_item_idx on public.wears (item_id);


-- ─── budgets (income → monthly clothing envelope) ────────────────────────────
create table public.budgets (
  user_id uuid primary key references auth.users on delete cascade,
  monthly_income_cents int,                  -- take-home
  clothing_pct numeric(5,2) not null default 5.00,   -- share of take-home for clothes
  envelope_override_cents int,               -- manual monthly envelope, wins over pct when set
  updated_at timestamptz not null default now()
);

-- ─── holds (Ghost Rack: things you searched for and did NOT buy) ─────────────
create table public.holds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  url text,
  image_url text,
  price_cents int not null,
  query text,                                -- the search that produced it
  verdict text check (verdict in ('skip','borrow','secondhand','wait','buy')),
  similar_item_ids uuid[] not null default '{}',
  friend_item_ids uuid[] not null default '{}',
  cheapest_used_cents int,
  status text not null default 'held' check (status in ('held','skipped','borrowed','bought_used','bought','released')),
  saved_cents int not null default 0,        -- credited when status ∈ (skipped, borrowed, bought_used)
  release_at timestamptz,                    -- 48h cooling-off; cron re-checks friends + secondhand then notifies
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index holds_user_idx on public.holds (user_id, created_at desc);
create index holds_release_idx on public.holds (release_at) where release_at is not null and status = 'held';

-- ─── llm_calls (token-optimization ledger) ───────────────────────────────────
create table public.llm_calls (
  id bigserial primary key,
  user_id uuid,
  task text not null,
  provider text not null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cached_tokens int not null default 0,
  cost_usd numeric(10,6) not null default 0,
  latency_ms int not null default 0,
  fell_back boolean not null default false,
  ok boolean not null default true,
  error text,
  created_at timestamptz not null default now()
);
create index llm_calls_task_idx on public.llm_calls (task, provider, created_at desc);
create index llm_calls_user_idx on public.llm_calls (user_id, created_at desc);

-- ─── gmail_tokens (service role only) ────────────────────────────────────────
create table public.gmail_tokens (
  user_id uuid primary key references auth.users on delete cascade,
  refresh_token text not null,
  last_sync_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ─── push subscriptions (Phase 5) ────────────────────────────────────────────
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

-- ─── audio cache for ElevenLabs (hash of text+voice → storage URL) ───────────
create table public.audio_cache (
  hash text primary key,
  url text not null,
  chars int not null default 0,
  created_at timestamptz not null default now()
);

-- ─── Storage bucket for item images ──────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('items', 'items', true)
  on conflict (id) do nothing;
