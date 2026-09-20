/** Money Kept / Money Recovered accounting. Pure. Confirmed outcomes only. Tests are Devin's (task 4). */
import type { KeptInputs, KeptSummary } from './contracts';

/** Kept for one confirmed hold outcome, per the table in CLAUDE.md. null price → 0 dollars (still counts as an action). */
export function keptForHold(h: { status: string; priceCents: number | null; actualPaidCents: number | null }): number {
  if (h.priceCents == null) return 0;
  const paid = h.actualPaidCents ?? 0;
  switch (h.status) {
    case 'skipped': return h.priceCents;
    case 'borrowed':
    case 'bought_used': return Math.max(0, h.priceCents - paid);
    default: return 0;   // bought, released, held
  }
}

export function summarizeKept(i: KeptInputs): KeptSummary {
  const out: KeptSummary = { keptCents: 0, potentialKeptCents: 0, byOutcome: { skipped: 0, borrowed: 0, boughtUsed: 0 }, actionsCount: 0, unpricedActions: 0, recoveredCents: 0, pendingRecoveryCount: 0 };
  for (const h of i.holds) {
    const confirmed = !!h.outcomeConfirmedAt && h.status !== 'held' && h.status !== 'released';
    if (!confirmed) { if (h.status === 'held' && h.priceCents != null) out.potentialKeptCents += h.priceCents; continue; }
    if (h.status === 'bought') { out.actionsCount++; continue; }   // reversal: contributes 0
    out.actionsCount++;
    if (h.priceCents == null) { out.unpricedActions++; continue; }
    const k = keptForHold(h);
    out.keptCents += k;
    if (h.status === 'skipped') out.byOutcome.skipped += k;
    else if (h.status === 'borrowed') out.byOutcome.borrowed += k;
    else if (h.status === 'bought_used') out.byOutcome.boughtUsed += k;
  }
  for (const r of i.returns) {
    if (r.status === 'returned' && r.refundCents != null) out.recoveredCents += r.refundCents;
    else if (r.status === 'returning' || (r.status === 'returned' && r.refundCents == null)) out.pendingRecoveryCount++;
  }
  return out;
}
