'use server';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { guessIntimates, addDays } from '@/lib/ingest/persist';
import { policyDaysFor } from '@/lib/returns';
import { lookupMissingImages } from '@/lib/identify';
import { tagAndEmbed } from '@/lib/tagging';
import { captureForCharge } from '@/app/(app)/capture/[txId]/actions';

const CATS = new Set(['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory', 'intimates', 'other']);
const SLOT: Record<string, string> = { top: 'top', bottom: 'bottom', dress: 'one_piece', outerwear: 'outer', shoes: 'shoes', accessory: 'accessory', intimates: 'accessory', other: 'accessory' };

export interface AddResult { ok: boolean; itemId?: string; error?: string }

/**
 * "Add Purchase Details": item name, brand, type, formality, color, size, picture → one wardrobe item for this charge.
 * With a picture and no name, the photo is read by the model instead (receipt / tag / garment).
 */
export async function addPurchaseDetails(txId: string, form: FormData): Promise<AddResult> {
  const { supabase, user } = await requireUser();
  const admin = createAdminClient(); if (!admin) return { ok: false, error: 'storage not configured' };
  const name = String(form.get('name') ?? '').trim();
  const file = form.get('photo') as File | null;
  if (!name) {
    if (file && file.size > 0) { const r = await captureForCharge(txId, form); return r.ok ? { ok: true, itemId: r.items?.[0]?.id } : { ok: false, error: r.error }; }
    return { ok: false, error: 'add an item name or a picture' };
  }
  const { data: tx } = await supabase.from('transactions').select('*').eq('id', txId).eq('user_id', user.id).maybeSingle();
  if (!tx) return { ok: false, error: 'charge not found' };
  const brand = String(form.get('brand') ?? '').trim() || null;
  const catIn = String(form.get('category') ?? ''); const category = CATS.has(catIn) ? catIn : guessIntimates(name) ?? 'other';
  const formality = Math.min(5, Math.max(1, Number(form.get('formality') ?? 2) || 2));
  const color = String(form.get('color') ?? '').trim() || null;
  const size = String(form.get('size') ?? '').trim() || null;
  let image_url: string | null = null; let image_source: string | null = null;
  if (file && file.size > 0 && file.type.startsWith('image/')) {
    const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg';
    const path = `${user.id}/photos/${randomUUID()}.${ext}`;
    const { error } = await admin.storage.from('items').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
    if (!error) { image_url = admin.storage.from('items').getPublicUrl(path).data.publicUrl; image_source = 'user_photo'; }
  }
  const retailer = tx.merchant ?? null; const policy = policyDaysFor(retailer);
  const { data: item, error } = await admin.from('items').insert({
    user_id: user.id, name, brand, category, slot: SLOT[category] ?? 'accessory', formality, color, size,
    price_cents: tx.amount_cents, purchase_date: tx.date, retailer, image_url, image_source,
    source: image_url ? 'photo' : 'quick_add', return_by: policy != null && tx.date ? addDays(tx.date, policy) : null,
  }).select('id').single();
  if (error || !item) return { ok: false, error: error?.message ?? 'insert failed' };
  await supabase.from('transactions').update({ match_status: 'captured', item_ids: [item.id], decision: tx.decision ?? 'keep', decided_at: new Date().toISOString() }).eq('id', txId);
  await tagAndEmbed(user.id, { limit: 20 }).catch(() => null);
  if (!image_url) await lookupMissingImages(user.id, { itemIds: [item.id], maxSearches: 1 }).catch(() => null);
  revalidatePath('/charges'); revalidatePath('/wardrobe');
  return { ok: true, itemId: item.id };
}
