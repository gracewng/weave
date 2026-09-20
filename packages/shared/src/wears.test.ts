import { describe, expect, it } from 'vitest';
import {
  THIRTY,
  costPerWear,
  costPerWearAtThirty,
  daysBetween,
  dormant,
  summarizeWears,
  wearsToThirty,
  wornShare,
  type WearRow,
} from './wears';

describe('costPerWear', () => {
  it('is price ÷ wears, rounded to cents', () => {
    expect(costPerWear(12_000, 2)).toBe(6_000);
    expect(costPerWear(10_000, 3)).toBe(3_333);
  });

  it('is null at zero wears — "No wears logged", never a waste figure', () => {
    expect(costPerWear(12_000, 0)).toBeNull();
    expect(costPerWear(12_000, -1)).toBeNull();
  });

  it('is null when the price is unknown', () => {
    expect(costPerWear(null, 5)).toBeNull();
    expect(costPerWear(undefined, 5)).toBeNull();
  });
});

describe('the #30wears ring', () => {
  it('counts down to 30 and stops at 0', () => {
    expect(wearsToThirty(0)).toBe(THIRTY);
    expect(wearsToThirty(12)).toBe(18);
    expect(wearsToThirty(30)).toBe(0);
    expect(wearsToThirty(44)).toBe(0);
    expect(wearsToThirty(-3)).toBe(THIRTY);
  });

  it('shows the reuse scenario: $120 at 30 wears = $4 per wear', () => {
    expect(costPerWearAtThirty(12_000)).toBe(400);
    expect(costPerWearAtThirty(null)).toBeNull();
  });
});

describe('summarizeWears', () => {
  const rows: WearRow[] = [
    { item_id: 'a', worn_on: '2026-03-02' },
    { item_id: 'a', worn_on: '2026-09-11' },
    { item_id: 'a', worn_on: '2026-06-20' },
    { item_id: 'b', worn_on: '2026-09-01' },
  ];

  it('counts wears and keeps the latest date regardless of row order', () => {
    const s = summarizeWears(rows);
    expect(s.get('a')).toEqual({ count: 3, last: '2026-09-11' });
    expect(s.get('b')).toEqual({ count: 1, last: '2026-09-01' });
    expect(s.get('never')).toBeUndefined();
  });

  it('is empty for no rows', () => {
    expect(summarizeWears([]).size).toBe(0);
  });
});

describe('wornShare', () => {
  const items = ['a', 'b', 'c', 'd'];
  const rows: WearRow[] = [
    { item_id: 'a', worn_on: '2026-09-01' },
    { item_id: 'a', worn_on: '2026-09-05' },
    { item_id: 'b', worn_on: '2026-06-01' },
    { item_id: 'c', worn_on: '2026-07-01' },
  ];

  it('is the share of items worn at least once since the date, counting each item once', () => {
    expect(wornShare(items, rows, '2026-06-30')).toBe(0.5);
  });

  it('includes a wear exactly on the boundary date', () => {
    expect(wornShare(items, rows, '2026-07-01')).toBe(0.5);
    expect(wornShare(items, rows, '2026-07-02')).toBe(0.25);
  });

  it('ignores wears of items outside the set', () => {
    expect(wornShare(['a'], [...rows, { item_id: 'zz', worn_on: '2026-09-09' }], '2026-01-01')).toBe(1);
  });

  it('is 0 for an empty closet rather than dividing by zero', () => {
    expect(wornShare([], rows, '2026-01-01')).toBe(0);
  });
});

describe('dormant', () => {
  const today = new Date('2026-09-20T00:00:00Z');
  const items = [
    { id: 'recent', purchase_date: '2025-01-01' },
    { id: 'stale', purchase_date: '2024-05-01' },
    { id: 'never', purchase_date: '2024-02-01' },
  ];
  const rows: WearRow[] = [
    { item_id: 'recent', worn_on: '2026-09-10' },
    { item_id: 'stale', worn_on: '2026-01-15' },
  ];

  it('returns items unworn in the window, never-worn ones included', () => {
    expect(dormant(items, rows, 90, today).map((i) => i.id)).toEqual(['never', 'stale']);
  });

  it('sorts by last wear, oldest first, falling back to purchase date', () => {
    const [first] = dormant(items, rows, 90, today);
    expect(first!.id).toBe('never');
  });

  it('treats a wear exactly on the cutoff (90 days back) as still active', () => {
    const onCutoff: WearRow[] = [{ item_id: 'recent', worn_on: '2026-06-22' }];
    expect(dormant([items[0]!], onCutoff, 90, today)).toEqual([]);
    const dayBefore: WearRow[] = [{ item_id: 'recent', worn_on: '2026-06-21' }];
    expect(dormant([items[0]!], dayBefore, 90, today).map((i) => i.id)).toEqual(['recent']);
  });

  it('is empty when everything was worn recently', () => {
    expect(dormant([items[0]!], rows, 90, today)).toEqual([]);
  });
});

describe('daysBetween', () => {
  it('counts forward days and floors at 0 for a reversed range', () => {
    expect(daysBetween('2026-09-01', '2026-09-20')).toBe(19);
    expect(daysBetween('2026-09-20', '2026-09-01')).toBe(0);
    expect(daysBetween('2026-09-20', '2026-09-20')).toBe(0);
  });

  it('spans a leap day', () => {
    expect(daysBetween('2028-02-27', '2028-03-01')).toBe(3);
  });
});
