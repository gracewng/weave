'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';

const AGES = new Set(['under_18', '18_24', '25_34', '35_44', '45_54', '55_plus', 'prefer_not']);
const GENDERS = new Set(['woman', 'man', 'non_binary', 'prefer_not']);
const DEPTS = new Set(['womens', 'mens', 'both', 'kids']);

export async function updateSettings(formData: FormData) {
  const { supabase, user } = await requireUser();
  const sizes: Record<string, string> = {};
  for (const k of ['top', 'bottom', 'shoes']) { const v = String(formData.get(`size_${k}`) ?? '').trim(); if (v) sizes[k] = v; }
  const age = String(formData.get('age_range') ?? ''); const gender = String(formData.get('gender') ?? ''); const dept = String(formData.get('shops_department') ?? '');
  await supabase.from('profiles').update({
    display_name: String(formData.get('display_name') ?? '').trim() || null,
    bio: String(formData.get('bio') ?? '').trim().slice(0, 160) || null,
    area: String(formData.get('area') ?? '').trim().slice(0, 80) || null,
    sizes,
    age_range: AGES.has(age) ? age : null,
    gender: GENDERS.has(gender) ? gender : null,
    shops_department: DEPTS.has(dept) ? dept : null,
  }).eq('id', user.id);
  revalidatePath('/profile'); revalidatePath('/friends');
}
