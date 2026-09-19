-- Row Level Security on every table. Owners have full access to their rows.
alter table public.profiles          enable row level security;
alter table public.items             enable row level security;
alter table public.friendships       enable row level security;
alter table public.loans             enable row level security;
alter table public.budgets           enable row level security;
alter table public.holds             enable row level security;
alter table public.transactions      enable row level security;
alter table public.wears             enable row level security;
alter table public.llm_calls         enable row level security;
alter table public.gmail_tokens      enable row level security;   -- no policies: service role only
alter table public.push_subscriptions enable row level security;
alter table public.audio_cache       enable row level security;   -- no policies: service role only

-- profiles: everyone signed in can read names/avatars/sizes (needed for friends); only you edit yours
create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());

-- items: owner only. Friends read via the friend_items view (never prices).
create policy items_owner on public.items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- friendships: either party sees; either party can create (pending) or update (accept)
create policy friendships_select on public.friendships for select to authenticated using (auth.uid() in (user_a, user_b));
create policy friendships_insert on public.friendships for insert to authenticated with check (auth.uid() in (user_a, user_b));
create policy friendships_update on public.friendships for update to authenticated using (auth.uid() in (user_a, user_b));
create policy friendships_delete on public.friendships for delete to authenticated using (auth.uid() in (user_a, user_b));

-- loans: visible to owner and borrower; borrower creates requests; both can update status
create policy loans_select on public.loans for select to authenticated using (auth.uid() in (owner_id, borrower_id));
create policy loans_insert on public.loans for insert to authenticated with check (auth.uid() = borrower_id and public.is_friend(owner_id, borrower_id));
create policy loans_update on public.loans for update to authenticated using (auth.uid() in (owner_id, borrower_id));

-- transactions / budgets / holds / push: owner only
create policy transactions_owner on public.transactions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy budgets_owner on public.budgets for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy holds_owner on public.holds for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_owner on public.push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- wears: through item ownership
create policy wears_owner on public.wears for all to authenticated
  using (exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid()))
  with check (exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid()));

-- llm_calls: you can read your own; inserts come from the server (service role)
create policy llm_calls_select on public.llm_calls for select to authenticated using (user_id = auth.uid());

-- Realtime for friend activity (loans accepted live during the demo)
alter publication supabase_realtime add table public.loans;
