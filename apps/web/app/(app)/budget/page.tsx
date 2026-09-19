import { EmptyState } from '@/components/EmptyState';
export default function BudgetPage() {
  return (
    <EmptyState title="Budget" lines={[['MONTHLY ENVELOPE', '—'], ['SPENT THIS MONTH', '$0.00'], ['REMAINING', '—'], ['PROJECTED', '—']]}>
      <p className="text-sm text-ink-2">Set your take-home pay and Weave sets a monthly clothing envelope, fills it from your receipts and card, and shows what the money could be instead — Phase 5.</p>
    </EmptyState>
  );
}
