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
    <div className="absolute right-2 top-2 z-10" onClick={(e) => e.preventDefault()}>
      <button className="btn-icon bg-paper/90 opacity-0 shadow-sm transition group-hover:opacity-100 focus:opacity-100" aria-label="Item actions" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }} onContextMenu={(e) => { e.preventDefault(); setOpen(true); }}>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><circle cx="6" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18" cy="12" r="1.6" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 flex w-44 flex-col overflow-hidden rounded-2xl border border-dust bg-paper py-1 text-xs shadow-lg" onMouseLeave={() => setOpen(false)}>
          <label className="cursor-pointer px-3 py-2 hover:bg-mist">{hasImage ? 'Use my own photo' : 'Add my own photo'}
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" disabled={pending} onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.set('photo', f); start(async () => { await uploadOwnPhoto(itemId, fd); setOpen(false); router.refresh(); }); }} />
          </label>
          <button className="px-3 py-2 text-left hover:bg-mist hover:text-warn" disabled={pending} onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (confirm(`Remove "${name}" from your wardrobe?`)) start(async () => { await removeItem(itemId); }); }}>Remove from wardrobe</button>
        </div>
      )}
    </div>
  );
}
