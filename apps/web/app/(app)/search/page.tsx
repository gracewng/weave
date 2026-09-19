import { EmptyState } from '@/components/EmptyState';
export default function SearchPage() {
  return (
    <EmptyState title="Search" lines={[['1. YOUR WARDROBE', '—'], ['2. FRIENDS\' WARDROBES', '—'], ['3. SECONDHAND', '—'], ['4. NEW RETAIL', 'last']]}>
      <p className="text-sm text-ink-2">The search bar that checks your closet before the internet. Results come in that order — Phase 7.</p>
    </EmptyState>
  );
}
