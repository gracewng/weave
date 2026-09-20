import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
import { summarizeKept } from '@weave/shared/kept';
import type { Hold } from '@weave/shared/types';
import { GhostActions } from './GhostActions';

export const dynamic = 'force-dynamic';

const OUTCOME: Record<string, string> = { skipped: 'VOIDED', borrowed: 'BORROWED INSTEAD', bought_used: 'BOUGHT USED', bought: 'BOUGHT ANYWAY', released: 'EXPIRED, UNANSWERED', held: 'PAUSED' };

export default async function GhostsPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from('holds').select('*').order('created_at', { ascending: false });
  const holds = (data ?? []) as Hold[];
  const pending = holds.filter((h) => h.status === 'held');
  const done = holds.filter((h) => h.status !== 'held');
  const kept = summarizeKept({ holds: holds.map((h) => ({ id: h.id, status: h.status, priceCents: h.price_cents > 0 ? h.price_cents : null, actualPaidCents: h.actual_paid_cents, outcomeConfirmedAt: h.outcome_confirmed_at })), returns: [] });
  const now = Date.now();

  if (holds.length === 0) {
    return (
      <Receipt className="mx-auto max-w-lg">
        <ReceiptHeader title="The clothes you almost owned" subtitle="NOTHING PRINTED YET" />
        <ReceiptRule />
        <ReceiptLine label="PENDING (HELD)" value="0" muted /><ReceiptLine label="CONFIRMED OUTCOMES" value="0" muted /><ReceiptLine label="ESTIMATED MONEY KEPT*" value="$0.00" muted />
        <ReceiptRule />
        <p className="text-sm text-ink-2">Every purchase you pause or skip from <Link href="/search" className="underline">search</Link> prints a stub here with the intended price, what stood in for it, and the outcome.</p>
        <p className="mono mt-3 text-[11px] text-ink-3">*Estimated against confirmed purchase intentions. Never a bank balance.</p>
      </Receipt>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Receipt>
        <ReceiptHeader title="The clothes you almost owned" subtitle={`${holds.length} INTENTIONS`} />
        <ReceiptRule />
        <ReceiptLine label="PENDING (HELD)" value={String(pending.length)} muted />
        <ReceiptLine label="POTENTIAL, NOT YET KEPT" value={usd(kept.potentialKeptCents)} muted />
        <ReceiptLine label="CONFIRMED OUTCOMES" value={String(kept.actionsCount)} />
        <ReceiptLine label="  SKIPPED / WORE MINE" value={usd(kept.byOutcome.skipped)} />
        <ReceiptLine label="  BORROWED INSTEAD" value={usd(kept.byOutcome.borrowed)} />
        <ReceiptLine label="  BOUGHT USED" value={usd(kept.byOutcome.boughtUsed)} />
        {kept.unpricedActions > 0 && <ReceiptLine label="  WITHOUT A PRICE (NOT COUNTED)" value={String(kept.unpricedActions)} muted />}
        <ReceiptRule />
        <ReceiptLine label="ESTIMATED MONEY KEPT*" value={usd(kept.keptCents)} valueClass="saved" />
        <div className="mono mt-2 text-[10px] text-ink-3">*ESTIMATED AGAINST CONFIRMED PURCHASE INTENTIONS. NEVER A BANK BALANCE.</div>
      </Receipt>

      {pending.length > 0 && (
        <div className="space-y-3">
          <div className="mono text-[11px] uppercase tracking-wider text-ink-3">Paused · waiting on you</div>
          {pending.map((h) => {
            const hrs = h.release_at ? Math.round((new Date(h.release_at).getTime() - now) / 3600000) : null;
            return (
              <Receipt key={h.id}>
                <div className="flex gap-3">
                  {h.image_url && <div className="h-20 w-16 shrink-0 bg-paper-2 opacity-60"><img src={h.image_url} alt="" className="h-full w-full object-contain" /></div>}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{h.title}{h.for_other && <span className="stamp ml-2">FOR SOMEONE ELSE</span>}</div>
                    <ReceiptLine label="INTENDED" value={h.price_cents > 0 ? usd(h.price_cents) : 'NO PRICE'} />
                    <ReceiptLine label="NEXT CHECK" value={hrs == null ? '—' : hrs <= 0 ? 'NOW' : `IN ${hrs}H`} muted />
                    <ReceiptLine label="POTENTIAL KEPT" value={h.price_cents > 0 ? usd(h.price_cents) : '—'} muted />
                    {h.loan_id ? <div className="mono mt-2 text-[10px] text-ink-3">WAITING ON THE LOAN · <Link href="/friends" className="underline">FRIENDS</Link> · CREDITED WHEN THE ITEM IS HANDED OVER</div> : <GhostActions id={h.id} priceCents={h.price_cents} />}
                  </div>
                </div>
              </Receipt>
            );
          })}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-3">
          <div className="mono text-[11px] uppercase tracking-wider text-ink-3">Stubs · confirmed outcomes</div>
          {done.map((h) => (
            <Receipt key={h.id} className={h.status === 'bought' ? 'opacity-70' : ''}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm"><span className={h.status === 'skipped' || h.status === 'borrowed' ? 'line-through decoration-2' : ''}>{h.title}</span>{h.for_other && <span className="stamp ml-2">FOR SOMEONE ELSE</span>}</div>
                  <div className="mono text-[10px] text-ink-3">{h.created_at.slice(0, 10)} · {h.query ?? ''}{h.note ? ` · ${h.note.toUpperCase()}` : ''}</div>
                </div>
                <span className={`stamp ${h.kept_cents > 0 ? 'saved' : ''}`}>{OUTCOME[h.status] ?? h.status.toUpperCase()}</span>
              </div>
              <ReceiptRule />
              <ReceiptLine label="INTENDED" value={h.price_cents > 0 ? usd(h.price_cents) : 'NO PRICE'} />
              {h.actual_paid_cents != null && <ReceiptLine label="PAID" value={usd(h.actual_paid_cents)} />}
              {h.status !== 'bought' && <ReceiptLine label="MONEY KEPT" value={h.price_cents > 0 ? usd(h.kept_cents) : 'NOT COUNTED'} valueClass={h.kept_cents > 0 ? 'saved' : ''} />}
              {h.status === 'bought' && <ReceiptLine label="COST PER WEAR" value={`${usd(h.price_cents)} / 0 WEARS`} muted />}
            </Receipt>
          ))}
        </div>
      )}
    </div>
  );
}
