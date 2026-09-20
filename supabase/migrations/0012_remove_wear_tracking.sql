-- Wear logging and cost-per-wear are no longer product features.
-- The holds relationship remains useful for recording that an owned item was used instead.
alter table public.holds rename column wore_item_id to owned_item_id;

-- Drops wear history, its index, RLS policy, and the table itself.
drop table public.wears;
