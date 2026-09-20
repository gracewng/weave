'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { removeItem, uploadOwnPhoto } from '@/app/(app)/wardrobe/[id]/actions';

/** Hover / long-press menu on a wardrobe card: replace photo, remove. Mirrors the item-page tools. */
export function CardMenu({ itemId, name, hasImage }: { itemId: string; name: string; hasImage: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="absolute right-1 top-1" onClick={(e) => e.preventDefault()}>
      <button className="mono bg-paper/90 px-1.5 text-[11px] leading-none text-ink-3 opacity-0 transition group-hover:opacity-100 focus:opacity-100" aria-label="Item actions" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }} onContextMenu={(e) => { e.preventDefault(); setOpen(true); }}>⋯</button>
      {open && (
        <div className="mono absolute right-0 mt-1 flex w-40 flex-col border border-rule bg-paper text-[10px] uppercase shadow" onMouseLeave={() => setOpen(false)}>
          <label className="cursor-pointer px-2 py-1.5 hover:bg-paper-2">{hasImage ? 'Use my own photo' : 'Add my own photo'}
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" disabled={pending} onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.set('photo', f); start(async () => { await uploadOwnPhoto(itemId, fd); setOpen(false); router.refresh(); }); }} />
          </label>
          <button className="px-2 py-1.5 text-left hover:bg-paper-2 hover:text-warn" disabled={pending} onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (confirm(`Remove "${name}" from your wardrobe?`)) start(async () => { await removeItem(itemId); }); }}>Remove</button>
        </div>
      )}
    </div>
  );
}
