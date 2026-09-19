'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';

export async function woreToday(itemId: string): Promise<{ ok: boolean; wears: number; price_cents: number | null; name: string }> {
  const { supabase, user } = await requireUser();
  const { data: item } = await supabase.from('items').select('id,name,price_cents').eq('id', itemId).eq('user_id', user.id).maybeSingle();
  if (!item) return { ok: false, wears: 0, price_cents: null, name: '' };
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from('wears').insert({ item_id: itemId, worn_on: today });
  if (error) return { ok: false, wears: 0, price_cents: item.price_cents, name: item.name };
  const { count } = await supabase.from('wears').select('id', { count: 'exact', head: true }).eq('item_id', itemId);
  revalidatePath(`/wardrobe/${itemId}`); revalidatePath('/wardrobe');
  return { ok: true, wears: count ?? 1, price_cents: item.price_cents, name: item.name };
}

export async function setSharing(itemId: string, field: 'shareable' | 'lendable', value: boolean) {
  const { supabase, user } = await requireUser();
  await supabase.from('items').update({ [field]: value }).eq('id', itemId).eq('user_id', user.id);
  revalidatePath(`/wardrobe/${itemId}`);
}
