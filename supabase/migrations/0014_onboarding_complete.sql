-- Onboarding completion flag (profile basics + bank-link step). Existing onboarded users are grandfathered in.
alter table public.profiles add column if not exists onboarding_complete boolean not null default false;
update public.profiles set onboarding_complete = true where onboarded_at is not null and onboarding_complete = false;
