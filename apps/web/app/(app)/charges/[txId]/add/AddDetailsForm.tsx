'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addPurchaseDetails } from './actions';
import { printReceipt } from '@/lib/printer';

const CATS: Array<[string, string]> = [['top', 'Top'], ['bottom', 'Bottom'], ['dress', 'Dress'], ['outerwear', 'Outerwear'], ['shoes', 'Shoes'], ['accessory', 'Accessory'], ['intimates', 'Intimates'], ['other', 'Other']];
const FORMALITY: Array<[number, string]> = [[1, 'Gym / lounge'], [2, 'Casual'], [3, 'Smart casual'], [4, 'Formal'], [5, 'Black tie']];

export function AddDetailsForm({ txId, merchant }: { txId: string; merchant: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const field = (name: string, label: string, placeholder = '') => (
    <label className="block"><div className="mono text-[10px] uppercase text-ink-3">{label}</div><input name={name} placeholder={placeholder} className="input mt-0.5 " /></label>
  );
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); start(async () => {
      const r = await addPurchaseDetails(txId, fd);
      if (!r.ok) { setErr(r.error ?? 'failed'); return; }
      printReceipt({ title: 'Added to wardrobe', subtitle: merchant.toUpperCase().slice(0, 28), lines: [{ label: 'ITEM', value: String(fd.get('name') || 'FROM PHOTO').toUpperCase().slice(0, 22) }], ttlMs: 3500 });
      router.push(r.itemId ? `/wardrobe/${r.itemId}` : '/wardrobe');
    }); }}>
      {field('name', 'Item name', 'black crew neck tee')}
      <div className="grid grid-cols-2 gap-2">
        {field('brand', 'Brand', 'Uniqlo')}
        <label className="block"><div className="mono text-[10px] uppercase text-ink-3">Type</div><select name="category" className="input mt-0.5 ">{CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="block"><div className="mono text-[10px] uppercase text-ink-3">Casual / formal</div><select name="formality" defaultValue={2} className="input mt-0.5 ">{FORMALITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        {field('color', 'Color', 'black')}
        {field('size', 'Size', 'M')}
      </div>
      <label className="block">
        <div className="mono text-[10px] uppercase text-ink-3">Picture (optional)</div>
        <input name="photo" type="file" accept="image/*" capture="environment" className="mt-0.5 w-full text-xs" onChange={(e) => { const f = e.target.files?.[0]; setPreview(f ? URL.createObjectURL(f) : null); }} />
        {preview && <img src={preview} alt="preview" className="mt-2 max-h-48 border border-rule" />}
      </label>
      <button className="btn btn-primary w-full" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Add to wardrobe'}</button>
      {err && <div className="mono text-[11px] text-warn">{err}</div>}
      <div className="mono text-[10px] text-ink-3">NO NAME? UPLOAD THE RECEIPT OR TAG AND IT'S READ FOR YOU.</div>
    </form>
  );
}
