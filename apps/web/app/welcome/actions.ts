'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';

const AGES = new Set(['under_18', '18_24', '25_34', '35_44', '45_54', '55_plus', 'prefer_not']);
const GENDERS = new Set(['woman', 'man', 'non_binary', 'prefer_not']);
const DEPTS = new Set(['womens', 'mens', 'both', 'kids']);

/* Saves the basics (image matching + mismatch flags only). Completion is flagged by finishOnboarding. */
export async function saveBasics(formData: FormData, complete = false) {
  const { supabase, user } = await requireUser();
  const age = String(formData.get('age_range') ?? ''); const gender = String(formData.get('gender') ?? ''); const dept = String(formData.get('shops_department') ?? '');
  const patch: Record<string, unknown> = complete ? { onboarded_at: new Date().toISOString() } : {};
  if (AGES.has(age)) patch.age_range = age;
  if (GENDERS.has(gender)) patch.gender = gender;
  if (DEPTS.has(dept)) patch.shops_department = dept;
  await supabase.from('profiles').update(patch).eq('id', user.id);
}

/* Settings edit path: save and go back. */
export async function completeOnboarding(formData: FormData) {
  await saveBasics(formData, true);
  revalidatePath('/', 'layout');
  const next = String(formData.get('next') ?? '/home');
  redirect(next.startsWith('/') ? next : '/home');
}

/* Last onboarding step (bank linked or skipped): flag complete and open the app. */
export async function finishOnboarding() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from('profiles').update({ onboarding_complete: true, onboarded_at: new Date().toISOString() }).eq('id', user.id);
  // Column missing until migration 0013 runs (PostgREST PGRST204 / Postgres 42703): onboarded_at alone then marks completion.
  if (error && (error.code === 'PGRST204' || error.code === '42703' || /onboarding_complete/.test(error.message))) {
    const { error: e2 } = await supabase.from('profiles').update({ onboarded_at: new Date().toISOString() }).eq('id', user.id);
    if (e2) throw new Error(e2.message);
  }
  else if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
  redirect('/home');
}
