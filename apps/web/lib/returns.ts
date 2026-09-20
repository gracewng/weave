import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Item } from '@weave/shared/types';
import { daysBetween, summarizeWears, type WearRow } from '@weave/shared/wears';
import { FALLBACK_RETAILERS } from '@/lib/ingest/retailers-fallback';
import { retailerData } from '@weave/data';

export interface ReturnRow { item: Item; daysLeft: number; wears: number; policyDays: number | null; atStakeCents: number }

export function policyDaysFor(retailer: string | null): number | null {
  if (!retailer) return null;
  const r = retailer.toLowerCase();
  if (retailerData.retailers.length) { const m = retailerData.retailers.find((x) => x.name.toLowerCase() === r); return m ? retailerData.returnWindowFor(m.id) : null; }
  return FALLBACK_RETAILERS.find((x) => x.name.toLowerCase() === r)?.returnDays ?? null;
}

/** Open windows (owned, return_by ≥ today), soonest first; plus pending returns and confirmed refunds. */
export async function returnBoard(supabase: SupabaseClient, userId: string, today = new Date().toISOString().slice(0, 10)) {
  const [{ data: items }, { data: wears }] = await Promise.all([
    supabase.from('items').select('*').eq('user_id', userId).in('status', ['owned', 'returning', 'returned']),
    supabase.from('wears').select('item_id,worn_on'),
  ]);
  const all = (items ?? []) as Item[];
  const w = summarizeWears((wears ?? []) as WearRow[]);
  const open: ReturnRow[] = all.filter((i) => i.status === 'owned' && i.return_by && i.return_by >= today)
    .map((i) => ({ item: i, daysLeft: daysBetween(today, i.return_by!), wears: w.get(i.id)?.count ?? 0, policyDays: policyDaysFor(i.retailer), atStakeCents: i.price_cents ?? 0 }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const pending = all.filter((i) => i.status === 'returning').sort((a, b) => (b.return_initiated_at ?? '').localeCompare(a.return_initiated_at ?? ''));
  const recovered = all.filter((i) => i.status === 'returned').sort((a, b) => (b.refunded_at ?? '').localeCompare(a.refunded_at ?? ''));
  const closedUnworn = all.filter((i) => i.status === 'owned' && i.return_by && i.return_by < today && !(w.get(i.id)?.count)).length;
  return { open, pending, recovered, closedUnworn };
}
