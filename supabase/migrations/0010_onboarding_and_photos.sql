-- Onboarding basics (used ONLY for product-image matching + mismatch flags; never for styling, never shown to friends)
alter table public.profiles add column if not exists age_range text check (age_range in ('under_18','18_24','25_34','35_44','45_54','55_plus','prefer_not'));
alter table public.profiles add column if not exists gender text check (gender in ('woman','man','non_binary','prefer_not'));
alter table public.profiles add column if not exists shops_department text check (shops_department in ('womens','mens','both','kids'));
alter table public.profiles add column if not exists onboarded_at timestamptz;
-- Per-item department (from tagging) and whether it looks inconsistent with the account holder's profile
alter table public.items add column if not exists department text check (department in ('womens','mens','unisex','kids','unknown'));
alter table public.items add column if not exists profile_mismatch boolean not null default false;
