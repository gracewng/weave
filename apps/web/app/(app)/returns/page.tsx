import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
import { returnBoard } from '@/lib/returns';
import { ReturnActions } from './ReturnActions';

export const dynamic = 'force-dynamic';

export default async function ReturnsPage() {
  const { supabase, user } = await requireUser();
  const { open, pending, recovered } = await returnBoard(supabase, user.id);
  const atStake = open.reduce((s, r) => s + r.atStakeCents, 0);
  const recoveredCents = recovered.reduce((s, i) => s + (i.refund_cents ?? 0), 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Receipt>
        <ReceiptHeader title="Returns" subtitle="THREE DIFFERENT STATES: OPEN · PENDING · REFUNDED" />
        <ReceiptRule />
        <ReceiptLine label="RETURN WINDOWS OPEN" value={String(open.length)} />
        <ReceiptLine label="  AT STAKE" value={usd(atStake)} />
        <ReceiptLine label="RETURN PENDING" value={String(pending.length)} muted />
        <ReceiptLine label="REFUND CONFIRMED" value={`${recovered.length} · ${usd(recoveredCents)}`} valueClass={recoveredCents > 0 ? 'saved' : ''} />
        <ReceiptRule />
        <div className="mono text-[10px] text-ink-3">MONEY RECOVERED COUNTS CONFIRMED REFUNDS ONLY. A REMINDER IS NOT A RETURN; A RETURN IS NOT A REFUND.</div>
      </Receipt>

      {open.length > 0 && (
        <div className="space-y-3">
          <div className="mono text-[11px] uppercase tracking-wider text-ink-3">Open windows · soonest first</div>
          {open.map((r) => (
            <Receipt key={r.item.id}>
              <div className="flex gap-3">
                <Link href={`/wardrobe/${r.item.id}`} className="h-24 w-18 shrink-0 bg-paper-2" style={{ width: 72 }}>{r.item.image_url && <img src={r.item.image_url} alt="" className="h-full w-full object-contain" />}</Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate text-sm">{r.item.name}</div>
                    <span className={`stamp ${r.daysLeft <= 4 ? '' : 'opacity-60'}`}>{r.daysLeft === 0 ? 'LAST DAY' : `${r.daysLeft} DAY${r.daysLeft === 1 ? '' : 'S'} LEFT`}</span>
                  </div>
                  <ReceiptLine label="AT STAKE" value={usd(r.atStakeCents)} />
                  <ReceiptLine label="RETURN BY" value={`${r.item.return_by}${r.policyDays != null ? ` · ${r.item.retailer ?? ''} ${r.policyDays}-DAY POLICY` : r.item.retailer ? ` · ${r.item.retailer}` : ''}`} muted />
                  <ReceiptLine label="RECEIPT" value={r.item.receipt_url ? 'ON FILE' : r.item.source === 'email' ? 'ORDER EMAIL' : 'NOT ON FILE'} muted />
                  <ReturnActions itemId={r.item.id} name={r.item.name} priceCents={r.item.price_cents} status="owned" />
                </div>
              </div>
            </Receipt>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          <div className="mono text-[11px] uppercase tracking-wider text-ink-3">Return pending · nothing recovered yet</div>
          {pending.map((i) => (
            <Receipt key={i.id}>
              <div className="flex items-start justify-between gap-2"><div className="truncate text-sm">{i.name}</div><span className="stamp">RETURN PENDING</span></div>
              <ReceiptLine label="PAID" value={usd(i.price_cents)} />
              <ReceiptLine label="STARTED" value={(i.return_initiated_at ?? '').slice(0, 10)} muted />
              <ReturnActions itemId={i.id} name={i.name} priceCents={i.price_cents} status="returning" />
            </Receipt>
          ))}
        </div>
      )}

      {recovered.length > 0 && (
        <div className="space-y-3">
          <div className="mono text-[11px] uppercase tracking-wider text-ink-3">Refund confirmed</div>
          {recovered.map((i) => (
            <Receipt key={i.id}>
              <div className="flex items-start justify-between gap-2"><div className="truncate text-sm line-through decoration-2">{i.name}</div><span className="stamp saved">REFUND CONFIRMED</span></div>
              <ReceiptLine label="PAID" value={usd(i.price_cents)} muted />
              <ReceiptLine label="RECOVERED" value={usd(i.refund_cents)} valueClass="saved" />
              <ReceiptLine label="ON" value={(i.refunded_at ?? '').slice(0, 10)} muted />
            </Receipt>
          ))}
        </div>
      )}

      {open.length === 0 && pending.length === 0 && recovered.length === 0 && (
        <Receipt><p className="text-sm text-ink-2">No open return windows. Items you buy show up here until their window closes, sorted by days left, with the dollars at stake.</p></Receipt>
      )}
    </div>
  );
}
