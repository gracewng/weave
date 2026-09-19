import { EmptyState } from '@/components/EmptyState';
export default function ChargesPage() {
  return (
    <EmptyState title="Charges" lines={[['NEW CHARGES TO CONFIRM', '0'], ['MYSTERY PURCHASES', '0'], ['CLOSET COVERAGE', 'Not enough purchase history']]}>
      <p className="text-sm text-ink-2">Every clothing charge on your card gets one question: keep, returning, or not clothes. Older charges with no email become a quick quiz. Closet Coverage is resolved purchase records over detected ones, never a guess — Phase 4.</p>
    </EmptyState>
  );
}
