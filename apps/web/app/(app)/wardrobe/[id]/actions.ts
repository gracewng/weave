'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
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
  const { results } = await candidatesFor(item, true, user.id);
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

/** "That's not it": drop the image and stop auto-lookup for this item (image_source = none). Candidates stay pickable. */
export async function clearImage(itemId: string): Promise<boolean> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from('items').update({ image_url: null, image_source: 'none' }).eq('id', itemId).eq('user_id', user.id);
  revalidatePath(`/wardrobe/${itemId}`); revalidatePath('/wardrobe');
  return !error;
}

/** Remove the item from the wardrobe. Wears cascade; holds that pointed at it keep their record (wore_item_id → null). */
export async function removeItem(itemId: string): Promise<void> {
  const { supabase, user } = await requireUser();
  await supabase.from('items').delete().eq('id', itemId).eq('user_id', user.id);
  revalidatePath('/wardrobe'); revalidatePath('/returns'); revalidatePath('/statement');
  redirect('/wardrobe');
}

/** Replace (or add) the item's picture with the user's own photo. Stored in the same `items` bucket; auto-lookup stops. */
export async function uploadOwnPhoto(itemId: string, form: FormData): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  const admin = createAdminClient(); if (!admin) return { ok: false, error: 'storage not configured' };
  const file = form.get('photo') as File | null;
  if (!file || file.size === 0) return { ok: false, error: 'choose a photo' };
  if (file.size > 8 * 1024 * 1024) return { ok: false, error: 'photo is over 8 MB' };
  const type = file.type || 'image/jpeg'; if (!type.startsWith('image/')) return { ok: false, error: 'not an image' };
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('heic') ? 'heic' : 'jpg';
  const path = `${user.id}/photos/${randomUUID()}.${ext}`;
  const { error } = await admin.storage.from('items').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: type });
  if (error) return { ok: false, error: error.message };
  const url = admin.storage.from('items').getPublicUrl(path).data.publicUrl;
  const { error: e2 } = await supabase.from('items').update({ image_url: url, image_source: 'user_photo' }).eq('id', itemId).eq('user_id', user.id);
  if (e2) return { ok: false, error: e2.message };
  revalidatePath(`/wardrobe/${itemId}`); revalidatePath('/wardrobe');
  return { ok: true };
}

/** "Not mine": move a flagged item out of the wardrobe as bought for someone else. */
export async function markNotMine(itemId: string): Promise<void> {
  const { supabase, user } = await requireUser();
  await supabase.from('items').update({ status: 'gifted', profile_mismatch: false }).eq('id', itemId).eq('user_id', user.id);
  revalidatePath('/wardrobe'); revalidatePath('/statement');
  redirect('/wardrobe');
}

export async function dismissMismatch(itemId: string): Promise<void> {
  const { supabase, user } = await requireUser();
  await supabase.from('items').update({ profile_mismatch: false }).eq('id', itemId).eq('user_id', user.id);
  revalidatePath(`/wardrobe/${itemId}`); revalidatePath('/wardrobe');
}
