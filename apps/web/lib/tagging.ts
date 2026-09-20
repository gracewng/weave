import 'server-only';
import { callLLM, embedTexts } from '@weave/shared';
import { TAG_ITEMS_SYSTEM, TagItemsSchema, tagItemsInput, type TagItemsResult } from '@weave/shared/prompts';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureLLM } from '@/lib/llm';

const BATCH = 20;

export interface TagSummary { tagged: number; embedded: number; costUsd: number; calls: number; skipped: number }

/**
 * Fill category/slot/color/formality/description for items missing them (batched 20/call), then embed
 * descriptions that have no embedding yet. Never re-tags or re-embeds — token discipline.
 */
export async function tagAndEmbed(userId: string, opts: { limit?: number } = {}): Promise<TagSummary> {
  ensureLLM();
  const admin = createAdminClient();
  if (!admin) throw new Error('service role not configured');
  const out: TagSummary = { tagged: 0, embedded: 0, costUsd: 0, calls: 0, skipped: 0 };

  // ── tag ─────────────────────────────────────────────────────────────────────
  const { data: prof } = await admin.from('profiles').select('shops_department').eq('id', userId).maybeSingle();
  const shops = (prof as { shops_department: string | null } | null)?.shops_department ?? null;
  const { data: untagged } = await admin.from('items').select('id,name,brand,color,retailer,category')
    .eq('user_id', userId).or('description.is.null,slot.is.null').limit(opts.limit ?? 200);
  const rows = (untagged ?? []) as Array<{ id: string; name: string; brand: string | null; color: string | null; retailer: string | null; category: string | null }>;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    try {
      const r = await callLLM<TagItemsResult>({
        task: 'tag_items', system: TAG_ITEMS_SYSTEM, schema: TagItemsSchema, schemaName: 'tag_items',
        input: tagItemsInput(batch), userId,
        fixture: () => ({ items: batch.map((b) => ({ id: b.id, category: (b.category as never) ?? 'other', slot: 'top' as const, color: b.color ?? 'unknown', formality: 2, description: `${b.color ?? ''} ${b.name}, casual, ${b.brand ?? b.retailer ?? ''}`.trim(), department: 'unknown' as const })) }),
      });
      out.calls++; out.costUsd += r.costUsd;
      const byId = new Map(batch.map((b) => [b.id, b]));
      for (const t of r.data.items) {
        const src = byId.get(t.id); if (!src) continue;
        // Keep an insert-time intimates guess (privacy) even if the model says otherwise.
        const category = src.category === 'intimates' ? 'intimates' : t.category;
        // Mismatch flag: the garment's department contradicts the account holder's usual department (deterministic; profile used for nothing else).
        const mismatch = !!shops && shops !== 'both' && t.department !== 'unknown' && t.department !== 'unisex' && t.department !== shops;
        const { error } = await admin.from('items').update({ category, slot: t.slot, color: t.color, formality: t.formality, description: t.description, department: t.department, profile_mismatch: mismatch }).eq('id', t.id).eq('user_id', userId);
        if (!error) out.tagged++;
      }
    } catch (err) {
      out.skipped += batch.length;
      console.warn('[tag] batch failed', err instanceof Error ? err.message : err);
    }
  }

  // ── embed ───────────────────────────────────────────────────────────────────
  const { data: unembedded } = await admin.from('items').select('id,description')
    .eq('user_id', userId).is('embedding', null).not('description', 'is', null).limit(opts.limit ?? 200);
  const toEmbed = (unembedded ?? []) as Array<{ id: string; description: string }>;
  for (let i = 0; i < toEmbed.length; i += 100) {
    const batch = toEmbed.slice(i, i + 100);
    try {
      const r = await embedTexts(batch.map((b) => b.description), userId);
      out.costUsd += r.costUsd;
      for (let j = 0; j < batch.length; j++) {
        const vec = r.vectors[j]; if (!vec) continue;
        const { error } = await admin.from('items').update({ embedding: JSON.stringify(vec) }).eq('id', batch[j]!.id);
        if (!error) out.embedded++;
      }
    } catch (err) {
      console.warn('[embed] batch failed', err instanceof Error ? err.message : err);
    }
  }
  return out;
}

export interface SimilarItem { id: string; name: string; brand: string | null; category: string | null; color: string | null; size: string | null; image_url: string | null; description: string | null; price_cents: number | null; similarity: number }

/** Nearest owned items to a query string (or to an existing item's embedding). */
export async function similarOwned(userId: string, query: { text?: string; itemId?: string }, k = 5): Promise<SimilarItem[]> {
  ensureLLM();
  const admin = createAdminClient();
  if (!admin) throw new Error('service role not configured');
  let vector: number[] | null = null;
  if (query.itemId) {
    const { data } = await admin.from('items').select('embedding').eq('id', query.itemId).maybeSingle();
    const raw = (data as { embedding?: string | number[] } | null)?.embedding;
    if (raw) vector = typeof raw === 'string' ? (JSON.parse(raw) as number[]) : raw;
  }
  if (!vector && query.text) {
    const r = await embedTexts([query.text], userId);
    vector = r.vectors[0] ?? null;
  }
  if (!vector) return [];
  const { data, error } = await admin.rpc('match_items', { p_user_id: userId, query_embedding: JSON.stringify(vector), k: k + (query.itemId ? 1 : 0) });
  if (error) throw new Error(`match_items: ${error.message}`);
  const rows = (data ?? []) as SimilarItem[];
  return rows.filter((r) => r.id !== query.itemId).slice(0, k);
}
