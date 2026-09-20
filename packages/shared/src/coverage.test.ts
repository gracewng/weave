import { describe, expect, it } from 'vitest';
import type { CoverageInputs } from './contracts';
import { summarizeCoverage } from './coverage';

type Tx = CoverageInputs['transactions'][number];
let n = 0;
function tx(over: Partial<Tx> = {}): Tx {
  return {
    id: `t${++n}`,
    date: '2026-09-10',
    isClothing: true,
    matchStatus: 'unmatched',
    decision: null,
    hasReceipt: false,
    ...over,
  };
}
const period = { periodStart: '2026-09-01', periodEnd: '2026-09-30' };
const cover = (transactions: Tx[], emailOrders: CoverageInputs['emailOrders'] = []) =>
  summarizeCoverage({ ...period, transactions, emailOrders });

describe('summarizeCoverage', () => {
  it('counts a matched, captured or returning charge as resolved', () => {
    const s = cover([
      tx({ matchStatus: 'matched' }),
      tx({ matchStatus: 'captured' }),
      tx({ decision: 'returning' }),
      tx({ matchStatus: 'mystery' }),
    ]);
    expect(s).toMatchObject({ detected: 4, resolved: 3, unresolved: 1 });
    expect(s.ratio).toBe(0.75);
  });

  it('always counts email orders as detected and resolved', () => {
    const s = cover([tx({ matchStatus: 'mystery' })], [{ key: 'uniqlo-2026-09-04', date: '2026-09-04' }]);
    expect(s).toMatchObject({ detected: 2, resolved: 1, unresolved: 1 });
    expect(s.ratio).toBe(0.5);
  });

  it('"not clothes" shrinks the denominator instead of counting against you', () => {
    const before = cover([tx({ matchStatus: 'mystery' }), tx({ matchStatus: 'matched' })]);
    expect(before.ratio).toBe(0.5);
    const after = cover([tx({ matchStatus: 'mystery', decision: 'not_clothes' }), tx({ matchStatus: 'matched' })]);
    expect(after).toMatchObject({ detected: 1, resolved: 1, unresolved: 0 });
    expect(after.ratio).toBe(1);
  });

  it('drops charges Plaid flagged as non-clothing, but keeps unknown ones', () => {
    const s = cover([tx({ isClothing: false }), tx({ isClothing: null }), tx({ isClothing: true, matchStatus: 'matched' })]);
    expect(s.detected).toBe(2);
    expect(s.unresolved).toBe(1);
  });

  it('ignores anything outside the period, inclusive of both ends', () => {
    const s = cover([
      tx({ date: '2026-08-31' }),
      tx({ date: '2026-09-01', matchStatus: 'matched' }),
      tx({ date: '2026-09-30', matchStatus: 'matched' }),
      tx({ date: '2026-10-01' }),
    ], [{ key: 'zara-2026-08-20', date: '2026-08-20' }]);
    expect(s).toMatchObject({ detected: 2, resolved: 2 });
  });

  it('counts unresolved charges without a receipt as missing receipts', () => {
    const s = cover([
      tx({ matchStatus: 'mystery', hasReceipt: false }),
      tx({ matchStatus: 'mystery', hasReceipt: true }),
      tx({ matchStatus: 'matched', hasReceipt: false }),
    ]);
    expect(s.unresolved).toBe(2);
    expect(s.missingReceipts).toBe(1);
  });

  it('says "not enough purchase history" (null ratio) instead of 100% at zero records', () => {
    const s = cover([]);
    expect(s.ratio).toBeNull();
    expect(s).toMatchObject({ detected: 0, resolved: 0, unresolved: 0, missingReceipts: 0 });
  });

  it('reproduces the CLAUDE.md example: 40 of 46 resolved = 87%', () => {
    const resolved = Array.from({ length: 40 }, () => tx({ matchStatus: 'matched' }));
    const unresolved = Array.from({ length: 6 }, (_, i) => tx({ matchStatus: 'mystery', hasReceipt: i >= 3 }));
    const s = cover([...resolved, ...unresolved]);
    expect(s).toMatchObject({ detected: 46, resolved: 40, unresolved: 6, missingReceipts: 3 });
    expect(Math.round(s.ratio! * 100)).toBe(87);
  });
});
