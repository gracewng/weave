'use server';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

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

/** Profile picture: any image → `items` bucket under avatars/, then profiles.avatar_url. */
export async function updateAvatar(form: FormData): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  const admin = createAdminClient(); if (!admin) return { ok: false, error: 'storage not configured' };
  const file = form.get('avatar') as File | null;
  if (!file || file.size === 0) return { ok: false, error: 'choose a photo' };
  if (file.size > 8 * 1024 * 1024) return { ok: false, error: 'photo is over 8 MB' };
  const type = file.type || 'image/jpeg'; if (!type.startsWith('image/')) return { ok: false, error: 'not an image' };
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  const path = `${user.id}/avatar/${randomUUID()}.${ext}`;
  const { error } = await admin.storage.from('items').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: type });
  if (error) return { ok: false, error: error.message };
  const url = admin.storage.from('items').getPublicUrl(path).data.publicUrl;
  const { error: e2 } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
  if (e2) return { ok: false, error: e2.message };
  revalidatePath('/', 'layout');
  return { ok: true };
}
