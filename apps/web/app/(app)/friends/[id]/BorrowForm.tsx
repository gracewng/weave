'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { draftBorrowMessage, requestLoan } from '../actions';
import { printReceipt } from '@/lib/printer';
import { Field, Note } from '@/components/ui';

function plusDays(d: string, n: number) { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }

export function BorrowForm({ itemId, ownerId, friendName, itemName, intendedPriceCents, query }: { itemId: string; ownerId: string; friendName: string; itemName: string; intendedPriceCents: number | null; query: string | null }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [event, setEvent] = useState(query ?? '');
  const [neededOn, setNeededOn] = useState(plusDays(today, 3));
  const [dueBack, setDueBack] = useState(plusDays(today, 7));
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="For (event)"><input value={event} onChange={(e) => setEvent(e.target.value)} placeholder="a wedding" className="input" /></Field>
        <Field label="Needed on"><input type="date" value={neededOn} onChange={(e) => setNeededOn(e.target.value)} className="input" /></Field>
        <Field label="Back by"><input type="date" value={dueBack} onChange={(e) => setDueBack(e.target.value)} className="input" /></Field>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between"><span className="text-xs font-medium text-ink-2">Message to {friendName}</span><button type="button" className="btn btn-sm btn-outline" disabled={pending} onClick={() => start(async () => setMessage(await draftBorrowMessage({ friendName, itemName, event, neededOn, returnBy: dueBack })))}>{pending ? 'Drafting…' : 'Draft one for me'}</button></div>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder={`Hey ${friendName.split(' ')[0]}, could I borrow your ${itemName}…`} className="input" />
      </div>
      {!sent ? (
        <button className="btn btn-primary !px-7 !py-3 !text-sm" disabled={pending} onClick={() => start(async () => {
          const r = await requestLoan({ itemId, ownerId, event, neededOn, dueBack, message, intendedPriceCents, query, title: intendedPriceCents != null ? `${itemName} (borrow instead)` : null });
          if (!r.ok) { alert(r.error); return; }
          setSent(true);
          printReceipt({ title: 'Shared receipt', subtitle: `You · ${friendName}`, lines: [{ label: 'Item', value: itemName.slice(0, 28) }, { label: 'Status', value: 'Requested' }, { label: 'Back by', value: dueBack, muted: true }], footer: 'No prices on a shared receipt', ttlMs: 5000 });
          router.push('/friends');
        })}>{pending ? 'Sending…' : 'Send request'}</button>
      ) : <div className="text-sm text-save">Request sent</div>}
      {intendedPriceCents != null && <Note>Counts as money kept once the item is handed over.</Note>}
    </div>
  );
}
