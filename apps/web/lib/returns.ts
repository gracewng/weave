import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Item } from '@weave/shared/types';
import { retailerData } from '@weave/data';

export interface ReturnRow { item: Item; daysLeft: number; policyDays: number | null; atStakeCents: number }

export function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T00:00:00Z`).getTime();
  const to = new Date(`${toISO}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((to - from) / 86400000));
}

export function policyDaysFor(retailer: string | null): number | null {
  if (!retailer) return null;
  const r = retailer.toLowerCase();
  const m = retailerData.retailers.find((x) => x.name.toLowerCase() === r || x.id === r);
  return m ? retailerData.returnWindowFor(m.id) : null;
}

/** Open windows (owned, return_by ≥ today), soonest first; plus pending returns and confirmed refunds. */
export async function returnBoard(supabase: SupabaseClient, userId: string, today = new Date().toISOString().slice(0, 10)) {
  const { data: items } = await supabase.from('items').select('*').eq('user_id', userId).in('status', ['owned', 'returning', 'returned']);
  const all = (items ?? []) as Item[];
  const open: ReturnRow[] = all.filter((i) => i.status === 'owned' && i.return_by && i.return_by >= today)
    .map((i) => ({ item: i, daysLeft: daysBetween(today, i.return_by!), policyDays: policyDaysFor(i.retailer), atStakeCents: i.price_cents ?? 0 }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const pending = all.filter((i) => i.status === 'returning').sort((a, b) => (b.return_initiated_at ?? '').localeCompare(a.return_initiated_at ?? ''));
  const recovered = all.filter((i) => i.status === 'returned').sort((a, b) => (b.refunded_at ?? '').localeCompare(a.refunded_at ?? ''));
  return { open, pending, recovered };
}
