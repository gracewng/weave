import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ShoppingResult } from '@weave/shared/contracts';
import { createAdminClient } from '@/lib/supabase/admin';
import { storeImageFromUrl, fetchProductPageImage } from '@/lib/ingest/persist';
import { callLLM } from '@weave/shared';
import { JUDGE_IMAGES_SYSTEM, JudgeImagesSchema, type JudgeImagesResult } from '@weave/shared/prompts';
import { ensureLLM } from '@/lib/llm';

/**
 * Identify the item: name/brand/color (+ retailer) → the specific product with a clean image.
 * Deterministic query, SerpAPI Google Shopping, results cached forever in `product_lookups`.
 * Uses the SerpAPI key directly until @weave/clients (Devin task 2) lands; the shapes match the contract.
 */

const STOP = /\b(women'?s|men'?s|womens|mens|unisex|pack|of|the|and|with|for|size|sz|color)\b/gi;

/** School/team/custom merch has no retail product image. Don't guess; a photo is the right source. */
const CUSTOM_RE = /\b(class of|senior|homecoming|team|custom|personali[sz]ed|school|club|fundraiser|spirit wear|jersey #|snack fee|fee)\b/i;
export function isCustomItem(name: string): boolean { return CUSTOM_RE.test(name); }

/**
 * Real UPC/EAN codes (8–14 digits) resolve in a public barcode database (free trial endpoint, no key, ~100/day).
 * Retailer-internal item numbers (e.g. Victoria's Secret receipts) do not — verified 2026-09-19 — so we return null
 * and fall through to the name search. Google Shopping/web search by number returned nothing useful; not used.
 */
export async function lookupByBarcode(identifier: string | null | undefined): Promise<{ title: string; brand: string | null; imageUrl: string } | null> {
  const id = identifier?.replace(/\s+/g, '').trim();
  if (!id || !/^\d{8,14}$/.test(id)) return null;
  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${id}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const d = (await res.json()) as { items?: Array<{ title?: string; brand?: string; images?: string[] }> };
    const it = d.items?.[0]; const img = it?.images?.find((u) => /^https?:\/\//.test(u));
    return it?.title && img ? { title: it.title, brand: it.brand ?? null, imageUrl: img } : null;
  } catch { return null; }
}

export function buildQuery(item: { name: string; brand?: string | null; color?: string | null; retailer?: string | null }): string {
  const brand = (item.brand ?? '').trim();
  let name = item.name.replace(STOP, ' ').replace(/\s+/g, ' ').trim();
  if (brand && name.toLowerCase().includes(brand.toLowerCase())) name = name.replace(new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim();
  const color = item.color && item.color.toLowerCase() !== 'unknown' ? item.color : '';
  return [brand, name, color].filter(Boolean).join(' ').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** "Bare Strapless Bra — color: black" so the judge can reject wrong colors. */
export function judgeLabel(item: { name: string; color?: string | null; brand?: string | null }): string {
  const color = item.color && item.color.toLowerCase() !== 'unknown' ? ` — color: ${item.color}` : ' — color not known';
  return `${item.brand ? item.brand + ' ' : ''}${item.name}${color}`;
}

function tokens(s: string): Set<string> { return new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2)); }

/** Deterministic rank: brand present, name-token overlap, has thumbnail. Higher is better. */
const RESALE = /\b(ebay|poshmark|mercari|depop|thredup|vinted|grailed|etsy)\b/i;

/** Name-token overlap of a candidate with the query, 0..1. The confidence gate uses it. */
export function overlapScore(query: string, title: string): number {
  const q = tokens(query); const t = tokens(title); let n = 0; for (const tok of q) if (t.has(tok)) n++; return q.size ? n / q.size : 0;
}

/** Overlap on the *distinctive* words only (brand/retailer words removed), so "Victoria's Secret" can't carry a wrong style. */
export function distinctiveOverlap(query: string, title: string, brand?: string | null, retailer?: string | null): number {
  const drop = tokens(`${brand ?? ''} ${retailer ?? ''}`);
  const q = [...tokens(query)].filter((t) => !drop.has(t)); const t = tokens(title);
  if (q.length === 0) return 0;
  return q.filter((tok) => t.has(tok)).length / q.length;
}

/**
 * Auto-assign only when we're sure. Sold by the retailer/brand itself → distinctive overlap ≥ 0.5.
 * Anyone else → every distinctive word must appear (≥ 0.99) and the brand must be in the title. Otherwise: no image, user picks.
 */
export function confident(query: string, brand: string | null | undefined, retailer: string | null | undefined, c: ShoppingResult, byIdentifier: boolean): boolean {
  if (byIdentifier) return true;
  const sellers = [brand, retailer].filter((x): x is string => !!x).map((x) => x.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const src = (c.merchant ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const d = distinctiveOverlap(query, c.title, brand, retailer);
  if (sellers.some((s) => s && src.includes(s))) return d >= 0.5;
  return d >= 0.99 && !!brand && c.title.toLowerCase().includes(brand.toLowerCase());
}

/** Deterministic rank: sold by the retailer/brand itself > name-token overlap > brand in title > has image. Resale marketplaces last. */
export function rankCandidates(query: string, brand: string | null | undefined, results: ShoppingResult[], retailer?: string | null): ShoppingResult[] {
  const q = tokens(query);
  const sellers = [brand, retailer].filter((x): x is string => !!x).map((x) => x.toLowerCase().replace(/[^a-z0-9]/g, ''));
  return [...results].map((r) => {
    const t = tokens(r.title);
    let overlap = 0; for (const tok of q) if (t.has(tok)) overlap++;
    const src = (r.merchant ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const official = sellers.some((s) => s && src.includes(s));
    const score = overlap / Math.max(1, q.size)
      + (official ? 0.8 : 0)
      + (brand && r.title.toLowerCase().includes(brand.toLowerCase()) ? 0.3 : 0)
      + (r.imageUrl ? 0.2 : 0) + (r.productOnly ? 0.1 : 0)
      - (RESALE.test(r.merchant ?? '') ? 0.4 : 0);
    return { r, score };
  }).sort((a, b) => b.score - a.score).map((x) => x.r);
}

async function serpShopping(query: string, limit: number): Promise<ShoppingResult[]> {
  const key = process.env.SERPAPI_KEY;
  if (!key) return [];
  const params = new URLSearchParams({ engine: 'google_shopping', q: query, gl: 'us', hl: 'en', num: String(Math.min(20, limit)), api_key: key });
  // Fresh Google Shopping searches take ~20–25s on SerpAPI; identical queries are served from their cache instantly and free.
  const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(45000) });
  if (!res.ok) throw new Error(`serpapi ${res.status}`);
  const json = (await res.json()) as { shopping_results?: Array<{ title?: string; thumbnail?: string; extracted_price?: number; price?: string; source?: string; link?: string; product_link?: string }> };
  return (json.shopping_results ?? []).slice(0, limit).map((r) => ({
    title: r.title ?? '', imageUrl: r.thumbnail ?? '', priceCents: typeof r.extracted_price === 'number' ? Math.round(r.extracted_price * 100) : null,
    merchant: r.source ?? null, url: r.product_link ?? r.link ?? null, productOnly: null,
  })).filter((r) => r.title && r.imageUrl);
}

/**
 * Vision judge: which of the top candidates show ONLY the garment? One low-detail call per item (~$0.001).
 * Sets `productOnly` on the candidates (null → true/false). Failures leave them null; ranking still works.
 */
/** Compact profile line for the judge. Only department/age/gender; used for image matching and nothing else. */
export async function profileLine(userId: string | null | undefined): Promise<string> {
  if (!userId) return '';
  const admin = createAdminClient(); if (!admin) return '';
  const { data } = await admin.from('profiles').select('age_range,gender,shops_department').eq('id', userId).maybeSingle();
  const p = data as { age_range: string | null; gender: string | null; shops_department: string | null } | null;
  if (!p) return '';
  const parts = [p.shops_department ? `shops ${p.shops_department.replace('womens', "women's").replace('mens', "men's")}` : null, p.gender && p.gender !== 'prefer_not' ? p.gender.replace('_', '-') : null, p.age_range && p.age_range !== 'prefer_not' ? `age ${p.age_range.replace('_', '–').replace('under–18', 'under 18').replace('55–plus', '55+')}` : null].filter(Boolean);
  return parts.length ? `ACCOUNT HOLDER: ${parts.join(', ')}` : '';
}

export async function judgeProductOnly(itemName: string, candidates: ShoppingResult[], userId?: string | null, limit = 6): Promise<ShoppingResult[]> {
  const top = candidates.slice(0, limit);
  if (top.length === 0) return candidates;
  ensureLLM();
  try {
    const r = await callLLM<JudgeImagesResult>({
      task: 'judge_images', system: JUDGE_IMAGES_SYSTEM, schema: JudgeImagesSchema, schemaName: 'judge_images', userId,
      input: [{ role: 'user', content: [
        { type: 'text', text: `ITEM: ${itemName}\n${await profileLine(userId)}\nIMAGES (numbered):` },
        ...top.flatMap((c, i): Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'low' } }> => [
          { type: 'text', text: `${i}:` }, { type: 'image_url', image_url: { url: c.imageUrl, detail: 'low' } },
        ]),
      ] }],
      fixture: () => ({ images: top.map((_, i) => ({ index: i, product_only: false, matches_item: true, fits_profile: true })) }),
    });
    const verdicts = new Map(r.data.images.map((v) => [v.index, v]));
    return candidates.map((c, i) => {
      const v = verdicts.get(i);
      return v ? { ...c, productOnly: v.product_only, matchesItem: v.matches_item, fitsProfile: v.fits_profile } as ShoppingResult & { matchesItem?: boolean; fitsProfile?: boolean } : c;
    });
  } catch (err) {
    console.warn('[identify] judge failed', err instanceof Error ? err.message : err);
    return candidates;
  }
}

