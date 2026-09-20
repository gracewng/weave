'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { removeItem, uploadOwnPhoto } from './actions';
import { printReceipt } from '@/lib/printer';

/** Remove (with confirmation) and Use my own photo (replace or add). Same style as the other item actions. */
export function ItemTools({ itemId, name, hasImage }: { itemId: string; name: string; hasImage: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className={`btn btn-sm btn-outline cursor-pointer ${pending ? 'opacity-55' : ''}`}>
        {pending ? 'Uploading…' : hasImage ? 'Use my own photo' : 'Add my own photo'}
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" disabled={pending} onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.set('photo', f); start(async () => { const r = await uploadOwnPhoto(itemId, fd); if (r.ok) { setErr(''); printReceipt({ title: 'Photo replaced', subtitle: name.slice(0, 28), lines: [{ label: 'Image from', value: 'your photo' }], ttlMs: 3000 }); router.refresh(); } else setErr(r.error ?? 'failed'); if (fileRef.current) fileRef.current.value = ''; }); }} />
      </label>
      <button className="btn-text hover:!text-warn" disabled={pending} onClick={() => { if (confirm(`Remove "${name}" from your wardrobe? This can't be undone.`)) start(async () => { await removeItem(itemId); }); }}>Remove from wardrobe</button>
      {err && <span className="text-xs text-warn">{err}</span>}
    </div>
  );
}
