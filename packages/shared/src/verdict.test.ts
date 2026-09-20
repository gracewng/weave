import { describe, expect, it } from 'vitest';
import type { VerdictInputs } from './contracts';
import { THRESHOLDS, decideVerdict, verdictReason } from './verdict';

const base: VerdictInputs = {
  topOwnedSimilarity: null,
  
  topFriendSimilarity: null,
  friendItemLendable: false,
  oneTimeNeedSignal: false,
  priceCents: 10_000,
  cheapestUsedCents: null,
  budgetRemainingCents: null,
  forOther: false,
};
const v = (over: Partial<VerdictInputs>): VerdictInputs => ({ ...base, ...over });

const owned = { topOwnedSimilarity: THRESHOLDS.skipSimilarity };
const borrowable = {
  topFriendSimilarity: THRESHOLDS.borrowSimilarity,
  friendItemLendable: true,
  oneTimeNeedSignal: true,
};

describe('decideVerdict — the five rules in order', () => {
  const cases: Array<[string, Partial<VerdictInputs>, string]> = [
    ['owned match at threshold', owned, 'skip'],
    ['friend item, lendable, one-time need', borrowable, 'borrow'],
    ['used is 40% cheaper', { cheapestUsedCents: 6_000 }, 'secondhand'],
    ['price over what is left', { budgetRemainingCents: 9_999 }, 'wait'],
    ['nothing fired', {}, 'buy'],
  ];
  it.each(cases)('%s → %s', (_name, over, expected) => {
    expect(decideVerdict(v(over))).toBe(expected);
  });

  it('prefers the earlier rule when several would fire', () => {
    const everything = { ...owned, ...borrowable, cheapestUsedCents: 1, budgetRemainingCents: 0 };
    expect(decideVerdict(v(everything))).toBe('skip');
    expect(decideVerdict(v({ ...everything, topOwnedSimilarity: null }))).toBe('borrow');
    expect(decideVerdict(v({ ...everything, topOwnedSimilarity: null, friendItemLendable: false }))).toBe('secondhand');
    expect(
      decideVerdict(v({ ...everything, topOwnedSimilarity: null, friendItemLendable: false, cheapestUsedCents: null })),
    ).toBe('wait');
  });
});

describe('decideVerdict — boundaries', () => {
  it('skip fires at exactly the similarity threshold, not just below', () => {
    expect(decideVerdict(v({ topOwnedSimilarity: THRESHOLDS.skipSimilarity }))).toBe('skip');
    expect(decideVerdict(v({ topOwnedSimilarity: THRESHOLDS.skipSimilarity - 0.001 }))).toBe('buy');
  });

  it('borrow needs similarity AND lendable AND a one-time need', () => {
    expect(decideVerdict(v(borrowable))).toBe('borrow');
    expect(decideVerdict(v({ ...borrowable, friendItemLendable: false }))).toBe('buy');
    expect(decideVerdict(v({ ...borrowable, oneTimeNeedSignal: false }))).toBe('buy');
    expect(decideVerdict(v({ ...borrowable, topFriendSimilarity: THRESHOLDS.borrowSimilarity - 0.001 }))).toBe('buy');
  });

  it('secondhand needs the used price at or under the discount line', () => {
    const cutoff = Math.round(10_000 * (1 - THRESHOLDS.secondhandDiscount));
    expect(decideVerdict(v({ cheapestUsedCents: cutoff }))).toBe('secondhand');
    expect(decideVerdict(v({ cheapestUsedCents: cutoff + 1 }))).toBe('buy');
  });

  it('a used listing cannot fire the rule on an unpriced search', () => {
    expect(decideVerdict(v({ priceCents: 0, cheapestUsedCents: 100 }))).toBe('buy');
  });

  it('price exactly equal to what is left is not over budget', () => {
    expect(decideVerdict(v({ priceCents: 10_000, budgetRemainingCents: 10_000 }))).toBe('buy');
    expect(decideVerdict(v({ priceCents: 10_001, budgetRemainingCents: 10_000 }))).toBe('wait');
  });

  it('a spent envelope sends every unmatched search to wait', () => {
    expect(decideVerdict(v({ budgetRemainingCents: 0 }))).toBe('wait');
    expect(decideVerdict(v({ budgetRemainingCents: null }))).toBe('buy');
  });
});

describe('decideVerdict — shopping for someone else', () => {
  it('cannot skip or borrow off the user\'s own closet', () => {
    expect(decideVerdict(v({ ...owned, forOther: true }))).toBe('buy');
    expect(decideVerdict(v({ ...borrowable, forOther: true }))).toBe('buy');
  });

  it('still routes to secondhand and wait', () => {
    expect(decideVerdict(v({ ...owned, forOther: true, cheapestUsedCents: 4_000 }))).toBe('secondhand');
    expect(decideVerdict(v({ ...owned, forOther: true, budgetRemainingCents: 500 }))).toBe('wait');
  });
});

describe('verdictReason', () => {
  it('quotes the number that fired the rule', () => {
    expect(verdictReason('skip', v({ topOwnedSimilarity: 0.72 }))).toContain('72%');
    expect(verdictReason('secondhand', v({ priceCents: 10_000, cheapestUsedCents: 4_000 }))).toContain('60%');
  });

  it('never endorses a purchase on buy', () => {
    const reason = verdictReason('buy', v({}));
    expect(reason).toContain('not required');
    expect(verdictReason('buy', v({ forOther: true }))).toContain('someone else');
  });

  it('returns a non-empty line for every verdict', () => {
    for (const verdict of ['skip', 'borrow', 'secondhand', 'wait', 'buy'] as const) {
      expect(verdictReason(verdict, v({})).length, verdict).toBeGreaterThan(0);
    }
  });
});
