/** Wear math. Pure. "Getting your money's worth" framing: use is the only lever. Tests are Devin's (task 4). */

export const THIRTY = 30;

/** Cents per wear, or null when there are no wears ("No wears logged" — never "wasted"). */
export function costPerWear(priceCents: number | null | undefined, wears: number): number | null {
  if (priceCents == null || wears <= 0) return null;
  return Math.round(priceCents / wears);
}

/** Wears still needed to reach the #30wears mark (0 when already there). */
export function wearsToThirty(wears: number): number {
  return Math.max(0, THIRTY - Math.max(0, wears));
}

/** Cost per wear if the item reaches 30 wears — the reuse scenario on the Autopsy. */
export function costPerWearAtThirty(priceCents: number | null | undefined): number | null {
  if (priceCents == null) return null;
  return Math.round(priceCents / THIRTY);
}

export interface WearRow { item_id: string; worn_on: string }

/** Map item_id → { count, last } from raw wear rows. */
export function summarizeWears(rows: WearRow[]): Map<string, { count: number; last: string | null }> {
  const m = new Map<string, { count: number; last: string | null }>();
  for (const r of rows) {
    const e = m.get(r.item_id) ?? { count: 0, last: null };
    e.count++;
    if (!e.last || r.worn_on > e.last) e.last = r.worn_on;
    m.set(r.item_id, e);
  }
  return m;
}

/** Share (0..1) of items worn at least once since `sinceDate` (YYYY-MM-DD). 0 when there are no items. */
export function wornShare(itemIds: string[], rows: WearRow[], sinceDate: string): number {
  if (itemIds.length === 0) return 0;
  const worn = new Set(rows.filter((r) => r.worn_on >= sinceDate).map((r) => r.item_id));
  return itemIds.filter((id) => worn.has(id)).length / itemIds.length;
}

/** Items with no wear in the last `days` days (or never worn), oldest-last-wear first. */
export function dormant<T extends { id: string; purchase_date?: string | null }>(items: T[], rows: WearRow[], days: number, today = new Date()): T[] {
  const cutoff = new Date(today); cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const cut = cutoff.toISOString().slice(0, 10);
  const s = summarizeWears(rows);
  return items
    .filter((i) => { const w = s.get(i.id); return !w?.last || w.last < cut; })
    .sort((a, b) => (s.get(a.id)?.last ?? a.purchase_date ?? '').localeCompare(s.get(b.id)?.last ?? b.purchase_date ?? ''));
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + 'T00:00:00Z').getTime(); const b = new Date(toISO + 'T00:00:00Z').getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}
