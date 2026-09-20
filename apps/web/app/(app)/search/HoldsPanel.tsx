import Link from 'next/link';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
import { summarizeKept } from '@weave/shared/kept';
import type { Hold } from '@weave/shared/types';
import { GhostActions } from '@/app/(app)/ghosts/GhostActions';

const OUTCOME: Record<string, string> = { skipped: 'VOIDED', borrowed: 'BORROWED', bought_used: 'BOUGHT USED', bought: 'BOUGHT', released: 'EXPIRED', held: 'PAUSED' };

/** Compact Ghost Rack under the search bar: pending decisions first, then the latest stubs. */
export function HoldsPanel({ holds }: { holds: Hold[] }) {
  const pending = holds.filter((h) => h.status === 'held');
  const done = holds.filter((h) => h.status !== 'held').slice(0, 5);
  const kept = summarizeKept({ holds: holds.map((h) => ({ id: h.id, status: h.status, priceCents: h.price_cents > 0 ? h.price_cents : null, actualPaidCents: h.actual_paid_cents, outcomeConfirmedAt: h.outcome_confirmed_at })), returns: [] });
  return (
    <Receipt>
      <ReceiptHeader title="Almost bought" subtitle={`${pending.length} PAUSED · ${usd(kept.keptCents)} KEPT*`} />
      <ReceiptRule />
      {pending.map((h) => (
        <div key={h.id} className="border-b border-dashed border-rule py-2 last:border-0">
          <div className="flex items-start justify-between gap-2"><div className="truncate text-sm">{h.title}</div><span className="mono text-sm">{h.price_cents > 0 ? usd(h.price_cents) : ''}</span></div>
          {h.loan_id ? <div className="mono mt-1 text-[10px] text-ink-3">WAITING ON THE <Link href="/friends" className="underline">LOAN</Link></div> : <GhostActions id={h.id} priceCents={h.price_cents} />}
        </div>
      ))}
      {done.map((h) => (
        <ReceiptLine key={h.id} label={<span className={h.status === 'skipped' || h.status === 'borrowed' ? 'line-through' : ''}>{h.title.slice(0, 30)}</span>} value={`${OUTCOME[h.status] ?? h.status}${h.kept_cents > 0 ? ` · ${usd(h.kept_cents)}` : ''}`} valueClass={h.kept_cents > 0 ? 'saved' : ''} muted />
      ))}
      <ReceiptRule />
      <div className="mono flex justify-between text-[10px] text-ink-3"><span>*ESTIMATE FROM CONFIRMED DECISIONS</span><Link href="/ghosts" className="underline">ALL STUBS</Link></div>
    </Receipt>
  );
}
