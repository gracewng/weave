'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { captureForCharge, type CaptureResult } from './actions';
import { printReceipt } from '@/lib/printer';
import { Field, Note } from '@/components/ui';

export function CaptureForm({ txId, merchant, amount }: { txId: string; merchant: string; amount: string }) {
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<CaptureResult | null>(null);
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); start(async () => {
      const r = await captureForCharge(txId, fd); setResult(r);
      if (r.ok) printReceipt({ title: 'Receipt on file', subtitle: merchant.slice(0, 28), lines: [{ label: 'Read as', value: r.kind ?? '' }, { label: 'Items', value: String(r.items?.length ?? 0) }, { label: 'Confidence', value: `${Math.round((r.confidence ?? 0) * 100)}%`, muted: true }], ttlMs: 5000 });
    }); }}>
      <label className="block">
        <span className="btn btn-primary w-full !py-6 !text-sm">📷 Snap the receipt, tag, or garment</span>
        <input name="photo" type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; setPreview(f ? URL.createObjectURL(f) : null); }} />
      </label>
      {preview && <img src={preview} alt="preview" className="mx-auto max-h-64 rounded-2xl" />}
      <Field label="Or describe what you bought"><input name="description" placeholder={`e.g. black crew neck tee, size M, ${amount}`} className="input" /></Field>
      <button className="btn w-full" type="submit" disabled={pending}>{pending ? 'Reading…' : 'Add to wardrobe'}</button>
      {result && !result.ok && <div className="text-sm text-warn">{result.error}</div>}
      {result?.ok && (
        <div className="text-sm text-ink-2">Added: {result.items?.map((i) => i.name).join(' · ')} · <Link href="/wardrobe" className="underline">Wardrobe</Link> · <Link href="/charges" className="underline">Charges</Link></div>
      )}
      <Note>The photo is stored as your receipt. The product image comes from the item lookup, or the photo itself for a garment shot.</Note>
    </form>
  );
}
