import { EmptyState } from '@/components/EmptyState';
export default function GhostsPage() {
  return (
    <EmptyState title="Ghost Rack" lines={[['THINGS YOU DIDN\'T BUY', '0'], ['NOT SPENT', '$0.00']]}>
      <p className="text-sm text-ink-2">Items you searched for and held or skipped hang here as ghosts, with the money you kept — Phase 7.</p>
    </EmptyState>
  );
}
