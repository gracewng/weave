import { EmptyState } from '@/components/EmptyState';
export default function CrewsPage() {
  return (
    <EmptyState title="Crews" lines={[['CREWS', '0'], ['LOOKS STYLED', '0'], ['CREW SPENT ON NEW CLOTHES', '$0.00']]}>
      <p className="text-sm text-ink-2">A crew is a friend group dressing for one event. Style the whole crew from your combined closets — Phase 8.</p>
    </EmptyState>
  );
}
