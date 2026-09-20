'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resolveHold } from './actions';
import { printReceipt } from '@/lib/printer';
import { usd } from '@/components/ui';

export function GhostActions({ id, priceCents }: { id: string; priceCents: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [paid, setPaid] = useState('');
  const go = (outcome: 'skipped' | 'bought_used' | 'bought', title: string) => start(async () => {
    const actual = outcome === 'bought_used' && paid ? Math.round(Number(paid) * 100) : null;
    const r = await resolveHold(id, outcome, actual);
    if (!r.ok) return;
    printReceipt({ title, lines: [{ label: 'Intended', value: usd(priceCents) }, ...(actual != null ? [{ label: 'Paid', value: usd(actual) }] : []), { label: 'Money kept', value: usd(r.keptCents), saved: r.keptCents > 0 }], footer: 'Confirmed by you', ttlMs: 5000 });
    router.refresh();
  });
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs text-ink-2">What happened?</span>
      <button className="btn btn-save btn-sm" disabled={pending} onClick={() => go('skipped', 'Purchase voided')}>Didn&apos;t need it</button>
      <span className="flex items-center gap-1"><input value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="paid $" inputMode="decimal" className="input input-sm w-20" /><button className="btn btn-sm" disabled={pending} onClick={() => go('bought_used', 'Bought used')}>Bought used</button></span>
      <button className="btn-text" disabled={pending} onClick={() => go('bought', 'Noted')}>Bought anyway</button>
    </div>
  );
}
