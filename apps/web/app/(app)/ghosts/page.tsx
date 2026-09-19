import { EmptyState } from '@/components/EmptyState';
export default function GhostsPage() {
  return (
    <EmptyState title="The clothes you almost owned" lines={[['PENDING (HELD)', '0'], ['CONFIRMED OUTCOMES', '0'], ['POTENTIAL MONEY KEPT', '$0.00'], ['ESTIMATED MONEY KEPT*', '$0.00']]}>
      <p className="text-sm text-ink-2">A ledger of purchases you paused or didn&apos;t make: each is a torn, voided stub with the intended price, what stood in for it, and the outcome. A hold is not yet kept money; only a confirmed outcome turns green — Phase 7.</p>
      <p className="mono mt-3 text-[11px] text-ink-3">*Estimated against confirmed purchase intentions.</p>
    </EmptyState>
  );
}
