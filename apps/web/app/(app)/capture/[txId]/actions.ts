'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureLLM } from '@/lib/llm';
import { callLLM } from '@weave/shared';
import { READ_CAPTURE_SYSTEM, ReadCaptureSchema, type ReadCaptureResult } from '@weave/shared/prompts';
import { guessIntimates, addDays } from '@/lib/ingest/persist';
import { policyDaysFor } from '@/lib/returns';
import { lookupMissingImages } from '@/lib/identify';
import { tagAndEmbed } from '@/lib/tagging';
import { randomUUID } from 'node:crypto';

export interface CaptureResult { ok: boolean; kind?: string; items?: Array<{ id: string; name: string }>; confidence?: number; error?: string; costUsd?: number }

/**
 * Photo (receipt / tag / garment) or a typed description → items with receipt on file.
 * The photo is stored as the receipt; the product image comes from Identify-the-item, or the photo itself for garments.
 */
export async function captureForCharge(txId: string, form: FormData): Promise<CaptureResult> {
  const { supabase, user } = await requireUser();
  ensureLLM();
  const admin = createAdminClient(); if (!admin) return { ok: false, error: 'service role not configured' };
  const { data: tx } = await supabase.from('transactions').select('*').eq('id', txId).eq('user_id', user.id).maybeSingle();
  if (!tx) return { ok: false, error: 'charge not found' };
  const file = form.get('photo') as File | null;
  const description = String(form.get('description') ?? '').trim();
  if (!file && !description) return { ok: false, error: 'add a photo or describe what you bought' };

  let photoUrl: string | null = null; let dataUrl: string | null = null;
  if (file && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    const type = file.type || 'image/jpeg'; const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const path = `${user.id}/receipts/${randomUUID()}.${ext}`;
    const { error } = await admin.storage.from('items').upload(path, buf, { contentType: type });
    if (!error) photoUrl = admin.storage.from('items').getPublicUrl(path).data.publicUrl;
    dataUrl = `data:${type};base64,${buf.toString('base64')}`;
  }

  const content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'low' | 'high' } }> = [
    { type: 'text', text: `CHARGE: ${tx.merchant} $${((tx.amount_cents ?? 0) / 100).toFixed(2)} on ${tx.date}${description ? `\nUSER SAYS: ${description}` : ''}` },
  ];
  if (dataUrl) content.push({ type: 'image_url', image_url: { url: dataUrl, detail: 'high' } });
  let result: ReadCaptureResult; let cost = 0;
  try {
    const r = await callLLM<ReadCaptureResult>({ task: 'read_capture', system: READ_CAPTURE_SYSTEM, schema: ReadCaptureSchema, schemaName: 'read_capture', input: [{ role: 'user', content }], userId: user.id,
      fixture: () => ({ kind: 'unknown', retailer: tx.merchant, total_cents: tx.amount_cents, items: description ? [{ name: description.slice(0, 80), brand: null, size: null, color: null, price_cents: tx.amount_cents, category: 'other', identifier: null }] : [], confidence: 0.3 }) });
    result = r.data; cost = r.costUsd;
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }

  const retailer = result.retailer?.trim() || tx.merchant || 'Unknown';
  const policy = policyDaysFor(retailer);
  const rows = result.items.filter((i) => i.name.trim()).map((i) => ({
    user_id: user.id, name: i.name.trim(), brand: i.brand, size: i.size, color: i.color, category: i.category === 'other' ? guessIntimates(i.name) : i.category,
    price_cents: i.price_cents ?? (result.items.length === 1 ? tx.amount_cents : null), purchase_date: tx.date, retailer, identifier: i.identifier,
    image_url: result.kind === 'garment' ? photoUrl : null, image_source: result.kind === 'garment' && photoUrl ? 'user_photo' : null,
    receipt_url: result.kind === 'receipt' || result.kind === 'tag' ? photoUrl : null,
    source: result.kind === 'receipt' ? 'receipt' : result.kind === 'tag' ? 'tag' : result.kind === 'garment' ? 'photo' : 'quick_add',
    return_by: policy != null && tx.date ? addDays(tx.date, policy) : null,
  }));
  if (rows.length === 0) return { ok: false, kind: result.kind, confidence: result.confidence, error: 'Nothing readable. Try a clearer photo or describe the item.', costUsd: cost };
  const { data: inserted, error } = await admin.from('items').insert(rows).select('id,name');
  if (error) return { ok: false, error: error.message };
  const ids = (inserted ?? []).map((i) => i.id);
  await supabase.from('transactions').update({ match_status: 'captured', item_ids: ids, decision: tx.decision ?? 'keep', decided_at: new Date().toISOString() }).eq('id', txId);
  // Tag + embed + product image (capped) in the background of this request.
  await tagAndEmbed(user.id, { limit: 20 }).catch(() => null);
  await lookupMissingImages(user.id, { itemIds: ids, maxSearches: 3 }).catch(() => null);
  revalidatePath('/wardrobe'); revalidatePath('/charges');
  return { ok: true, kind: result.kind, items: (inserted ?? []) as Array<{ id: string; name: string }>, confidence: result.confidence, costUsd: cost };
}
