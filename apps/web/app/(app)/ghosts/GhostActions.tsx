'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resolveHold } from './actions';
import { printReceipt } from '@/lib/printer';
import { usd } from '@/components/Receipt';

export function GhostActions({ id, priceCents }: { id: string; priceCents: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [paid, setPaid] = useState('');
  const go = (outcome: 'skipped' | 'bought_used' | 'bought', title: string) => start(async () => {
    const actual = outcome === 'bought_used' && paid ? Math.round(Number(paid) * 100) : null;
    const r = await resolveHold(id, outcome, actual);
    if (!r.ok) return;
    printReceipt({ title, lines: [{ label: 'INTENDED', value: usd(priceCents) }, ...(actual != null ? [{ label: 'PAID', value: usd(actual) }] : []), { label: 'MONEY KEPT', value: usd(r.keptCents), saved: r.keptCents > 0 }], footer: outcome === 'bought' ? 'LOG THE FIRST WEAR WHEN IT ARRIVES' : 'CONFIRMED BY YOU', ttlMs: 5000 });
    router.refresh();
  });
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="mono text-[10px] uppercase text-ink-3">What happened?</span>
      <button className="btn btn-save !py-1 !text-[10px]" disabled={pending} onClick={() => go('skipped', 'Purchase voided')}>Didn&apos;t need it</button>
      <span className="flex items-center gap-1"><input value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="paid $" inputMode="decimal" className="mono w-16 border border-rule bg-paper p-1 text-[10px]" /><button className="btn !py-1 !text-[10px]" disabled={pending} onClick={() => go('bought_used', 'Bought used')}>Bought used</button></span>
      <button className="mono text-[10px] uppercase text-ink-3 hover:text-ink" disabled={pending} onClick={() => go('bought', 'Noted')}>Bought anyway</button>
    </div>
  );
}