/** Product-only + matches first, then the deterministic rank order. */
export function preferProductOnly(ranked: Array<ShoppingResult & { matchesItem?: boolean; fitsProfile?: boolean }>): ShoppingResult[] {
  const score = (c: ShoppingResult & { matchesItem?: boolean; fitsProfile?: boolean }) => (c.matchesItem === false ? -2 : 0) + (c.fitsProfile === false ? -1 : 0) + (c.productOnly === true ? 2 : c.productOnly === false ? 0 : 1);
  return [...ranked].map((c, i) => ({ c, i })).sort((a, b) => score(b.c) - score(a.c) || a.i - b.i).map((x) => x.c);
}

/** Cached product search. One SerpAPI call per distinct query, ever. */
export async function searchProducts(query: string, limit = 8): Promise<{ results: ShoppingResult[]; cached: boolean }> {
  const admin = createAdminClient(); if (!admin) throw new Error('service role not configured');
  const q = query.toLowerCase().trim();
  const { data: hit } = await admin.from('product_lookups').select('results,hits').eq('query', q).maybeSingle();
  if (hit) {
    await admin.from('product_lookups').update({ hits: ((hit as { hits: number }).hits ?? 0) + 1 }).eq('query', q);
    return { results: ((hit as { results: ShoppingResult[] }).results ?? []).slice(0, limit), cached: true };
  }
  const results = await serpShopping(q, 10);
  await admin.from('product_lookups').upsert({ query: q, engine: 'google_shopping', results, hits: 1 });
  return { results: results.slice(0, limit), cached: false };
}

