'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';

const AGE_RANGES = new Set(['under_18', '18_24', '25_34', '35_44', '45_54', '55_64', '65_plus', 'prefer_not_to_say']);
const GENDERS = new Set(['woman', 'man', 'non_binary', 'another_identity', 'prefer_not_to_say']);
const DEPARTMENTS = new Set(['womens', 'mens', 'unisex_or_mixed', 'no_preference']);

export async function completeMatchingProfile(formData: FormData) {
  const { supabase, user } = await requireUser();
  const age_range = String(formData.get('age_range') ?? 'prefer_not_to_say');
  const gender = String(formData.get('gender') ?? 'prefer_not_to_say');
  const shopping_department = String(formData.get('shopping_department') ?? 'no_preference');
  if (!AGE_RANGES.has(age_range) || !GENDERS.has(gender) || !DEPARTMENTS.has(shopping_department)) throw new Error('Invalid matching profile');

  const { error } = await supabase.from('profile_matching_context').upsert({
    user_id: user.id, age_range, gender, shopping_department, completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Could not save matching profile: ${error.message}`);
  redirect('/wardrobe');
}
