-- Phase 10: one notification per event, ever.
alter table public.items add column if not exists return_reminded_at timestamptz;
alter table public.holds add column if not exists reminded_at timestamptz;
