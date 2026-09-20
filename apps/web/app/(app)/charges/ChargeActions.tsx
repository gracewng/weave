'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { decideCharge, skipCharge } from './actions';
import { printReceipt } from '@/lib/printer';
import { usd } from '@/components/ui';

const ANSWER: Record<string, string> = { keep: 'Keep', returning: 'Returning', not_clothes: 'Not clothes', gift: 'For someone else' };

export function ChargeActions({ txId, merchant, amountCents, decision, kind }: { txId: string; merchant: string; amountCents: number; decision: string | null; kind: 'new' | 'mystery' }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (d: 'keep' | 'returning' | 'not_clothes' | 'gift', title: string) => start(async () => {
    if (await decideCharge(txId, d)) { printReceipt({ title, subtitle: merchant.slice(0, 28), lines: [{ label: 'Charge', value: usd(amountCents) }, { label: 'Answer', value: ANSWER[d] ?? d }], ttlMs: 3500 }); router.refresh(); }
  });
  if (decision && decision !== 'keep') return <div className="mt-3 text-xs text-ink-3">Answered: {ANSWER[decision] ?? decision}</div>;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Link href={`/capture/${txId}`} className="btn btn-sm btn-primary">{kind === 'new' ? 'Snap the receipt' : 'Snap it'}</Link>
      {!decision && <button className="btn btn-sm" disabled={pending} onClick={() => go('keep', 'Keeping it')}>Keep</button>}
      <button className="btn btn-sm" disabled={pending} onClick={() => go('returning', 'Return pending')}>Returning</button>
      <button className="btn btn-sm" disabled={pending} onClick={() => go('gift', 'For someone else')}>For someone else</button>
      <button className="btn-text" disabled={pending} onClick={() => go('not_clothes', 'Not clothes')}>Not clothes</button>
      {kind === 'mystery' && <button className="btn-text" disabled={pending} onClick={() => start(async () => { if (await skipCharge(txId)) router.refresh(); })}>Skip</button>}
    </div>
  );
}
