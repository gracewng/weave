'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { chooseImage, findCandidates, clearImage, uploadOwnPhoto } from './actions';
import type { ShoppingResult } from '@weave/shared/contracts';
import { printReceipt } from '@/lib/printer';
import { Icon } from '@/components/Icon';

/** One row: Clear image · Other options · My own photo. Candidates open underneath. */
export function ImageOptions({ itemId, initial, hasImage }: { itemId: string; initial: ShoppingResult[]; hasImage: boolean }) {
  const router = useRouter();
  const [list, setList] = useState(initial);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-2">
        {hasImage && <button className="btn flex items-center gap-1 btn-sm" disabled={pending} onClick={() => start(async () => { if (await clearImage(itemId)) { printReceipt({ title: 'Image cleared', lines: [{ label: 'LOOKUP', value: 'STOPPED', muted: true }], ttlMs: 2500 }); router.refresh(); } })}><Icon name="x" size={12} />Clear</button>}
        <button className="btn flex items-center gap-1 btn-sm" disabled={pending} onClick={() => start(async () => { if (!list.length) setList(await findCandidates(itemId)); setOpen((o) => !o); })}><Icon name="image" size={12} />{pending && !open ? 'Searching…' : open ? 'Hide' : 'Options'}</button>
        <label className="btn flex cursor-pointer items-center gap-1 btn-sm"><Icon name="camera" size={12} />{hasImage ? 'My photo' : 'Add photo'}
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" disabled={pending} onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.set('photo', f); start(async () => { const r = await uploadOwnPhoto(itemId, fd); if (r.ok) { setErr(''); printReceipt({ title: 'Photo replaced', lines: [{ label: 'IMAGE FROM', value: 'YOUR PHOTO' }], ttlMs: 3000 }); router.refresh(); } else setErr(r.error ?? 'failed'); if (fileRef.current) fileRef.current.value = ''; }); }} />
        </label>
        {err && <span className="mono text-[10px] text-warn">{err}</span>}
      </div>
      {open && (list.length === 0 ? <div className="text-xs text-ink-3">No other pictures found.</div> : (
        <div className="flex gap-2 overflow-x-auto">
          {list.map((c, i) => (
            <button key={i} className="cutout w-24 shrink-0 p-1 text-left hover:border-ink" disabled={pending} title={`${c.title} · ${c.merchant ?? ''}`} onClick={() => start(async () => { if (await chooseImage(itemId, c.imageUrl)) { printReceipt({ title: 'Image set', lines: [{ label: 'FROM', value: (c.merchant ?? 'store').toUpperCase().slice(0, 18) }], ttlMs: 2500 }); setOpen(false); router.refresh(); } })}>
              <div className="aspect-[3/4] w-full bg-paper-2"><img src={c.imageUrl} alt="" className="h-full w-full object-contain" /></div>
              <div className="mt-1 truncate text-[10px] text-ink-3">{c.merchant ?? ''}</div>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
