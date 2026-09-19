import { EmptyState } from '@/components/EmptyState';
export default function StatementPage() {
  return (
    <EmptyState title="Statement" lines={[['MONEY KEPT*', '$0.00'], ['  SKIPPED', '$0.00'], ['  BORROWED INSTEAD', '$0.00'], ['  BOUGHT USED', '$0.00'], ['MONEY RECOVERED', '$0.00'], ['SPENT', '$0.00'], ['ENVELOPE REMAINING', '—'], ['WARDROBE WORN THIS SEASON', '—']]}>
      <p className="text-sm text-ink-2">One monthly receipt with a chronological story: what you wanted, what you did instead, what you kept. Every line opens the receipt behind it — Phase 9.</p>
      <p className="mono mt-3 text-[11px] text-ink-3">*Estimated against confirmed purchase intentions. Money Recovered is confirmed refunds only.</p>
    </EmptyState>
  );
}
