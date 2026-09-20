'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateDetails } from './actions';
import { printReceipt } from '@/lib/printer';
import { Field, Note } from '@/components/ui';

export function EditDetails({ itemId, name, brand, color, size }: { itemId: string; name: string; brand: string | null; color: string | null; size: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [f, setF] = useState({ name, brand: brand ?? '', color: color && color !== 'unknown' ? color : '', size: size ?? '' });
  if (!open) return <button className="btn btn-sm btn-outline" onClick={() => setOpen(true)}>Edit details{!f.color ? ' · color not known' : ''}</button>;
  const field = (k: keyof typeof f, label: string) => (
    <Field label={label}><input className="input input-sm" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>
  );
  return (
    <form className="w-72 max-w-full space-y-2 rounded-2xl bg-paper p-3" onSubmit={(e) => { e.preventDefault(); start(async () => {
      const r = await updateDetails(itemId, f);
      if (r.ok) { printReceipt({ title: 'Details updated', lines: [{ label: 'Color', value: f.color || 'not known' }, ...(r.relookup ? [{ label: 'Image', value: 'searched again', muted: true }] : [])], ttlMs: 3000 }); setOpen(false); router.refresh(); }
    }); }}>
      {field('name', 'Name')}
      <div className="grid grid-cols-3 gap-2">{field('brand', 'Brand')}{field('color', 'Color')}{field('size', 'Size')}</div>
      <div className="flex gap-2"><button className="btn btn-sm btn-primary" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button><button className="btn btn-sm btn-outline" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
      <Note>Changing the name, brand or color searches for a new product image (one search).</Note>
    </form>
  );
}
