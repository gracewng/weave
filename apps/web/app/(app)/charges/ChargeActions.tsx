'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { decideCharge } from './actions';
import { Icon } from '@/components/Icon';

/** One charge row's choices: the primary is always Add details; "Not clothes" is quiet text. */
export function ChargeActions({ txId }: { txId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3">
      <Link href={`/charges/${txId}/add`} className="btn btn-primary btn-sm"><Icon name="plus" size={12} />Add details</Link>
      <button className="btn-text" disabled={pending} onClick={() => start(async () => { if (await decideCharge(txId, 'not_clothes')) router.refresh(); })}>Not clothes</button>
    </div>
  );
}
