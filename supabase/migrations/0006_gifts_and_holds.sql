-- Phase 7: "for someone else". Gifts count as spend but never as owned items.
alter table public.items drop constraint if exists items_status_check;
alter table public.items add constraint items_status_check check (status in ('owned','returning','returned','sold','donated','gifted'));
alter table public.transactions drop constraint if exists transactions_decision_check;
alter table public.transactions add constraint transactions_decision_check check (decision in ('keep','returning','not_clothes','gift'));
alter table public.holds add column if not exists for_other boolean not null default false;
alter table public.holds add column if not exists note text;   -- e.g. "wore mine", "bought used on eBay for $37"
