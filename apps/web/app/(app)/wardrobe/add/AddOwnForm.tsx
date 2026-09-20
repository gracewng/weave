'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addOwnItem } from './actions';
import { printReceipt } from '@/lib/printer';
import { Icon } from '@/components/Icon';

const CATS: Array<[string, string]> = [['', 'Type'], ['top', 'Top'], ['bottom', 'Bottom'], ['dress', 'Dress'], ['outerwear', 'Outerwear'], ['shoes', 'Shoes'], ['accessory', 'Accessory'], ['intimates', 'Intimates'], ['other', 'Other']];

/** Photo first (camera on phones), then optional details. No name + a photo → the model reads the garment or tag. */
export function AddOwnForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); start(async () => {
      const r = await addOwnItem(fd);
      if (!r.ok) { setErr(r.error ?? 'failed'); return; }
      printReceipt({ title: 'Added to wardrobe', lines: [{ label: 'Item', value: (r.name ?? name ?? 'From photo').slice(0, 26) }], ttlMs: 3500 });
      router.push(r.itemId ? `/wardrobe/${r.itemId}` : '/wardrobe');
    }); }}>
      <label className={`relative block cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed ${preview ? 'border-fern' : 'border-sage'} bg-paper text-center transition hover:border-fern`}>
        <input name="photo" type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; setPreview(f ? URL.createObjectURL(f) : null); }} />
        {preview ? (
          <img src={preview} alt="Your photo" className="mx-auto max-h-80 object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-2 py-12 text-ink-2">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mist"><Icon name="camera" size={26} /></span>
            <span className="text-sm font-medium">Take a photo or choose one</span>
            <span className="text-xs text-ink-3">The garment, its tag, or the receipt</span>
          </div>
        )}
        {preview && <span className="absolute bottom-2 right-2 rounded-full bg-paper/90 px-3 py-1 text-xs">Change</span>}
      </label>

      <input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional with a photo)" className="input" aria-label="Item name" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input name="brand" placeholder="Brand" className="input" aria-label="Brand" />
        <select name="category" defaultValue="" className="input" aria-label="Type">{CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <input name="color" placeholder="Color" className="input" aria-label="Color" />
        <input name="size" placeholder="Size" className="input" aria-label="Size" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input name="price" inputMode="decimal" placeholder="Paid $ (optional)" className="input" aria-label="Price paid" />
        <input name="purchase_date" type="date" className="input" aria-label="Bought on" />
      </div>

      <button className="btn btn-primary !px-8 !py-3 !text-sm" type="submit" disabled={pending || (!preview && !name.trim())}>{pending ? 'Adding…' : 'Add to wardrobe'}</button>
      {err && <div className="text-xs text-warn">{err}</div>}
    </form>
  );
}
