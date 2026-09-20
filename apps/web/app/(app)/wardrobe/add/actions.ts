'use server';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureLLM } from '@/lib/llm';
import { callLLM } from '@weave/shared';
import { READ_CAPTURE_SYSTEM, ReadCaptureSchema, type ReadCaptureResult } from '@weave/shared/prompts';
import { guessIntimates } from '@/lib/ingest/persist';
import { lookupMissingImages } from '@/lib/identify';
import { tagAndEmbed } from '@/lib/tagging';

const CATS = new Set(['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory', 'intimates', 'other']);
const SLOT: Record<string, string> = { top: 'top', bottom: 'bottom', dress: 'one_piece', outerwear: 'outer', shoes: 'shoes', accessory: 'accessory', intimates: 'accessory', other: 'accessory' };

export interface AddOwnResult { ok: boolean; itemId?: string; name?: string; error?: string }

/**
 * Something you already own, with no email or charge behind it.
 * A name makes one item straight away (the photo becomes its picture). A photo alone is read by the model:
 * a garment photo becomes the item's picture, a tag or receipt photo is kept as the receipt on file.
 */
export async function addOwnItem(form: FormData): Promise<AddOwnResult> {
  const { supabase, user } = await requireUser();
  const admin = createAdminClient(); if (!admin) return { ok: false, error: 'storage not configured' };
  const name = String(form.get('name') ?? '').trim();
  const file = form.get('photo') as File | null;
  const hasPhoto = !!file && file.size > 0 && (file.type || 'image/jpeg').startsWith('image/');
  if (!name && !hasPhoto) return { ok: false, error: 'add a photo or a name' };
  if (hasPhoto && file!.size > 8 * 1024 * 1024) return { ok: false, error: 'photo is over 8 MB' };

  const brand = String(form.get('brand') ?? '').trim() || null;
  const catIn = String(form.get('category') ?? '');
  const color = String(form.get('color') ?? '').trim() || null;
  const size = String(form.get('size') ?? '').trim() || null;
  const priceIn = Number(String(form.get('price') ?? '').replace(/[^0-9.]/g, ''));
  const price_cents = Number.isFinite(priceIn) && priceIn > 0 ? Math.round(priceIn * 100) : null;
  const dateIn = String(form.get('purchase_date') ?? '').trim();
  const purchase_date = /^\d{4}-\d{2}-\d{2}$/.test(dateIn) ? dateIn : null;

  let photoUrl: string | null = null; let dataUrl: string | null = null;
  if (hasPhoto) {
    const buf = Buffer.from(await file!.arrayBuffer());
    const type = file!.type || 'image/jpeg'; const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const path = `${user.id}/photos/${randomUUID()}.${ext}`;
    const { error } = await admin.storage.from('items').upload(path, buf, { contentType: type });
    if (error) return { ok: false, error: error.message };
    photoUrl = admin.storage.from('items').getPublicUrl(path).data.publicUrl;
    dataUrl = `data:${type};base64,${buf.toString('base64')}`;
  }

  type Row = Record<string, unknown>;
  let rows: Row[];
  if (name) {
    const category = CATS.has(catIn) ? catIn : guessIntimates(name) ?? 'other';
    rows = [{ user_id: user.id, name, brand, category, slot: SLOT[category] ?? 'accessory', formality: 2, color, size, price_cents, purchase_date, retailer: null,
      image_url: photoUrl, image_source: photoUrl ? 'user_photo' : null, source: photoUrl ? 'photo' : 'quick_add' }];
  } else {
    ensureLLM();
    let result: ReadCaptureResult;
    try {
      const r = await callLLM<ReadCaptureResult>({ task: 'read_capture', system: READ_CAPTURE_SYSTEM, schema: ReadCaptureSchema, schemaName: 'read_capture',
        input: [{ role: 'user', content: [{ type: 'text', text: 'OWNED ITEM, NO CHARGE. Describe what is in the photo.' }, { type: 'image_url', image_url: { url: dataUrl!, detail: 'high' } }] }], userId: user.id,
        fixture: () => ({ kind: 'garment', retailer: null, total_cents: null, items: [{ name: 'Item from photo', brand: null, size: null, color: null, price_cents: null, category: 'other', identifier: null }], confidence: 0.3 }) });
      result = r.data;
    } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
    const garment = result.kind === 'garment' || result.kind === 'unknown';
    rows = result.items.filter((i) => i.name.trim()).map((i) => {
      const category = i.category === 'other' ? (guessIntimates(i.name) ?? 'other') : i.category;
      return { user_id: user.id, name: i.name.trim(), brand: i.brand ?? brand, category, slot: SLOT[category] ?? 'accessory', formality: 2, color: i.color ?? color, size: i.size ?? size,
        price_cents: price_cents ?? i.price_cents, purchase_date, retailer: result.retailer, identifier: i.identifier,
        image_url: garment ? photoUrl : null, image_source: garment ? 'user_photo' : null, receipt_url: garment ? null : photoUrl,
        source: result.kind === 'receipt' ? 'receipt' : result.kind === 'tag' ? 'tag' : 'photo' };
    });
    if (rows.length === 0) return { ok: false, error: 'Nothing readable in that photo. Add a name and try again.' };
  }

  const { data: inserted, error } = await admin.from('items').insert(rows).select('id,name,image_url');
  if (error || !inserted?.length) return { ok: false, error: error?.message ?? 'insert failed' };
  const first = inserted[0] as { id: string; name: string; image_url: string | null };
  await tagAndEmbed(user.id, { limit: 20 }).catch(() => null);
  const missing = (inserted as Array<{ id: string; image_url: string | null }>).filter((i) => !i.image_url).map((i) => i.id);
  if (missing.length) await lookupMissingImages(user.id, { itemIds: missing, maxSearches: 1 }).catch(() => null);
  revalidatePath('/wardrobe'); revalidatePath('/home');
  return { ok: true, itemId: first.id, name: first.name };
}
