'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { captureForCharge, type CaptureResult } from './actions';
import { printReceipt } from '@/lib/printer';

export function CaptureForm({ txId, merchant, amount }: { txId: string; merchant: string; amount: string }) {
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<CaptureResult | null>(null);
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); start(async () => {
      const r = await captureForCharge(txId, fd); setResult(r);
      if (r.ok) printReceipt({ title: 'Receipt on file', subtitle: merchant.toUpperCase().slice(0, 28), lines: [{ label: 'READ AS', value: (r.kind ?? '').toUpperCase() }, { label: 'ITEMS', value: String(r.items?.length ?? 0) }, { label: 'CONFIDENCE', value: `${Math.round((r.confidence ?? 0) * 100)}%`, muted: true }], ttlMs: 5000 });
    }); }}>
      <label className="block">
        <div className="btn btn-primary block w-full py-6 text-center text-base">📷 Snap the receipt, tag, or garment</div>
        <input name="photo" type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; setPreview(f ? URL.createObjectURL(f) : null); }} />
      </label>
      {preview && <img src={preview} alt="preview" className="mx-auto max-h-64 border border-rule" />}
      <label className="block"><div className="mono text-[10px] uppercase text-ink-3">Or describe what you bought</div>
        <input name="description" placeholder={`e.g. black crew neck tee, size M, ${amount}`} className="mt-0.5 w-full border border-rule bg-paper p-2 text-sm" /></label>
      <button className="btn w-full" type="submit" disabled={pending}>{pending ? 'Reading…' : 'Add to wardrobe'}</button>
      {result && !result.ok && <div className="mono text-[11px] text-warn">{result.error}</div>}
      {result?.ok && (
        <div className="mono text-[11px] text-ink-2">ADDED: {result.items?.map((i) => i.name).join(' · ')} · <Link href="/wardrobe" className="underline">WARDROBE</Link> · <Link href="/charges" className="underline">CHARGES</Link></div>
      )}
      <div className="mono text-[10px] text-ink-3">THE PHOTO IS STORED AS YOUR RECEIPT. THE PRODUCT IMAGE COMES FROM THE ITEM LOOKUP, OR THE PHOTO ITSELF FOR A GARMENT SHOT.</div>
    </form>
  );
}
