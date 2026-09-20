'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { draftBorrowMessage, requestLoan } from '../actions';
import { printReceipt } from '@/lib/printer';

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
      <div className="grid grid-cols-3 gap-2">
        <label className="block col-span-3 sm:col-span-1"><div className="mono text-[10px] uppercase text-ink-3">For (event)</div><input value={event} onChange={(e) => setEvent(e.target.value)} placeholder="a wedding" className="mt-0.5 w-full border border-rule bg-paper p-1.5 text-sm" /></label>
        <label className="block"><div className="mono text-[10px] uppercase text-ink-3">Needed on</div><input type="date" value={neededOn} onChange={(e) => setNeededOn(e.target.value)} className="mono mt-0.5 w-full border border-rule bg-paper p-1.5 text-xs" /></label>
        <label className="block"><div className="mono text-[10px] uppercase text-ink-3">Back by</div><input type="date" value={dueBack} onChange={(e) => setDueBack(e.target.value)} className="mono mt-0.5 w-full border border-rule bg-paper p-1.5 text-xs" /></label>
      </div>
      <div>
        <div className="mono flex items-center justify-between text-[10px] uppercase text-ink-3"><span>Message</span><button type="button" className="hover:text-ink" disabled={pending} onClick={() => start(async () => setMessage(await draftBorrowMessage({ friendName, itemName, event, neededOn, returnBy: dueBack })))}>{pending ? 'drafting…' : 'draft one for me'}</button></div>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder={`Hey ${friendName}, could I borrow your ${itemName}…`} className="mt-0.5 w-full border border-rule bg-paper p-1.5 text-sm" />
      </div>
      {!sent ? (
        <button className="btn btn-primary" disabled={pending} onClick={() => start(async () => {
          const r = await requestLoan({ itemId, ownerId, event, neededOn, dueBack, message, intendedPriceCents, query, title: intendedPriceCents != null ? `${itemName} (borrow instead)` : null });
          if (!r.ok) { alert(r.error); return; }
          setSent(true);
          printReceipt({ title: 'Shared receipt', subtitle: `YOU · ${friendName.toUpperCase()}`, lines: [{ label: 'ITEM', value: itemName.toUpperCase().slice(0, 22) }, { label: 'STATUS', value: 'REQUESTED' }, { label: 'BACK BY', value: dueBack, muted: true }], footer: 'NO PRICES ON A SHARED RECEIPT', ttlMs: 5000 });
          router.push('/friends');
        })}>{pending ? 'Sending…' : 'Send request'}</button>
      ) : <div className="mono text-[11px] text-save">REQUEST SENT</div>}
      <div className="mono text-[10px] text-ink-3">{intendedPriceCents != null ? 'KEPT MONEY COUNTS ONCE HANDED OVER.' : 'PENDING UNTIL ACCEPTED.'}</div>
    </div>
  );
}
