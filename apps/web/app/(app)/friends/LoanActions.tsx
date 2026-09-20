'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setLoanStatus } from './actions';
import { printReceipt } from '@/lib/printer';

export function LoanActions({ loanId, status, isOwner, itemName, ownerName, borrowerName, dueBack }: { loanId: string; status: string; isOwner: boolean; itemName: string; ownerName: string; borrowerName: string; dueBack: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (s: 'accepted' | 'declined' | 'out' | 'returned') => start(async () => {
    const r = await setLoanStatus(loanId, s);
    if (!r.ok) { alert(r.error); return; }
    printReceipt({ title: 'Shared receipt', subtitle: `${ownerName.toUpperCase()} · ${borrowerName.toUpperCase()}`, lines: [{ label: 'ITEM', value: itemName.toUpperCase().slice(0, 22) }, { label: 'STATUS', value: s.toUpperCase() }, ...(dueBack ? [{ label: 'DUE BACK', value: dueBack, muted: true }] : [])], footer: 'NO PRICES ON A SHARED RECEIPT', ttlMs: 5000 });
    router.refresh();
  });
  const b = (label: string, s: 'accepted' | 'declined' | 'out' | 'returned', primary = false) => <button key={s} className={`btn !py-1 !text-[10px] ${primary ? 'btn-save' : ''}`} disabled={pending} onClick={() => go(s)}>{label}</button>;
  if (status === 'requested') return <div className="flex gap-2">{isOwner ? [b('Accept', 'accepted', true), b('Decline', 'declined')] : <span className="mono text-[10px] text-ink-3">WAITING FOR {ownerName.toUpperCase()}</span>}</div>;
  if (status === 'accepted') return <div className="flex gap-2">{b('Handed over', 'out', true)}{isOwner && b('Decline', 'declined')}</div>;
  if (status === 'out') return <div className="flex gap-2">{b('Returned', 'returned', true)}</div>;
  return null;
}
