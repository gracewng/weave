-- Private matching context. This is deliberately separate from `profiles`, whose
-- display fields are readable by friends. It may only inform receipt/product-image matching.
create table public.profile_matching_context (
  user_id uuid primary key references auth.users on delete cascade,
  age_range text not null check (age_range in ('under_18', '18_24', '25_34', '35_44', '45_54', '55_64', '65_plus', 'prefer_not_to_say')),
  gender text not null check (gender in ('woman', 'man', 'non_binary', 'another_identity', 'prefer_not_to_say')),
  shopping_department text not null check (shopping_department in ('womens', 'mens', 'unisex_or_mixed', 'no_preference')),
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_matching_context enable row level security;
create policy matching_context_select_own on public.profile_matching_context for select to authenticated using (user_id = auth.uid());
create policy matching_context_insert_own on public.profile_matching_context for insert to authenticated with check (user_id = auth.uid());
create policy matching_context_update_own on public.profile_matching_context for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- A processor-only flag for a line item that is strongly inconsistent with the
-- voluntarily supplied matching context. It is not surfaced to social features.
alter table public.items add column profile_mismatch boolean not null default false;
