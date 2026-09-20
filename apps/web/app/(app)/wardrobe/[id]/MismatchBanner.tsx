'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markNotMine, dismissMismatch } from './actions';

export function MismatchBanner({ itemId, department }: { itemId: string; department: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-warn/50 bg-paper px-4 py-3 text-sm text-ink-2">
      <span className="flex-1">Might not be yours? Tagged as {(department ?? 'another').replace('mens', "men's").replace('womens', "women's")}, different from what you usually shop.</span>
      <button className="btn btn-sm btn-outline" disabled={pending} onClick={() => { if (confirm('Move this item out of your wardrobe as bought for someone else?')) start(async () => { await markNotMine(itemId); }); }}>Not mine</button>
      <button className="btn btn-sm" disabled={pending} onClick={() => start(async () => { await dismissMismatch(itemId); router.refresh(); })}>It&apos;s mine</button>
    </div>
  );
}
