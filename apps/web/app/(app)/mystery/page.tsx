import { EmptyState } from '@/components/EmptyState';
export default function MysteryPage() {
  return (
    <EmptyState title="Mystery Purchases" lines={[['UNEXPLAINED CHARGES', '0'], ['CLOSET CONFIDENCE', '—']]}>
      <p className="text-sm text-ink-2">Card charges with no matching email become a quick quiz. Connect a card in Phase 4.</p>
    </EmptyState>
  );
}
