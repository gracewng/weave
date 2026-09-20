import 'server-only';
import { callLLM, embedTexts, decideVerdict, verdictReason, priceMemory, summarizeBudget } from '@weave/shared';
import { PARSE_QUERY_SYSTEM, ParseQuerySchema, SEARCH_NOTE_SYSTEM, searchNoteInput, type ParseQueryResult } from '@weave/shared/prompts';
import type { ShoppingResult, Verdict, VerdictInputs } from '@weave/shared/contracts';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureLLM } from '@/lib/llm';
import { searchProducts } from '@/lib/identify';
import { secondhandLinks, retailLinks } from '@weave/data';
import type { MarketplaceLink } from '@weave/shared/contracts';
type Link = MarketplaceLink & { url: string };

export interface OwnedHit { id: string; name: string; brand: string | null; image_url: string | null; price_cents: number | null; size: string | null; similarity: number }
export interface FriendHit { id: string; owner_id: string; owner_name: string | null; name: string; image_url: string | null; size: string | null; similarity: number }
export interface Listing extends ShoppingResult { kind: 'used' | 'new' }

export interface LocalStage {
  q: string; forOther: boolean; parsed: ParseQueryResult; embedText: string;
  owned: OwnedHit[]; friends: FriendHit[];
  memory: { medianCents: number; n: number; scope: 'brand' | 'category' } | null;
  budgetRemainingCents: number | null;
  /** Rules 1–2 only depend on local data; if one fires we can say so before the market stage. */
  provisional: Verdict | null;
  costUsd: number;
}
export interface MarketStage {
  used: Listing[]; retail: Listing[]; links: { secondhand: Link[]; retail: Link[] };
  priceCents: number | null; priceSource: 'user' | 'retail' | 'none';
  cheapestUsedCents: number | null;
  verdict: Verdict; reason: string; note: string; noteProvider: string; costUsd: number;
}

const RESALE = /\b(ebay|poshmark|mercari|depop|thredup|vinted|grailed|therealreal|etsy|vestiaire)\b/i;
const parseCache = new Map<string, ParseQueryResult>();
const embedCache = new Map<string, number[]>();

/** Embed the query in the same shape as item descriptions so cosine scores are comparable. */
function descriptionShape(p: ParseQueryResult): string {
  const base = p.description?.trim() || `${p.color ? p.color + ' ' : ''}${p.query}, casual`;
  return `${base}${p.brand ? `, ${p.brand}` : ''}`.toLowerCase();
}

export async function runLocalStage(userId: string, q: string, forOther: boolean): Promise<LocalStage> {
  ensureLLM();
  const admin = createAdminClient(); if (!admin) throw new Error('service role not configured');
  let cost = 0;
  const key = q.toLowerCase().trim();
  let parsed = parseCache.get(key);
  if (!parsed) {
    const r = await callLLM<ParseQueryResult>({
      task: 'parse_query', system: PARSE_QUERY_SYSTEM, schema: ParseQuerySchema, schemaName: 'parse_query', input: q, userId,
      fixture: () => ({ query: key, category: null, color: null, brand: null, max_price_cents: null, occasion: null, one_time_need: /wedding|formal|gala|interview|costume|party/i.test(key), description: `${key}, casual` }),
    });
    parsed = r.data; cost += r.costUsd; parseCache.set(key, parsed);
  }
  const embedText = descriptionShape(parsed);
  let vec = embedCache.get(embedText);
  if (!vec) { const e = await embedTexts([embedText], userId); vec = e.vectors[0]!; cost += e.costUsd; embedCache.set(embedText, vec); }

  const [ownedRes, friendRes, itemsRes, budgetRes, spentRes] = await Promise.all([
    forOther ? Promise.resolve({ data: [] }) : admin.rpc('match_items', { p_user_id: userId, query_embedding: JSON.stringify(vec), k: 5 }),
    forOther ? Promise.resolve({ data: [] }) : admin.rpc('match_friend_items', { p_user_id: userId, query_embedding: JSON.stringify(vec), k: 5 }),
    admin.from('items').select('category,brand,price_cents').eq('user_id', userId).in('status', ['owned', 'returning', 'returned', 'gifted']),
    admin.from('budgets').select('*').eq('user_id', userId).maybeSingle(),
    admin.from('items').select('price_cents').eq('user_id', userId).gte('purchase_date', new Date().toISOString().slice(0, 8) + '01'),
  ]);
  const ownedRaw = (ownedRes.data ?? []) as Array<{ id: string; name: string; brand: string | null; image_url: string | null; price_cents: number | null; size: string | null; similarity: number }>;
  const owned: OwnedHit[] = ownedRaw
    .sort((a, b) => b.similarity - a.similarity);
  // Friends' items are shown only when plausibly the same kind of garment; the borrow *rule* needs ≥ 0.55.
  const FRIEND_DISPLAY_FLOOR = 0.45;
  const friends = ((friendRes.data ?? []) as Array<{ id: string; owner_id: string; owner_name: string | null; name: string; image_url: string | null; size: string | null; similarity: number }>).filter((f) => f.similarity >= FRIEND_DISPLAY_FLOOR);

  const memory = priceMemory((itemsRes.data ?? []) as Array<{ category: string | null; brand: string | null; price_cents: number | null }>, parsed.category, parsed.brand);
  const b = budgetRes.data as { monthly_income_cents: number | null; clothing_pct: number; envelope_override_cents: number | null } | null;
  const now = new Date();
  const budget = b ? summarizeBudget({ monthlyIncomeCents: b.monthly_income_cents, clothingPct: Number(b.clothing_pct), envelopeOverrideCents: b.envelope_override_cents,
    spentThisMonthCents: ((spentRes.data ?? []) as Array<{ price_cents: number | null }>).reduce((s, x) => s + (x.price_cents ?? 0), 0),
    dayOfMonth: now.getUTCDate(), daysInMonth: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate() }) : null;

  const top = owned[0]; const topF = friends[0];
  const provisionalInputs: VerdictInputs = { topOwnedSimilarity: top?.similarity ?? null, topFriendSimilarity: topF?.similarity ?? null,
    friendItemLendable: !!topF, oneTimeNeedSignal: parsed.one_time_need || !!parsed.occasion, priceCents: 0, cheapestUsedCents: null, budgetRemainingCents: null, forOther };
  const v = decideVerdict(provisionalInputs);
  return { q, forOther, parsed, embedText, owned, friends, memory, budgetRemainingCents: budget?.remainingCents ?? null, provisional: v === 'skip' || v === 'borrow' ? v : null, costUsd: cost };
}

