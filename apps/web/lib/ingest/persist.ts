import 'server-only';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExtractEmailResult } from '@weave/shared/prompts';
import type { Item } from '@weave/shared/types';

const IMG_TIMEOUT = 6000;
const IMG_MAX = 5 * 1024 * 1024;

/** Download a product image and store it in the public `items` bucket. Returns the public URL or null. */
export async function storeImageFromUrl(admin: SupabaseClient, userId: string, url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(IMG_TIMEOUT), headers: { 'User-Agent': 'Mozilla/5.0 (Weave image fetch)' } });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > IMG_MAX) return null;
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('gif') ? 'gif' : 'jpg';
    const path = `${userId}/${randomUUID()}.${ext}`;
    const { error } = await admin.storage.from('items').upload(path, buf, { contentType: type, upsert: false });
    if (error) return null;
    return admin.storage.from('items').getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function titleCase(s: string) { return s.replace(/\b\w/g, (c) => c.toUpperCase()); }

/** Privacy guard before tagging runs: obvious intimates get category='intimates' at insert time, and the DB trigger makes them non-shareable. */
const INTIMATES_RE = /\b(bra|bralette|bras|underwear|panty|panties|briefs?|boxers?|thong|lingerie|sleepwear|pajamas?|pyjamas?|nightgown|robe|shapewear|socks?)\b/i;
export function guessIntimates(name: string): 'intimates' | null { return INTIMATES_RE.test(name) ? 'intimates' : null; }

export interface PersistContext {
  messageId: string;
  retailerName: string;
  /** null = final sale / unknown → no return_by */
  returnWindowDays: number | null;
  imageUrls: string[];
}

/**
 * Insert extracted items for a user. Dedupe key: (retailer, lower(name), size, purchase_date).
 * Quantity > 1 becomes separate rows (you own two tees, not one "×2").
 */
export async function insertExtractedItems(
  admin: SupabaseClient, userId: string, result: ExtractEmailResult, ctx: PersistContext,
): Promise<{ inserted: Item[]; duplicates: number }> {
  if (!result.is_clothing_order || result.items.length === 0) return { inserted: [], duplicates: 0 };
  // Prefer the allowlist's canonical name ("Amazon", "Uniqlo") over the model's spelling ("Amazon.com", "UNIQLO").
  const retailer = ctx.retailerName?.trim() || result.retailer?.trim() || 'Unknown';
  const purchaseDate = /^\d{4}-\d{2}-\d{2}$/.test(result.order_date) ? result.order_date : null;

  const { data: existing } = await admin.from('items').select('name,size,purchase_date,line_index')
    .eq('user_id', userId).eq('retailer', retailer).eq('source', 'email');
  // Units already owned per (name, size, date). A repeated identical line in the same email (or a rescan of a
  // quantity-2 line) becomes the next line_index; a true rescan of the same email adds nothing.
  const owned = new Map<string, number>();
  for (const e of (existing ?? []) as Array<{ name: string; size: string | null; purchase_date: string | null; line_index: number }>) {
    const k = `${e.name.toLowerCase()}|${e.size ?? ''}|${e.purchase_date ?? ''}`;
    owned.set(k, Math.max(owned.get(k) ?? 0, e.line_index + 1));
  }
  const wanted = new Map<string, number>();   // units this email asks for, per key
  const firstSeen = new Map<string, ExtractEmailResult['items'][number]>();
  for (const it of result.items) {
    const name = it.name.trim(); if (!name) continue;
    const k = `${name.toLowerCase()}|${it.size ?? ''}|${purchaseDate ?? ''}`;
    wanted.set(k, (wanted.get(k) ?? 0) + Math.max(1, Math.min(10, it.quantity || 1)));
    if (!firstSeen.has(k)) firstSeen.set(k, it);
  }

  const rows: Array<Record<string, unknown>> = [];
  let duplicates = 0;
  const imageCache = new Map<number, string | null>();

  for (const [k, units] of wanted) {
    const it = firstSeen.get(k)!;
    const name = it.name.trim();
    const have = owned.get(k) ?? 0;
    const toInsert = Math.max(0, units - have);
    duplicates += units - toInsert;
    if (toInsert === 0) continue;

    let image_url: string | null = null;
    let image_source: string | null = null;
    if (it.image_index != null && ctx.imageUrls[it.image_index]) {
      if (!imageCache.has(it.image_index)) imageCache.set(it.image_index, await storeImageFromUrl(admin, userId, ctx.imageUrls[it.image_index]!));
      image_url = imageCache.get(it.image_index) ?? null;
      image_source = image_url ? 'email' : null;
    }
    for (let i = have; i < have + toInsert; i++) {
      rows.push({
        user_id: userId, name, brand: it.brand, size: it.size, color: it.color ? titleCase(it.color) : null,
        price_cents: it.price_cents, purchase_date: purchaseDate, retailer, image_url, image_source, line_index: i,
        category: guessIntimates(name),
        source: 'email', return_by: purchaseDate && ctx.returnWindowDays != null ? addDays(purchaseDate, ctx.returnWindowDays) : null,
      });
    }
  }
  if (rows.length === 0) return { inserted: [], duplicates };
  const { data, error } = await admin.from('items').insert(rows).select('*');
  if (error) {
    // Unique-index race (same email processed twice concurrently): count as duplicates, don't fail the scan.
    if (error.code === '23505') return { inserted: [], duplicates: duplicates + rows.length };
    throw new Error(`insert items: ${error.message}`);
  }
  return { inserted: (data ?? []) as Item[], duplicates };
}
