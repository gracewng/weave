/** Deterministic search verdict. The LLM never changes this; it only writes the one-line note. Tests are Devin's. */
import type { Verdict, VerdictInputs } from './contracts';

/**
 * Calibrated for text-embedding-3-small on "<color> <material> <garment>, <formality>, <brand>" descriptions:
 * a near-exact owned match scores ~0.65, a same-category match ~0.45. (The spec's 0.88/0.85 assumed a different scale.)
 */
export const THRESHOLDS = { skipSimilarity: 0.6, borrowSimilarity: 0.55, secondhandDiscount: 0.4 } as const;

export function decideVerdict(i: VerdictInputs): Verdict {
  if (!i.forOther) {
    if (i.topOwnedSimilarity != null && i.topOwnedSimilarity >= THRESHOLDS.skipSimilarity) return 'skip';
    if (i.topFriendSimilarity != null && i.topFriendSimilarity >= THRESHOLDS.borrowSimilarity && i.friendItemLendable && i.oneTimeNeedSignal) return 'borrow';
  }
  if (i.cheapestUsedCents != null && i.priceCents > 0 && i.cheapestUsedCents <= i.priceCents * (1 - THRESHOLDS.secondhandDiscount)) return 'secondhand';
  if (i.budgetRemainingCents != null && i.priceCents > i.budgetRemainingCents) return 'wait';
  return 'buy';
}

/** Which rule fired, for the "why" line under the verdict. */
export function verdictReason(v: Verdict, i: VerdictInputs): string {
  switch (v) {
    case 'skip': return `You already own something ${Math.round((i.topOwnedSimilarity ?? 0) * 100)}% like this`;
    case 'borrow': return 'A friend has one you can borrow for this';
    case 'secondhand': return `A used one is ${Math.round((1 - (i.cheapestUsedCents ?? 0) / Math.max(1, i.priceCents)) * 100)}% cheaper`;
    case 'wait': return 'Over what is left in this month\'s envelope';
    case 'buy': return i.forOther ? 'For someone else — nothing in your wardrobe or your friends\' applies' : 'No earlier rule fired. Buying is allowed, not required';
  }
}
