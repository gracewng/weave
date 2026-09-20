/** Closet Coverage = resolved / detected clothing-purchase records in a period. Pure. Tests are Devin's. */
import type { CoverageInputs, CoverageSummary } from './contracts';

export function summarizeCoverage(i: CoverageInputs): CoverageSummary {
  const inPeriod = (d: string) => d >= i.periodStart && d <= i.periodEnd;
  const tx = i.transactions.filter((t) => inPeriod(t.date) && t.isClothing !== false && t.decision !== 'not_clothes');
  const emails = i.emailOrders.filter((e) => inPeriod(e.date));
  const resolvedTx = tx.filter((t) => t.matchStatus === 'matched' || t.matchStatus === 'captured' || t.decision === 'returning' || t.decision === 'gift');
  const unresolved = tx.filter((t) => !resolvedTx.includes(t));
  const detected = tx.length + emails.length;
  const resolved = resolvedTx.length + emails.length;
  return {
    detected, resolved,
    ratio: detected === 0 ? null : resolved / detected,
    unresolved: unresolved.length,
    missingReceipts: unresolved.filter((t) => !t.hasReceipt).length,
    confirmedItems: 0,
  };
}
