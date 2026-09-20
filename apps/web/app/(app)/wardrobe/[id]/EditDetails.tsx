'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateDetails } from './actions';
import { printReceipt } from '@/lib/printer';
import { Icon } from '@/components/Icon';

export function EditDetails({ itemId, name, brand, color, size }: { itemId: string; name: string; brand: string | null; color: string | null; size: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [f, setF] = useState({ name, brand: brand ?? '', color: color && color !== 'unknown' ? color : '', size: size ?? '' });
  if (!open) return <button className="btn flex items-center gap-1 btn-sm" onClick={() => setOpen(true)}><Icon name="edit" size={12} />Edit{!f.color ? ' · color?' : ''}</button>;
  const field = (k: keyof typeof f, label: string) => (
    <label className="block"><div className="mono text-[10px] uppercase text-ink-3">{label}</div>
      <input className="input mt-0.5 " value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
  );
  return (
    <form className="mt-2 space-y-2" onSubmit={(e) => { e.preventDefault(); start(async () => {
      const r = await updateDetails(itemId, f);
      if (r.ok) { printReceipt({ title: 'Details updated', lines: [{ label: 'COLOR', value: (f.color || 'not known').toUpperCase() }, ...(r.relookup ? [{ label: 'IMAGE', value: 'SEARCHED AGAIN', muted: true }] : [])], ttlMs: 3000 }); setOpen(false); router.refresh(); }
    }); }}>
      {field('name', 'Name')}
      <div className="grid grid-cols-3 gap-2">{field('brand', 'Brand')}{field('color', 'Color')}{field('size', 'Size')}</div>
      <div className="flex gap-2"><button className="btn btn-primary btn-sm" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button><button className="btn btn-sm btn-outline" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
      <div className="text-xs text-ink-3">Changing the name, brand or color searches for a new picture.</div>
    </form>
  );
}
