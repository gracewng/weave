'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';

export async function updateSettings(formData: FormData) {
  const { supabase, user } = await requireUser();
  const persona = String(formData.get('voice_persona') ?? 'bestie');
  const sizes: Record<string, string> = {};
  for (const k of ['top', 'bottom', 'shoes']) {
    const v = String(formData.get(`size_${k}`) ?? '').trim();
    if (v) sizes[k] = v;
  }
  const display_name = String(formData.get('display_name') ?? '').trim() || null;
  await supabase.from('profiles').update({ voice_persona: persona, sizes, display_name }).eq('id', user.id);
  revalidatePath('/profile');
}
