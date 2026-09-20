'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';

const AGES = new Set(['under_18', '18_24', '25_34', '35_44', '45_54', '55_plus', 'prefer_not']);
const GENDERS = new Set(['woman', 'man', 'non_binary', 'prefer_not']);
const DEPTS = new Set(['womens', 'mens', 'both', 'kids']);

/** Saves the onboarding basics and sets the once-only flag. Used for image matching + mismatch flags only. */
export async function completeOnboarding(formData: FormData) {
  const { supabase, user } = await requireUser();
  const age = String(formData.get('age_range') ?? ''); const gender = String(formData.get('gender') ?? ''); const dept = String(formData.get('shops_department') ?? '');
  const patch: Record<string, unknown> = { onboarded_at: new Date().toISOString() };
  if (AGES.has(age)) patch.age_range = age;
  if (GENDERS.has(gender)) patch.gender = gender;
  if (DEPTS.has(dept)) patch.shops_department = dept;
  await supabase.from('profiles').update(patch).eq('id', user.id);
  revalidatePath('/', 'layout');
  redirect(String(formData.get('next') ?? '/wardrobe').startsWith('/') ? String(formData.get('next') ?? '/wardrobe') : '/wardrobe');
}
