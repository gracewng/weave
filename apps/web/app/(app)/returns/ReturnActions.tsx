'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startReturn, confirmRefund, cancelReturn } from './actions';
import { printReceipt } from '@/lib/printer';
import { usd } from '@/components/ui';

export function ReturnActions({ itemId, name, priceCents, status }: { itemId: string; name: string; priceCents: number | null; status: 'owned' | 'returning' }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [refund, setRefund] = useState(priceCents != null ? (priceCents / 100).toFixed(2) : '');
  const label = name.slice(0, 28);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {status === 'owned' && (
        <button className="btn btn-sm" disabled={pending} onClick={() => start(async () => { if (await startReturn(itemId)) { printReceipt({ title: 'Return pending', subtitle: label, lines: [{ label: 'At stake', value: usd(priceCents) }, { label: 'Recovered', value: '$0.00, not yet', muted: true }], footer: 'A return is not a refund until it is', ttlMs: 4500 }); router.refresh(); } })}>Start return</button>
      )}
      <span className="flex items-center gap-1.5">
        <input value={refund} onChange={(e) => setRefund(e.target.value)} inputMode="decimal" className="input input-sm w-24" placeholder="Refund $" />
        <button className="btn btn-sm btn-save" disabled={pending || !refund} onClick={() => start(async () => { const c = Math.round(Number(refund) * 100); if (!Number.isFinite(c)) return; if (await confirmRefund(itemId, c)) { printReceipt({ title: 'Refund confirmed', subtitle: label, lines: [{ label: 'Paid', value: usd(priceCents) }, { label: 'Refunded', value: usd(c), saved: true }, { label: 'Money Recovered', value: usd(c), saved: true }], footer: 'Confirmed by you, net of fees', ttlMs: 5000 }); router.refresh(); } })}>Refund confirmed</button>
      </span>
      {status === 'returning' && <button className="btn-text" disabled={pending} onClick={() => start(async () => { if (await cancelReturn(itemId)) router.refresh(); })}>Keeping it after all</button>}
    </div>
  );
}
