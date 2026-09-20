-- Purchases vs sales. A marketplace "you sold" email marks the matching owned item as sold (let it go); never a purchase.
alter table public.email_records add column if not exists direction text check (direction in ('purchase','sale','refund','other'));
alter table public.items add column if not exists sold_cents int;       -- what you got for it
alter table public.items add column if not exists sold_at timestamptz;
