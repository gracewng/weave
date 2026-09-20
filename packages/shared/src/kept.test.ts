import { describe, expect, it } from 'vitest';
import type { HoldOutcome, KeptInputs } from './contracts';
import { keptForHold, summarizeKept } from './kept';

type Hold = KeptInputs['holds'][number];
const CONFIRMED = '2026-09-18T12:00:00Z';

let n = 0;
function hold(status: HoldOutcome, over: Partial<Hold> = {}): Hold {
  return {
    id: `h${++n}`,
    status,
    priceCents: 10_000,
    actualPaidCents: null,
    outcomeConfirmedAt: status === 'held' || status === 'released' ? null : CONFIRMED,
    ...over,
  };
}
const sum = (holds: Hold[], returns: KeptInputs['returns'] = []) => summarizeKept({ holds, returns });

describe('keptForHold', () => {
  const cases: Array<[HoldOutcome, number | null, number | null, number]> = [
    ['skipped', 10_000, null, 10_000],
    ['borrowed', 16_800, 0, 16_800],
    ['borrowed', 16_800, 1_500, 15_300],
    ['bought_used', 9_800, 3_700, 6_100],
    ['bought', 9_800, 9_800, 0],
    ['released', 9_800, null, 0],
    ['held', 9_800, null, 0],
  ];
  it.each(cases)('%s intended %s paid %s → %s kept', (status, priceCents, actualPaidCents, expected) => {
    expect(keptForHold({ status, priceCents, actualPaidCents })).toBe(expected);
  });

  it('floors at zero when the alternative cost more', () => {
    expect(keptForHold({ status: 'bought_used', priceCents: 4_000, actualPaidCents: 6_500 })).toBe(0);
  });

  it('is zero dollars for an unknown intended price', () => {
    expect(keptForHold({ status: 'skipped', priceCents: null, actualPaidCents: null })).toBe(0);
  });
});

describe('summarizeKept — confirmed outcomes only', () => {
  it('splits kept by outcome and counts the actions', () => {
    const s = sum([
      hold('skipped', { priceCents: 4_500 }),
      hold('borrowed', { priceCents: 16_800, actualPaidCents: 0 }),
      hold('bought_used', { priceCents: 9_800, actualPaidCents: 3_700 }),
    ]);
    expect(s.byOutcome).toEqual({ skipped: 4_500, borrowed: 16_800, boughtUsed: 6_100 });
    expect(s.keptCents).toBe(27_400);
    expect(s.actionsCount).toBe(3);
    expect(s.potentialKeptCents).toBe(0);
  });

  it('keeps a pending hold out of kept and in potential', () => {
    const s = sum([hold('held', { priceCents: 14_800 })]);
    expect(s.keptCents).toBe(0);
    expect(s.potentialKeptCents).toBe(14_800);
    expect(s.actionsCount).toBe(0);
  });

  it('ignores an outcome that was never confirmed', () => {
    const s = sum([hold('skipped', { priceCents: 4_500, outcomeConfirmedAt: null })]);
    expect(s.keptCents).toBe(0);
    expect(s.potentialKeptCents).toBe(0);
    expect(s.actionsCount).toBe(0);
  });

  it('credits a held → borrowed intention once, not twice', () => {
    const intention = hold('held', { id: 'same', priceCents: 16_800 });
    expect(sum([intention]).potentialKeptCents).toBe(16_800);
    const resolved: Hold = { ...intention, status: 'borrowed', actualPaidCents: 0, outcomeConfirmedAt: CONFIRMED };
    const after = sum([resolved]);
    expect(after.keptCents).toBe(16_800);
    expect(after.potentialKeptCents).toBe(0);
    expect(after.actionsCount).toBe(1);
  });

  it('reverses the credit when the same intention is bought after all', () => {
    const bought = sum([hold('bought', { priceCents: 16_800, actualPaidCents: 16_800 })]);
    expect(bought.keptCents).toBe(0);
    expect(bought.byOutcome).toEqual({ skipped: 0, borrowed: 0, boughtUsed: 0 });
    expect(bought.actionsCount).toBe(1);
  });

  it('counts a released (expired, unanswered) hold as nothing at all', () => {
    const s = sum([hold('released', { priceCents: 9_900 })]);
    expect(s).toMatchObject({ keptCents: 0, potentialKeptCents: 0, actionsCount: 0 });
  });

  it('counts an unpriced action without inventing dollars', () => {
    const s = sum([hold('skipped', { priceCents: null }), hold('skipped', { priceCents: 4_500 })]);
    expect(s.keptCents).toBe(4_500);
    expect(s.actionsCount).toBe(2);
    expect(s.unpricedActions).toBe(1);
  });

  it('is all zeros with no holds', () => {
    expect(sum([])).toEqual({
      keptCents: 0,
      potentialKeptCents: 0,
      byOutcome: { skipped: 0, borrowed: 0, boughtUsed: 0 },
      actionsCount: 0,
      unpricedActions: 0,
      recoveredCents: 0,
      pendingRecoveryCount: 0,
    });
  });
});

describe('summarizeKept — Money Recovered is separate', () => {
  it('counts only confirmed refunds, and keeps them out of Money Kept', () => {
    const s = sum(
      [hold('skipped', { priceCents: 4_500 })],
      [
        { itemId: 'i1', status: 'returned', refundCents: 7_900 },
        { itemId: 'i2', status: 'returned', refundCents: 3_100 },
      ],
    );
    expect(s.recoveredCents).toBe(11_000);
    expect(s.keptCents).toBe(4_500);
    expect(s.pendingRecoveryCount).toBe(0);
  });

  it('treats an initiated return and a returned-but-unpaid refund as pending', () => {
    const s = sum([], [
      { itemId: 'i1', status: 'returning', refundCents: null },
      { itemId: 'i2', status: 'returned', refundCents: null },
      { itemId: 'i3', status: 'owned', refundCents: null },
    ]);
    expect(s.recoveredCents).toBe(0);
    expect(s.pendingRecoveryCount).toBe(2);
  });

  it('counts a zero refund as confirmed, not pending', () => {
    const s = sum([], [{ itemId: 'i1', status: 'returned', refundCents: 0 }]);
    expect(s.recoveredCents).toBe(0);
    expect(s.pendingRecoveryCount).toBe(0);
  });
});
