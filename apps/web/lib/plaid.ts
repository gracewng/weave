import 'server-only';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode, type Transaction as PlaidTx } from 'plaid';
import type { SupabaseClient } from '@supabase/supabase-js';
import { matchTransaction } from '@weave/shared/matcher';
import { FALLBACK_RETAILERS } from '@/lib/ingest/retailers-fallback';
import { retailerData } from '@weave/data';
import { sendPush } from '@/lib/push';

/** Plaid sandbox wrapper. Devin's @weave/clients may replace this; shapes match the PlaidClient contract. */
export function plaidConfigured(): boolean { return !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET); }

let client: PlaidApi | null = null;
export function plaid(): PlaidApi {
  if (client) return client;
  const env = (process.env.PLAID_ENV ?? 'sandbox') as keyof typeof PlaidEnvironments;
  client = new PlaidApi(new Configuration({ basePath: PlaidEnvironments[env] ?? PlaidEnvironments.sandbox, baseOptions: { headers: { 'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!, 'PLAID-SECRET': process.env.PLAID_SECRET! } } }));
  return client;
}

export async function createLinkToken(userId: string): Promise<string> {
  const r = await plaid().linkTokenCreate({ user: { client_user_id: userId }, client_name: 'Weave', products: [Products.Transactions], country_codes: [CountryCode.Us], language: 'en' });
  return r.data.link_token;
}

/** Sandbox shortcut: create a public token for a test institution without the Link UI (tests / demo panel). */
export async function sandboxPublicToken(): Promise<string> {
  const r = await plaid().sandboxPublicTokenCreate({ institution_id: 'ins_109508', initial_products: [Products.Transactions] });
  return r.data.public_token;
}

export async function exchangeAndStore(admin: SupabaseClient, userId: string, publicToken: string, institution?: string | null): Promise<string> {
  const r = await plaid().itemPublicTokenExchange({ public_token: publicToken });
  await admin.from('plaid_items').upsert({ user_id: userId, item_id: r.data.item_id, access_token: r.data.access_token, institution: institution ?? null, cursor: null });
  return r.data.item_id;
}

/** Plaid's clothing category, or a merchant string that names a known clothing retailer. */
export function looksLikeClothing(tx: { merchant: string; category: string | null }): boolean {
  if (tx.category && /CLOTHING|APPAREL|SHOE/i.test(tx.category)) return true;
  const m = tx.merchant.toUpperCase();
  if (retailerData.retailers.length) return !!retailerData.byMerchant(tx.merchant);
  return FALLBACK_RETAILERS.some((r) => m.includes(r.name.toUpperCase()) || r.domains.some((d) => m.includes(d.split('.')[0]!.toUpperCase())));
}

export interface SyncSummary { added: number; clothing: number; matched: number; mystery: number; unmatched: number; removed: number }

/** /transactions/sync for every linked item; classify, match against email orders, insert. */
export async function syncTransactions(admin: SupabaseClient, userId: string): Promise<SyncSummary> {
  const out: SyncSummary = { added: 0, clothing: 0, matched: 0, mystery: 0, unmatched: 0, removed: 0 };
  const { data: items } = await admin.from('plaid_items').select('item_id,access_token,cursor').eq('user_id', userId);
  for (const it of (items ?? []) as Array<{ item_id: string; access_token: string; cursor: string | null }>) {
    let cursor = it.cursor ?? undefined; let hasMore = true; const added: PlaidTx[] = []; const removed: string[] = [];
    while (hasMore) {
      const r = await plaid().transactionsSync({ access_token: it.access_token, cursor, count: 250 });
      added.push(...r.data.added); removed.push(...r.data.removed.map((x) => x.transaction_id!)); cursor = r.data.next_cursor; hasMore = r.data.has_more;
    }
    if (removed.length) { const { data } = await admin.from('transactions').delete().in('external_id', removed).select('id'); out.removed += data?.length ?? 0; }
    if (added.length) await insertCharges(admin, userId, added.map((t) => ({
      externalId: t.transaction_id, merchant: t.merchant_name ?? t.name, amountCents: Math.round(t.amount * 100),
      date: t.date, category: t.personal_finance_category?.detailed ?? t.personal_finance_category?.primary ?? null, pending: !!t.pending, source: 'plaid' as const,
    })), out);
    await admin.from('plaid_items').update({ cursor, last_sync_at: new Date().toISOString() }).eq('item_id', it.item_id);
  }
  return out;
}

export interface ChargeInput { externalId: string; merchant: string; amountCents: number; date: string; category: string | null; pending: boolean; source: 'plaid' | 'mock' }

/** Insert charges (outflows only), mark clothing, match to email orders; older unmatched → mystery, recent → unmatched. */
export async function insertCharges(admin: SupabaseClient, userId: string, charges: ChargeInput[], out: SyncSummary) {
  const outflows = charges.filter((c) => c.amountCents > 0);
  const { data: orders } = await admin.from('items').select('id,retailer,price_cents,purchase_date').eq('user_id', userId).eq('source', 'email').not('purchase_date', 'is', null);
  // email orders = items grouped by (retailer, date) with summed price
  const byOrder = new Map<string, { id: string; retailer: string; totalCents: number; date: string; itemIds: string[] }>();
  for (const o of (orders ?? []) as Array<{ id: string; retailer: string | null; price_cents: number | null; purchase_date: string }>) {
    const k = `${o.retailer ?? ''}|${o.purchase_date}`;
    const e = byOrder.get(k) ?? { id: k, retailer: o.retailer ?? '', totalCents: 0, date: o.purchase_date, itemIds: [] };
    e.totalCents += o.price_cents ?? 0; e.itemIds.push(o.id); byOrder.set(k, e);
  }
  const orderList = [...byOrder.values()];
  const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString().slice(0, 10);
  const rows = outflows.map((c) => {
    const clothing = looksLikeClothing({ merchant: c.merchant, category: c.category });
    const m = clothing ? matchTransaction({ merchant: c.merchant, amountCents: c.amountCents, date: c.date }, orderList) : null;
    const status = !clothing ? 'skipped' : m ? 'matched' : c.date >= cutoff ? 'unmatched' : 'mystery';
    if (clothing) out.clothing++; if (m) out.matched++; else if (status === 'mystery') out.mystery++; else if (status === 'unmatched') out.unmatched++;
    return { user_id: userId, external_id: c.externalId, merchant: c.merchant, amount_cents: c.amountCents, date: c.date, is_clothing: clothing, match_status: status,
      item_ids: m ? byOrder.get(m.orderId)!.itemIds : [], plaid_category: c.category, pending: c.pending, source: c.source };
  });
  if (rows.length) {
    const { data } = await admin.from('transactions').upsert(rows, { onConflict: 'external_id', ignoreDuplicates: true }).select('id,merchant,amount_cents,match_status,is_clothing');
    out.added += data?.length ?? 0;
    // Notification kind 1 of 3: a new clothing charge with no receipt email (only fresh ones, never the backfill).
    for (const t of ((data ?? []) as Array<{ id: string; merchant: string; amount_cents: number; match_status: string; is_clothing: boolean }>).filter((t) => t.is_clothing && t.match_status === 'unmatched').slice(0, 3)) {
      await sendPush(admin, userId, { title: `New clothing charge · $${(t.amount_cents / 100).toFixed(2)}`, body: `${t.merchant} — no receipt email. Snap the receipt?`, url: `/capture/${t.id}`, tag: `charge-${t.id}` }).catch(() => 0);
    }
  }
}
