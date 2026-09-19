import { EmptyState } from '@/components/EmptyState';
export default function LedgerPage() {
  return (
    <EmptyState title="Ledger" lines={[['DUPLICATES SKIPPED', '$0.00'], ['BORROWED', '$0.00'], ['SECONDHAND', '$0.00'], ['RETURNS CAUGHT', '$0.00'], ['TOTAL SAVED', '$0.00']]}>
      <p className="text-sm text-ink-2">One money ledger. Every skip, borrow, secondhand swap and return rolls up here — Phase 9.</p>
    </EmptyState>
  );
}
