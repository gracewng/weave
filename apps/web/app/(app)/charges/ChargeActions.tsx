'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { decideCharge, skipCharge } from './actions';
import { printReceipt } from '@/lib/printer';
import { usd } from '@/components/Receipt';

export function ChargeActions({ txId, merchant, amountCents, decision, kind }: { txId: string; merchant: string; amountCents: number; decision: string | null; kind: 'new' | 'mystery' }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (d: 'keep' | 'returning' | 'not_clothes' | 'gift', title: string) => start(async () => {
    if (await decideCharge(txId, d)) { printReceipt({ title, subtitle: merchant.toUpperCase().slice(0, 28), lines: [{ label: 'CHARGE', value: usd(amountCents) }, { label: 'ANSWER', value: d.replace('_', ' ').toUpperCase() }], ttlMs: 3500 }); router.refresh(); }
  });
  if (decision && decision !== 'keep') return <div className="mono text-[10px] text-ink-3">ANSWERED · {decision.replace('_', ' ').toUpperCase()}</div>;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Link href={`/capture/${txId}`} className="btn btn-primary !py-1 !text-[10px]">{kind === 'new' ? 'Snap the receipt' : 'Snap it'}</Link>
      {!decision && <button className="btn !py-1 !text-[10px]" disabled={pending} onClick={() => go('keep', 'Keeping it')}>Keep</button>}
      <button className="btn !py-1 !text-[10px]" disabled={pending} onClick={() => go('returning', 'Return pending')}>Returning</button>
      <button className="btn !py-1 !text-[10px]" disabled={pending} onClick={() => go('gift', 'For someone else')}>For someone else</button>
      <button className="mono text-[10px] uppercase text-ink-3 hover:text-ink" disabled={pending} onClick={() => go('not_clothes', 'Not clothes')}>Not clothes</button>
      {kind === 'mystery' && <button className="mono text-[10px] uppercase text-ink-3 hover:text-ink" disabled={pending} onClick={() => start(async () => { if (await skipCharge(txId)) router.refresh(); })}>Skip</button>}
    </div>
  );
}
