import { EmptyState } from '@/components/EmptyState';
export default function ReturnsPage() {
  return (
    <EmptyState title="Returns" lines={[['RETURN WINDOWS OPEN', '0'], ['UNWORN & RETURNABLE', '0'], ['AT STAKE', '$0.00'], ['RETURN PENDING', '0'], ['REFUND CONFIRMED', '$0.00']]}>
      <p className="text-sm text-ink-2">Items still inside their return window, sorted by days left, with the retailer&apos;s policy and the dollars at stake. A reminder, a return, and a refund are three different states — Phase 6.</p>
    </EmptyState>
  );
}
