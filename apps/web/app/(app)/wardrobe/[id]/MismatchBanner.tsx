'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markNotMine, dismissMismatch } from './actions';

export function MismatchBanner({ itemId, department }: { itemId: string; department: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="mono flex flex-wrap items-center gap-3 border border-dashed border-rule bg-paper p-2 text-[10px] uppercase text-ink-3">
      <span>Yours? Tagged {(department ?? 'another').replace('mens', "men's").replace('womens', "women's")}.</span>
      <button className="btn !py-0.5 !text-[10px]" disabled={pending} onClick={() => { if (confirm('Move this item out of your wardrobe as bought for someone else?')) start(async () => { await markNotMine(itemId); }); }}>Not mine</button>
      <button className="hover:text-ink" disabled={pending} onClick={() => start(async () => { await dismissMismatch(itemId); router.refresh(); })}>It&apos;s mine</button>
    </div>
  );
}
