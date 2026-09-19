'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyCandidateImage, candidatesFor, lookupMissingImages } from '@/lib/identify';
import type { ShoppingResult } from '@weave/shared/contracts';

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

/** One product search for this item (cached forever by query). */
export async function findCandidates(itemId: string): Promise<ShoppingResult[]> {
  const { supabase, user } = await requireUser();
  const { data: item } = await supabase.from('items').select('name,brand,color,retailer').eq('id', itemId).eq('user_id', user.id).maybeSingle();
  if (!item) return [];
  const { results } = await candidatesFor(item, true);
  return results;
}

export async function chooseImage(itemId: string, imageUrl: string): Promise<boolean> {
  const { user } = await requireUser();
  const admin = createAdminClient(); if (!admin) return false;
  const ok = await applyCandidateImage(admin, user.id, itemId, imageUrl);
  if (ok) { revalidatePath(`/wardrobe/${itemId}`); revalidatePath('/wardrobe'); }
  return ok;
}

/** Edit name/brand/color/size. If anything that changes the product query changed, the image is looked up again. */
export async function updateDetails(itemId: string, input: { name: string; brand: string; color: string; size: string }): Promise<{ ok: boolean; relookup: boolean }> {
  const { supabase, user } = await requireUser();
  const { data: before } = await supabase.from('items').select('name,brand,color,size,image_source').eq('id', itemId).eq('user_id', user.id).maybeSingle();
  if (!before) return { ok: false, relookup: false };
  const name = input.name.trim() || before.name;
  const brand = input.brand.trim() || null;
  const color = input.color.trim() || null;
  const size = input.size.trim() || null;
  const queryChanged = name !== before.name || (brand ?? '') !== (before.brand ?? '') || (color ?? '') !== (before.color ?? '');
  const relookup = queryChanged && before.image_source !== 'email' && before.image_source !== 'user_photo';
  const patch: Record<string, unknown> = { name, brand, color, size, description: null };  // description null → re-tag/re-embed on next tagging run
  if (relookup) { patch.image_url = null; patch.image_source = null; }
  const { error } = await supabase.from('items').update(patch).eq('id', itemId).eq('user_id', user.id);
  if (error) return { ok: false, relookup: false };
  if (relookup) await lookupMissingImages(user.id, { itemIds: [itemId], maxSearches: 1 }).catch(() => null);
  revalidatePath(`/wardrobe/${itemId}`); revalidatePath('/wardrobe');
  return { ok: true, relookup };
}
