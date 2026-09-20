/** Budget math + purchase memory. Pure. Tests are Devin's (task 4). */
import type { BudgetInputs, BudgetSummary } from './contracts';

export function summarizeBudget(i: BudgetInputs): BudgetSummary {
  const envelope = i.envelopeOverrideCents ?? (i.monthlyIncomeCents != null ? Math.round(i.monthlyIncomeCents * (i.clothingPct / 100)) : null);
  const spent = Math.max(0, i.spentThisMonthCents);
  const day = Math.max(1, i.dayOfMonth); const days = Math.max(day, i.daysInMonth);
  const projected = Math.round((spent / day) * days);
  const remaining = envelope != null ? envelope - spent : null;
  return {
    envelopeCents: envelope, spentCents: spent, remainingCents: remaining, projectedCents: projected,
    remainingRatio: envelope ? Math.min(1, Math.max(0, (remaining ?? 0) / envelope)) : null,
    overBy: envelope != null && spent > envelope ? spent - envelope : 0,
  };
}

function median(xs: number[]): number { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2); }

/**
 * Your own price memory: median paid by category; by brand only with ≥ 3 samples. Unknown prices excluded.
 * Never a target — a plain anchor with its sample size.
 */
export function priceMemory(
  items: Array<{ category: string | null; brand: string | null; price_cents: number | null }>,
  category: string | null, brand?: string | null,
): { medianCents: number; n: number; scope: 'brand' | 'category' } | null {
  const priced = items.filter((i) => i.price_cents != null && i.price_cents > 0) as Array<{ category: string | null; brand: string | null; price_cents: number }>;
  if (brand) {
    const b = priced.filter((i) => i.brand?.toLowerCase() === brand.toLowerCase() && (!category || i.category === category));
    if (b.length >= 3) return { medianCents: median(b.map((i) => i.price_cents)), n: b.length, scope: 'brand' };
  }
  if (!category) return null;
  const c = priced.filter((i) => i.category === category);
  if (c.length === 0) return null;
  return { medianCents: median(c.map((i) => i.price_cents)), n: c.length, scope: 'category' };
}
