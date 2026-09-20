-- Profile: free-text bio (replaces the voice persona picker in the UI) and a self-reported area (never device location).
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists area text;
