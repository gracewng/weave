/** Card charge ↔ email order matcher. Pure. Tests are Devin's (task 4). */

export interface TxLike { merchant: string; amountCents: number; date: string }
export interface OrderLike { id: string; retailer: string; totalCents: number; date: string }

const STOP = /\b(inc|llc|ltd|co|corp|store|stores|usa|us|com|the|online|retail|sq|tst|pos|purchase|www)\b/g;
export function normalizeMerchant(s: string): string {
  return s.toLowerCase().replace(/\*|#|\d{3,}/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(STOP, ' ').replace(/\s+/g, ' ').trim();
}

/** Retailer name fuzzy match: normalized containment either way, or first-token equality. */
export function merchantMatches(merchant: string, retailer: string): boolean {
  const m = normalizeMerchant(merchant), r = normalizeMerchant(retailer);
  if (!m || !r) return false;
  if (m.includes(r) || r.includes(m)) return true;
  const mt = m.split(' ')[0], rt = r.split(' ')[0];
  return !!mt && mt.length >= 4 && mt === rt;
}

export function daysApart(a: string, b: string): number {
  return Math.abs(Math.round((new Date(a + 'T00:00:00Z').getTime() - new Date(b + 'T00:00:00Z').getTime()) / 86400000));
}

/**
 * A transaction matches an email order if the retailer names fuzzy-match AND |amount diff| ≤ 10% AND the dates are
 * within ±4 days. Best match = smallest amount difference, then closest date. Score 0..1.
 */
export function matchTransaction(tx: TxLike, orders: OrderLike[]): { orderId: string; score: number } | null {
  let best: { orderId: string; score: number } | null = null;
  for (const o of orders) {
    if (!merchantMatches(tx.merchant, o.retailer)) continue;
    const base = Math.max(1, Math.max(tx.amountCents, o.totalCents));
    const diff = Math.abs(tx.amountCents - o.totalCents) / base;
    if (diff > 0.1) continue;
    const dd = daysApart(tx.date, o.date);
    if (dd > 4) continue;
    const score = 1 - diff * 5 - dd * 0.05;   // 1.0 exact same day; 0.5 at 10% off; -0.2 per 4 days
    if (!best || score > best.score) best = { orderId: o.id, score: Math.max(0, Math.min(1, score)) };
  }
  return best;
}
