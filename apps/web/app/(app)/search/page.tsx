import { EmptyState } from '@/components/EmptyState';
export default function SearchPage() {
  return (
    <EmptyState title="Before you buy" lines={[['1. YOU ALREADY OWN THIS', 'Wear mine'], ['2. BORROW', 'Ask to borrow'], ['3. SECONDHAND', 'Buy used'], ['4. NEW', 'Buy anyway']]}>
      <p className="text-sm text-ink-2">Search is a decision, not a feed. Results come in that order, with your purchase memory beside them (&quot;your median tee is $28; this one is $45&quot;). Skip and Hold 48h are always available — Phase 7.</p>
    </EmptyState>
  );
}