export interface LookupSummary { looked_up: number; imaged: number; searches: number; cached: number; skipped: number }

/** Give image-less items a product image. Caps searches per run to protect the quota. */
export async function lookupMissingImages(userId: string, opts: { limit?: number; maxSearches?: number; itemIds?: string[] } = {}): Promise<LookupSummary> {
  const admin = createAdminClient(); if (!admin) throw new Error('service role not configured');
  const out: LookupSummary = { looked_up: 0, imaged: 0, searches: 0, cached: 0, skipped: 0 };
  if (!process.env.SERPAPI_KEY) return out;
  const maxSearches = opts.maxSearches ?? 20;
  let sel = admin.from('items').select('id,name,brand,color,retailer,identifier,product_url,image_source').eq('user_id', userId).is('image_url', null).eq('status', 'owned').limit(opts.limit ?? 50);
  if (opts.itemIds?.length) sel = sel.in('id', opts.itemIds);
  const { data } = await sel;
  const items = (data ?? []) as Array<{ id: string; name: string; brand: string | null; color: string | null; retailer: string | null; identifier: string | null; product_url: string | null; image_source: string | null }>;
  const imageByQuery = new Map<string, { url: string | null; source: string }>();
  for (const it of items) {
    if (it.image_source === 'none') { out.skipped++; continue; }          // user cleared a wrong image: leave it alone
    // 1. The product page linked from the order email (exact).
    if (it.product_url) {
      const og = await fetchProductPageImage(it.product_url);
      const stored = og ? await storeImageFromUrl(admin, userId, og) : null;
      if (stored) { const { error } = await admin.from('items').update({ image_url: stored, image_source: 'product_page' }).eq('id', it.id); if (!error) { out.imaged++; out.looked_up++; continue; } }
    }
    // 2. Barcode database for real UPC/EAN codes (free, exact).
    if (it.identifier) {
      const bc = await lookupByBarcode(it.identifier);
      const stored = bc ? await storeImageFromUrl(admin, userId, bc.imageUrl) : null;
      if (stored) { const { error } = await admin.from('items').update({ image_url: stored, image_source: 'identifier' }).eq('id', it.id); if (!error) { out.imaged++; out.looked_up++; continue; } }
    }
    // 3. Name search: a confident match (retailer's own listing, or strong name + brand overlap) first, else the closest image.
    const q = buildQuery(it);
    if (!q) { out.skipped++; continue; }
    out.looked_up++;
    if (!imageByQuery.has(q)) {
      if (out.searches >= maxSearches) { out.skipped++; continue; }
      try {
        const { results, cached } = await searchProducts(q, 8);
        if (cached) out.cached++; else out.searches++;
        const ranked = rankCandidates(q, it.brand, results, it.retailer);
        const judged = preferProductOnly(await judgeProductOnly(judgeLabel(it), ranked, userId));
        // A confident match wins; otherwise the closest search image still beats a blank tag (lead decision,
        // 2026-09-20). The Options strip on the item page lets the user swap it.
        const sure = judged.find((c) => confident(q, it.brand, it.retailer, c, false));
        const best = sure ?? judged[0] ?? ranked[0] ?? null;
        imageByQuery.set(q, { url: best ? await storeImageFromUrl(admin, userId, best.imageUrl) : null, source: 'shopping' });
        if (best && !sure) console.log('[identify] no confident match for', q, '— using the closest search image');
      } catch (err) { console.warn('[identify] lookup failed', q, err instanceof Error ? err.message : err); imageByQuery.set(q, { url: null, source: 'shopping' }); }
    }
    const hit = imageByQuery.get(q);
    if (hit?.url) {
      const { error } = await admin.from('items').update({ image_url: hit.url, image_source: hit.source }).eq('id', it.id);
      if (!error) out.imaged++;
    }
  }
  return out;
}

