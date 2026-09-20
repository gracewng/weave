'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { chooseImage, findCandidates, clearImage } from './actions';
import type { ShoppingResult } from '@weave/shared/contracts';
import { printReceipt } from '@/lib/printer';

/** "Not the right picture?" strip: cached product candidates; tap one to make it the item's image. */
export function Candidates({ itemId, initial, hasImage, imageSource }: { itemId: string; initial: ShoppingResult[]; hasImage: boolean; imageSource: string | null }) {
  const router = useRouter();
  const [list, setList] = useState(initial);
  const [open, setOpen] = useState(!hasImage && initial.length > 0);
  const [pending, start] = useTransition();
  return (
    <div className="mt-2">
      <div className="mono flex items-center justify-between text-[10px] uppercase text-ink-3">
        <span>{hasImage ? `Not the right picture?${imageSource ? ` (from ${imageSource.replace('_', ' ')})` : ''}` : imageSource === 'none' ? 'No image (you cleared it)' : 'Pick the product'}</span>
        <div className="flex gap-2">
          {hasImage && imageSource !== 'email' && imageSource !== 'user_photo' && <button className="hover:text-ink" disabled={pending} onClick={() => start(async () => { if (await clearImage(itemId)) { printReceipt({ title: 'Image cleared', lines: [{ label: 'LOOKUP', value: 'STOPPED FOR THIS ITEM', muted: true }], ttlMs: 2500 }); router.refresh(); } })}>that&apos;s not it</button>}
          {list.length > 0 && <button className="hover:text-ink" onClick={() => setOpen((o) => !o)}>{open ? 'hide' : 'show candidates'}</button>}
          <button className="hover:text-ink" disabled={pending} onClick={() => start(async () => { const r = await findCandidates(itemId); setList(r); setOpen(true); })}>{pending ? 'searching…' : list.length ? 'search again' : 'search'}</button>
        </div>
      </div>
      {open && list.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {list.map((c, i) => (
            <button key={i} className="cutout w-24 shrink-0 p-1 text-left hover:border-ink" disabled={pending} title={`${c.title} · ${c.merchant ?? ''}`} onClick={() => start(async () => {
              const ok = await chooseImage(itemId, c.imageUrl);
              if (ok) { printReceipt({ title: 'Image set', lines: [{ label: 'FROM', value: (c.merchant ?? 'store').toUpperCase().slice(0, 18) }], ttlMs: 2500 }); setOpen(false); router.refresh(); }
            })}>
              <div className="aspect-[3/4] w-full bg-paper-2"><img src={c.imageUrl} alt="" className="h-full w-full object-contain" /></div>
              <div className="mono mt-1 truncate text-[9px] text-ink-3">{c.merchant ?? ''}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
