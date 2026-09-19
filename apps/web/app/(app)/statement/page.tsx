import { EmptyState } from '@/components/EmptyState';
export default function StatementPage() {
  return (
    <EmptyState title="Statement" lines={[['SPENT', '$0.00'], ['BUDGET REMAINING', '—'], ['NOT SPENT (GHOSTS)', '$0.00'], ['BORROWED', '$0.00'], ['SECONDHAND', '$0.00'], ['RETURNS CAUGHT', '$0.00'], ['TOTAL SAVED', '$0.00']]}>
      <p className="text-sm text-ink-2">Your monthly clothing statement: spent, saved, worn %, best and worst cost-per-wear — Phase 9.</p>
    </EmptyState>
  );
}
