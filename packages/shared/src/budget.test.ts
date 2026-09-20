import { describe, expect, it } from 'vitest';
import type { BudgetInputs } from './contracts';
import { priceMemory, summarizeBudget } from './budget';

const base: BudgetInputs = {
  monthlyIncomeCents: 420_000,
  clothingPct: 5,
  envelopeOverrideCents: null,
  spentThisMonthCents: 0,
  dayOfMonth: 15,
  daysInMonth: 30,
};
const b = (over: Partial<BudgetInputs>) => summarizeBudget({ ...base, ...over });

describe('summarizeBudget — envelope', () => {
  it('is income × pct, rounded', () => {
    expect(b({}).envelopeCents).toBe(21_000);
    expect(b({ monthlyIncomeCents: 333_333, clothingPct: 5 }).envelopeCents).toBe(16_667);
  });

  it('prefers an explicit override over income × pct', () => {
    expect(b({ envelopeOverrideCents: 30_000 }).envelopeCents).toBe(30_000);
    expect(b({ monthlyIncomeCents: null, envelopeOverrideCents: 30_000 }).envelopeCents).toBe(30_000);
  });

  it('has no envelope, remaining or ratio without income', () => {
    const s = b({ monthlyIncomeCents: null, spentThisMonthCents: 5_000 });
    expect(s.envelopeCents).toBeNull();
    expect(s.remainingCents).toBeNull();
    expect(s.remainingRatio).toBeNull();
    expect(s.overBy).toBe(0);
    expect(s.spentCents).toBe(5_000);
  });
});

describe('summarizeBudget — remaining, ratio and overspend', () => {
  it('reports remaining and the clamped ratio', () => {
    const s = b({ spentThisMonthCents: 10_500 });
    expect(s.remainingCents).toBe(10_500);
    expect(s.remainingRatio).toBe(0.5);
  });

  it('clamps the ratio to 0 and reports overBy once past the envelope', () => {
    const s = b({ spentThisMonthCents: 25_000 });
    expect(s.remainingCents).toBe(-4_000);
    expect(s.remainingRatio).toBe(0);
    expect(s.overBy).toBe(4_000);
  });

  it('is not over at exactly the envelope', () => {
    const s = b({ spentThisMonthCents: 21_000 });
    expect(s.remainingCents).toBe(0);
    expect(s.remainingRatio).toBe(0);
    expect(s.overBy).toBe(0);
  });

  it('treats negative spend (a refund-heavy month) as zero', () => {
    expect(b({ spentThisMonthCents: -5_000 }).spentCents).toBe(0);
  });
});

describe('summarizeBudget — projection', () => {
  it('extrapolates the pace so far to month end', () => {
    expect(b({ spentThisMonthCents: 10_000, dayOfMonth: 10, daysInMonth: 30 }).projectedCents).toBe(30_000);
  });

  it('on day 1 projects the whole month from one day of spend', () => {
    expect(b({ spentThisMonthCents: 4_000, dayOfMonth: 1, daysInMonth: 31 }).projectedCents).toBe(124_000);
  });

  it('on the last day equals actual spend', () => {
    const s = b({ spentThisMonthCents: 17_350, dayOfMonth: 30, daysInMonth: 30 });
    expect(s.projectedCents).toBe(17_350);
  });

  it('never projects a shorter month than the day already reached', () => {
    expect(b({ spentThisMonthCents: 3_100, dayOfMonth: 31, daysInMonth: 30 }).projectedCents).toBe(3_100);
  });

  it('treats day 0 as day 1 instead of dividing by zero', () => {
    const s = b({ spentThisMonthCents: 1_000, dayOfMonth: 0, daysInMonth: 30 });
    expect(Number.isFinite(s.projectedCents)).toBe(true);
    expect(s.projectedCents).toBe(30_000);
  });

  it('projects zero for a month with no spend yet', () => {
    expect(b({ spentThisMonthCents: 0, dayOfMonth: 3 }).projectedCents).toBe(0);
  });
});

describe('priceMemory', () => {
  const items = [
    { category: 'tee', brand: 'Uniqlo', price_cents: 1_990 },
    { category: 'tee', brand: 'Uniqlo', price_cents: 2_490 },
    { category: 'tee', brand: 'Uniqlo', price_cents: 2_990 },
    { category: 'tee', brand: 'Everlane', price_cents: 4_500 },
    { category: 'tee', brand: 'Madewell', price_cents: 3_500 },
    { category: 'jeans', brand: "Levi's", price_cents: 9_800 },
  ];

  it('returns the category median with its sample size', () => {
    expect(priceMemory(items, 'tee')).toEqual({ medianCents: 2_990, n: 5, scope: 'category' });
  });

  it('averages the two middle values on an even sample', () => {
    expect(priceMemory(items.slice(0, 4), 'tee')).toEqual({ medianCents: 2_740, n: 4, scope: 'category' });
  });

  it('uses the brand median only at 3+ samples, else falls back to category', () => {
    expect(priceMemory(items, 'tee', 'Uniqlo')).toEqual({ medianCents: 2_490, n: 3, scope: 'brand' });
    expect(priceMemory(items, 'tee', 'Everlane')).toEqual({ medianCents: 2_990, n: 5, scope: 'category' });
  });

  it('matches the brand case-insensitively', () => {
    expect(priceMemory(items, 'tee', 'UNIQLO')?.scope).toBe('brand');
  });

  it('excludes unknown and zero prices from the median', () => {
    const withGaps = [...items, { category: 'tee', brand: null, price_cents: null }, { category: 'tee', brand: null, price_cents: 0 }];
    expect(priceMemory(withGaps, 'tee')).toEqual({ medianCents: 2_990, n: 5, scope: 'category' });
  });

  it('returns null rather than inventing an anchor', () => {
    expect(priceMemory(items, 'coat')).toBeNull();
    expect(priceMemory(items, null)).toBeNull();
    expect(priceMemory([], 'tee')).toBeNull();
  });
});