/** Candidate strip for the item page: cached results for this item's query (no new search unless `allowSearch`). */
export async function candidatesFor(item: { name: string; brand?: string | null; color?: string | null; retailer?: string | null }, allowSearch = false, userId?: string | null): Promise<{ query: string; results: ShoppingResult[] }> {
  const admin = createAdminClient(); if (!admin) return { query: '', results: [] };
  const q = buildQuery(item);
  const { data: hit } = await admin.from('product_lookups').select('results').eq('query', q).maybeSingle();
  if (hit) return { query: q, results: rankCandidates(q, item.brand, ((hit as { results: ShoppingResult[] }).results ?? []), item.retailer).slice(0, 6) };
  if (!allowSearch) return { query: q, results: [] };
  const { results } = await searchProducts(q, 8);
  const ranked = rankCandidates(q, item.brand, results, item.retailer);
  return { query: q, results: preferProductOnly(await judgeProductOnly(judgeLabel(item), ranked, userId)).slice(0, 6) };
}

export async function applyCandidateImage(admin: SupabaseClient, userId: string, itemId: string, imageUrl: string): Promise<boolean> {
  const stored = await storeImageFromUrl(admin, userId, imageUrl);
  if (!stored) return false;
  const { error } = await admin.from('items').update({ image_url: stored, image_source: 'shopping' }).eq('id', itemId).eq('user_id', userId);
  return !error;
}
