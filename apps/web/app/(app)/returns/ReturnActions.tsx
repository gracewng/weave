'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startReturn, confirmRefund, cancelReturn } from './actions';
import { printReceipt } from '@/lib/printer';
import { usd } from '@/components/Receipt';

export function ReturnActions({ itemId, name, priceCents, status }: { itemId: string; name: string; priceCents: number | null; status: 'owned' | 'returning' }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [refund, setRefund] = useState(priceCents != null ? (priceCents / 100).toFixed(2) : '');
  const label = name.toUpperCase().slice(0, 22);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {status === 'owned' && (
        <button className="btn !py-1 !text-[10px]" disabled={pending} onClick={() => start(async () => { if (await startReturn(itemId)) { printReceipt({ title: 'Return pending', subtitle: label, lines: [{ label: 'AT STAKE', value: usd(priceCents) }, { label: 'RECOVERED', value: '$0.00 — NOT YET', muted: true }], footer: 'NOT A REFUND YET', ttlMs: 4500 }); router.refresh(); } })}>Start return</button>
      )}
      <span className="flex items-center gap-1">
        <input value={refund} onChange={(e) => setRefund(e.target.value)} inputMode="decimal" className="mono w-20 border border-rule bg-paper p-1 text-[10px]" placeholder="refund $" />
        <button className="btn btn-save !py-1 !text-[10px]" disabled={pending || !refund} onClick={() => start(async () => { const c = Math.round(Number(refund) * 100); if (!Number.isFinite(c)) return; if (await confirmRefund(itemId, c)) { printReceipt({ title: 'Refund confirmed', subtitle: label, lines: [{ label: 'PAID', value: usd(priceCents) }, { label: 'REFUNDED', value: usd(c), saved: true }, { label: 'MONEY RECOVERED', value: usd(c), saved: true }], footer: 'NET OF FEES', ttlMs: 5000 }); router.refresh(); } })}>Refund confirmed</button>
      </span>
      {status === 'returning' && <button className="mono text-[10px] uppercase text-ink-3 hover:text-ink" disabled={pending} onClick={() => start(async () => { if (await cancelReturn(itemId)) router.refresh(); })}>Keep it</button>}
    </div>
  );
}
