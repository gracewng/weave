import { EmptyState } from '@/components/EmptyState';
export default function ReturnsPage() {
  return (
    <EmptyState title="Returns" lines={[['RETURN WINDOWS OPEN', '0'], ['UNWORN & RETURNABLE', '0']]}>
      <p className="text-sm text-ink-2">Items you haven&apos;t worn with a return window closing soon show up here — Phase 9.</p>
    </EmptyState>
  );
}
