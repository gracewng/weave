-- Weave · schema (Claude-owned; schema owner session only). Phase 1.
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
  source text not null check (source in ('email','receipt','tag','photo','quick_add','mystery','intervention')),
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

-- ─── crews ───────────────────────────────────────────────────────────────────
create table public.crews (
  id uuid primary key default gen_random_uuid(),
  name text,
  event_date date,
  dress_code text,
  vibe text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
create table public.crew_members (
  crew_id uuid not null references public.crews on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  primary key (crew_id, user_id)
);
create table public.crew_looks (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  item_ids uuid[] not null default '{}',
  borrowed_item_ids uuid[] not null default '{}',
  rationale text,
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now()
);
create index transactions_user_idx on public.transactions (user_id, match_status);

-- ─── wears / pairings ────────────────────────────────────────────────────────
create table public.wears (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items on delete cascade,
  worn_on date not null
);
create index wears_item_idx on public.wears (item_id);

create table public.pairings (
  item_a uuid not null references public.items on delete cascade,
  item_b uuid not null references public.items on delete cascade,
  score real not null,
  primary key (item_a, item_b),
  check (item_a < item_b)
);

-- ─── interventions ───────────────────────────────────────────────────────────
create table public.interventions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  product_title text,
  product_url text,
  product_image text,
  price_cents int,
  similar_item_ids uuid[] default '{}',
  friend_item_ids uuid[] default '{}',
  outfits_unlocked int,
  verdict text check (verdict in ('skip','borrow','secondhand','wait','buy')),
  decision text check (decision in ('skipped','borrowed','bought_secondhand','queued','bought','pending')),
  saved_cents int not null default 0,
  remind_at timestamptz,
  created_at timestamptz not null default now()
);
create index interventions_user_idx on public.interventions (user_id, created_at desc);
create index interventions_remind_idx on public.interventions (remind_at) where remind_at is not null;

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
