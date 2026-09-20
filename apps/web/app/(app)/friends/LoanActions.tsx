'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setLoanStatus } from './actions';
import { printReceipt } from '@/lib/printer';

const STATUS: Record<string, string> = { accepted: 'Accepted', declined: 'Declined', out: 'Handed over', returned: 'Returned' };

export function LoanActions({ loanId, status, isOwner, itemName, ownerName, borrowerName, dueBack }: { loanId: string; status: string; isOwner: boolean; itemName: string; ownerName: string; borrowerName: string; dueBack: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (s: 'accepted' | 'declined' | 'out' | 'returned') => start(async () => {
    const r = await setLoanStatus(loanId, s);
    if (!r.ok) { alert(r.error); return; }
    printReceipt({ title: 'Shared receipt', subtitle: `${ownerName} · ${borrowerName}`, lines: [{ label: 'Item', value: itemName.slice(0, 28) }, { label: 'Status', value: STATUS[s] ?? s }, ...(dueBack ? [{ label: 'Due back', value: dueBack, muted: true }] : [])], footer: 'No prices on a shared receipt', ttlMs: 5000 });
    router.refresh();
  });
  const b = (label: string, s: 'accepted' | 'declined' | 'out' | 'returned', primary = false) => <button key={s} className={`btn btn-sm ${primary ? 'btn-save' : 'btn-outline'}`} disabled={pending} onClick={() => go(s)}>{label}</button>;
  if (status === 'requested') return <div className="flex gap-2">{isOwner ? [b('Accept', 'accepted', true), b('Decline', 'declined')] : <span className="text-xs text-ink-3">Waiting for {ownerName}</span>}</div>;
  if (status === 'accepted') return <div className="flex gap-2">{b('Handed over', 'out', true)}{isOwner && b('Decline', 'declined')}</div>;
  if (status === 'out') return <div className="flex gap-2">{b('Returned', 'returned', true)}</div>;
  return null;
}
