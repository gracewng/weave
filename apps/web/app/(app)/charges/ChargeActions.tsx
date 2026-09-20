'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { decideCharge } from './actions';
import { Icon } from '@/components/Icon';

export function ChargeActions({ txId }: { txId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3">
      <Link href={`/charges/${txId}/add`} className="btn btn-primary flex items-center gap-1 !py-1 !text-[10px]"><Icon name="plus" size={12} />Add details</Link>
      <button className="mono text-[10px] uppercase text-ink-3 hover:text-ink" disabled={pending} onClick={() => start(async () => { if (await decideCharge(txId, 'not_clothes')) router.refresh(); })}>Not clothes</button>
    </div>
  );
}
