-- Row Level Security on every table. Owners have full access to their rows.
alter table public.profiles          enable row level security;
alter table public.items             enable row level security;
alter table public.friendships       enable row level security;
alter table public.loans             enable row level security;
alter table public.crews             enable row level security;
alter table public.crew_members      enable row level security;
alter table public.crew_looks        enable row level security;
alter table public.transactions      enable row level security;
alter table public.wears             enable row level security;
alter table public.pairings          enable row level security;
alter table public.interventions     enable row level security;
alter table public.llm_calls         enable row level security;
alter table public.gmail_tokens      enable row level security;   -- no policies: service role only
alter table public.push_subscriptions enable row level security;
alter table public.audio_cache       enable row level security;   -- no policies: service role only

-- profiles: everyone signed in can read names/avatars/sizes (needed for friends + crews); only you edit yours
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

-- crews: members see; creator manages
create policy crews_select on public.crews for select to authenticated using (created_by = auth.uid() or public.is_crew_member(id, auth.uid()));
create policy crews_insert on public.crews for insert to authenticated with check (created_by = auth.uid());
create policy crews_update on public.crews for update to authenticated using (created_by = auth.uid());
create policy crews_delete on public.crews for delete to authenticated using (created_by = auth.uid());

create policy crew_members_select on public.crew_members for select to authenticated using (public.is_crew_member(crew_id, auth.uid()));
create policy crew_members_insert on public.crew_members for insert to authenticated
  with check (user_id = auth.uid() or exists (select 1 from public.crews c where c.id = crew_id and c.created_by = auth.uid()));
create policy crew_members_delete on public.crew_members for delete to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.crews c where c.id = crew_id and c.created_by = auth.uid()));

create policy crew_looks_select on public.crew_looks for select to authenticated using (public.is_crew_member(crew_id, auth.uid()));
create policy crew_looks_update on public.crew_looks for update to authenticated using (user_id = auth.uid());
-- inserts happen server-side (service role) after crew_fits validation

-- transactions / interventions / push: owner only
create policy transactions_owner on public.transactions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy interventions_owner on public.interventions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_owner on public.push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- wears / pairings: through item ownership
create policy wears_owner on public.wears for all to authenticated
  using (exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid()))
  with check (exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid()));
create policy pairings_owner on public.pairings for all to authenticated
  using (exists (select 1 from public.items i where i.id = item_a and i.user_id = auth.uid()))
  with check (exists (select 1 from public.items i where i.id = item_a and i.user_id = auth.uid()));

-- llm_calls: you can read your own; inserts come from the server (service role)
create policy llm_calls_select on public.llm_calls for select to authenticated using (user_id = auth.uid());

-- Realtime for friend/crew activity (Phase 8)
alter publication supabase_realtime add table public.loans;
alter publication supabase_realtime add table public.crew_looks;
