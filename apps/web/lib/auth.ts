import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/env';
import type { Profile } from '@weave/shared/types';

export async function getSession() {
  if (!supabaseConfigured()) return { supabase: null, user: null };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Redirects to the landing page when signed out (or when Supabase isn't configured yet). */
export async function requireUser() {
  const { supabase, user } = await getSession();
  if (!supabase || !user) redirect('/');
  return { supabase, user };
}

export async function getProfile(): Promise<{ profile: Profile | null; user: NonNullable<Awaited<ReturnType<typeof requireUser>>['user']> }> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return { profile: (data as Profile | null) ?? null, user };
}

/* onboarded_at is set only when the whole flow finishes, so it stands in until migration 0013 adds onboarding_complete. */
export function isOnboarded(profile: Profile | null): boolean {
  if (!profile) return false;
  return profile.onboarding_complete ?? !!profile.onboarded_at;
}