export async function runMarketStage(userId: string, local: LocalStage, userPriceCents: number | null): Promise<MarketStage> {
  ensureLLM();
  let cost = 0;
  const q = local.parsed.query || local.q;
  let results: ShoppingResult[] = [];
  try { results = (await searchProducts(q, 20)).results; } catch (err) { console.warn('[search] market lookup failed', err instanceof Error ? err.message : err); }
  const used: Listing[] = results.filter((r) => RESALE.test(r.merchant ?? '')).map((r): Listing => ({ ...r, kind: 'used' })).sort((a, b) => (a.priceCents ?? 1e9) - (b.priceCents ?? 1e9)).slice(0, 4);
  const retail: Listing[] = results.filter((r) => !RESALE.test(r.merchant ?? '')).map((r): Listing => ({ ...r, kind: 'new' })).slice(0, 4);
  const retailPrice = retail.find((r) => r.priceCents != null)?.priceCents ?? null;
  const priceCents = userPriceCents ?? retailPrice ?? null;
  const priceSource: MarketStage['priceSource'] = userPriceCents != null ? 'user' : retailPrice != null ? 'retail' : 'none';
  const cheapestUsedCents = used.find((u) => u.priceCents != null)?.priceCents ?? null;

  const top = local.owned[0]; const topF = local.friends[0];
  const inputs: VerdictInputs = { topOwnedSimilarity: top?.similarity ?? null, topFriendSimilarity: topF?.similarity ?? null,
    friendItemLendable: !!topF, oneTimeNeedSignal: local.parsed.one_time_need || !!local.parsed.occasion, priceCents: priceCents ?? 0, cheapestUsedCents,
    budgetRemainingCents: local.budgetRemainingCents, forOther: local.forOther };
  const verdict = decideVerdict(inputs);
  const reason = verdictReason(verdict, inputs);

  const FIXTURE_NOTES: Record<Verdict, string> = {
    skip: top ? `You already own ${top.name}.` : 'You already own something like this.',
    borrow: topF ? `${topF.owner_name ?? 'A friend'} has a ${topF.name} in your size.` : 'A friend can lend you this.',
    secondhand: cheapestUsedCents != null ? `A used one is $${(cheapestUsedCents / 100).toFixed(0)} instead of $${((priceCents ?? 0) / 100).toFixed(0)}.` : 'A used one costs less.',
    wait: 'This is over what is left in this month\'s envelope.',
    buy: local.forOther ? 'For someone else, so your wardrobe does not apply.' : 'Nothing in your wardrobe or your friends\' matches. Your call.',
  };
  let note = FIXTURE_NOTES[verdict]; let noteProvider = 'fixture';
  try {
    const r = await callLLM<string>({
      task: 'search_note', system: SEARCH_NOTE_SYSTEM, userId,
      input: searchNoteInput({ verdict, query: local.q, ownedSimilar: local.owned.slice(0, 3).map((o) => ({ name: o.name, price_cents: o.price_cents })),
        friendItem: topF ? { name: topF.name, friendName: topF.owner_name ?? 'a friend' } : null, cheapestUsedCents, usualPriceCents: local.memory?.medianCents ?? null, budgetRemainingCents: local.budgetRemainingCents })
        + (local.forOther ? '\nSHOPPING FOR: someone else (do not mention the user\'s own wardrobe)' : ''),
      fixture: () => FIXTURE_NOTES[verdict], allowFixtureOutsideDemo: true,
    });
    note = r.text.trim() || note; noteProvider = r.provider; cost += r.costUsd;
  } catch { /* fixture note stands */ }
  return { used, retail, links: { secondhand: secondhandLinks(q), retail: retailLinks(q) }, priceCents, priceSource, cheapestUsedCents, verdict, reason, note, noteProvider, costUsd: cost };
}
