-- Helpers, triggers, views, and vector search functions.

-- Unambiguous 8-char invite code
create or replace function public.gen_invite_code() returns text language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
begin
  for i in 1..8 loop
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return out;
end $$;

-- Auto-create a profile on sign-up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url, invite_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''), '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    public.gen_invite_code()
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Intimates are never shareable by default (privacy by design)
create or replace function public.items_privacy_defaults() returns trigger language plpgsql as $$
begin
  if new.category = 'intimates' then
    new.shareable := false;
    new.lendable := false;
  end if;
  return new;
end $$;
create trigger items_privacy_defaults before insert or update of category on public.items
  for each row execute procedure public.items_privacy_defaults();

-- Keep loans.updated_at fresh
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger loans_touch before update on public.loans for each row execute procedure public.touch_updated_at();
create trigger holds_touch before update on public.holds for each row execute procedure public.touch_updated_at();

-- ─── Friendship helpers (security definer so RLS policies can use them without recursion) ──
create or replace function public.is_friend(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select a is not null and b is not null and a <> b and exists (
    select 1 from public.friendships f
    where f.user_a = least(a, b) and f.user_b = greatest(a, b) and f.status = 'accepted'
  );
$$;

-- Which profile size key applies to an item category
create or replace function public.size_key(category text) returns text language sql immutable as $$
  select case category
    when 'top' then 'top'
    when 'dress' then 'top'
    when 'outerwear' then 'top'
    when 'bottom' then 'bottom'
    when 'shoes' then 'shoes'
    else null end;
$$;

-- ─── friend_items view: what friends may see. NO prices/dates/retailer/return_by/resale. ─────
-- security_invoker = false → runs as the view owner (bypasses items RLS); the WHERE enforces friendship.
create or replace view public.friend_items with (security_invoker = false) as
  select
    i.id, i.user_id as owner_id,
    p.display_name as owner_name, p.avatar_url as owner_avatar, p.sizes as owner_sizes,
    i.name, i.brand, i.category, i.slot, i.color, i.formality, i.size, i.image_url,
    i.status, i.lendable, i.description, i.created_at
  from public.items i
  join public.profiles p on p.id = i.user_id
  where i.shareable = true
    and i.status = 'owned'
    and public.is_friend(auth.uid(), i.user_id);

revoke all on public.friend_items from anon;
grant select on public.friend_items to authenticated;

-- ─── Vector search ───────────────────────────────────────────────────────────
create or replace function public.match_items(p_user_id uuid, query_embedding vector(1536), k int default 5)
returns table (
  id uuid, name text, brand text, category text, slot text, color text, size text,
  image_url text, description text, price_cents int, similarity real
)
language sql stable security definer set search_path = public as $$
  select i.id, i.name, i.brand, i.category, i.slot, i.color, i.size, i.image_url, i.description, i.price_cents,
         (1 - (i.embedding <=> query_embedding))::real as similarity
  from public.items i
  where i.user_id = p_user_id
    and (auth.uid() is null or auth.uid() = p_user_id)
    and i.status = 'owned'
    and i.embedding is not null
  order by i.embedding <=> query_embedding
  limit k;
$$;

create or replace function public.match_friend_items(p_user_id uuid, query_embedding vector(1536), k int default 5)
returns table (
  id uuid, owner_id uuid, owner_name text, owner_avatar text, owner_sizes jsonb,
  name text, brand text, category text, slot text, color text, size text,
  image_url text, description text, similarity real
)
language sql stable security definer set search_path = public as $$
  with me as (select coalesce(sizes, '{}'::jsonb) as sizes from public.profiles where id = p_user_id)
  select i.id, i.user_id as owner_id, p.display_name, p.avatar_url, p.sizes,
         i.name, i.brand, i.category, i.slot, i.color, i.size, i.image_url, i.description,
         (1 - (i.embedding <=> query_embedding))::real as similarity
  from public.items i
  join public.profiles p on p.id = i.user_id
  cross join me
  where (auth.uid() is null or auth.uid() = p_user_id)
    and public.is_friend(p_user_id, i.user_id)
    and i.shareable = true and i.lendable = true and i.status = 'owned'
    and i.embedding is not null
    and (
      public.size_key(i.category) is null
      or (me.sizes ->> public.size_key(i.category)) is null
      or i.size is null
      or lower(i.size) = lower(me.sizes ->> public.size_key(i.category))
    )
  order by i.embedding <=> query_embedding
  limit k;
$$;

-- Accept an invite code → accepted friendship (called by the joining user)
create or replace function public.accept_invite(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inviter uuid;
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  select id into inviter from public.profiles where invite_code = upper(p_code);
  if inviter is null then raise exception 'invalid invite code'; end if;
  if inviter = me then raise exception 'cannot befriend yourself'; end if;
  insert into public.friendships (user_a, user_b, status, requested_by)
  values (least(inviter, me), greatest(inviter, me), 'accepted', me)
  on conflict (user_a, user_b) do update set status = 'accepted';
  return inviter;
end $$;
