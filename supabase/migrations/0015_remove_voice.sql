-- ElevenLabs voice feature removed (lead decision, 2026-09-20): no spoken statements, no personas.
drop table if exists public.audio_cache;
alter table public.profiles drop column if exists voice_persona;
