import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
import { buildStatement } from '@/lib/statement';

export const dynamic = 'force-dynamic';

function shiftMonth(ym: string, n: number) { const [y, m] = ym.split('-').map(Number); const d = new Date(Date.UTC(y!, m! - 1 + n, 1)); return d.toISOString().slice(0, 7); }
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export default async function StatementPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const ym = /^\d{4}-\d{2}$/.test(m ?? '') ? m! : new Date().toISOString().slice(0, 7);
  const { supabase, user } = await requireUser();
  const s = await buildStatement(supabase, user.id, ym);
  const label = `${MONTHS[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)}`;
  const combined = s.kept.keptCents + s.kept.recoveredCents;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="mono flex items-center justify-center gap-6 text-[11px] uppercase text-ink-3">
        <Link href={`/statement?m=${shiftMonth(ym, -1)}`} className="hover:text-ink">← {MONTHS[Number(shiftMonth(ym, -1).slice(5)) - 1]}</Link>
        <span className="text-ink">{label}</span>
        <Link href={`/statement?m=${shiftMonth(ym, 1)}`} className="hover:text-ink">{MONTHS[Number(shiftMonth(ym, 1).slice(5)) - 1]} →</Link>
      </div>

      <Receipt print>
        <ReceiptHeader title="Statement" subtitle={`${label} · ${(user.email ?? '').toUpperCase()}`} />
        <ReceiptRule />
        {s.timeline.length === 0 ? (
          <div className="mono text-[11px] text-ink-3">NO INTENTIONS, RETURNS OR LOANS THIS MONTH. A QUIET MONTH IS A FEATURE.</div>
        ) : (
          <div className="space-y-1">
            {s.timeline.map((e, i) => (
              <Link key={i} href={e.href ?? '#'} className="leader block text-[12px] hover:bg-paper">
                <span className="l text-ink-3">{MONTHS[Number(e.date.slice(5, 7)) - 1]} {e.date.slice(8)}</span>
                <span className="l ml-2 truncate">{e.text}</span>
                <span className="dots" />
                <span className={`v ${e.kept || e.recovered ? 'saved' : 'text-ink-3'}`}>{e.amountCents != null ? `${usd(e.amountCents)} ${e.recovered ? 'recovered' : e.kept ? 'kept*' : ''}` : ''}</span>
              </Link>
            ))}
          </div>
        )}
        <ReceiptRule />
        <ReceiptLine label="MONEY KEPT*" value={usd(s.kept.keptCents)} valueClass={s.kept.keptCents > 0 ? 'saved' : ''} />
        <ReceiptLine label="  SKIPPED / USED MINE" value={usd(s.kept.byOutcome.skipped)} muted />
        <ReceiptLine label="  BORROWED INSTEAD" value={usd(s.kept.byOutcome.borrowed)} muted />
        <ReceiptLine label="  BOUGHT USED" value={usd(s.kept.byOutcome.boughtUsed)} muted />
        <ReceiptLine label="MONEY RECOVERED" value={usd(s.kept.recoveredCents)} valueClass={s.kept.recoveredCents > 0 ? 'saved' : ''} />
        {s.kept.pendingRecoveryCount > 0 && <ReceiptLine label="  RETURNS PENDING" value={String(s.kept.pendingRecoveryCount)} muted />}
        {s.kept.potentialKeptCents > 0 && <ReceiptLine label="  PAUSED, NOT YET KEPT" value={usd(s.kept.potentialKeptCents)} muted />}
        <ReceiptRule />
        <ReceiptLine label="KEPT + RECOVERED" value={usd(combined)} valueClass={combined > 0 ? 'saved' : ''} />
        <div className="mono mt-2 text-[10px] text-ink-3">*ESTIMATED AGAINST CONFIRMED PURCHASE INTENTIONS. NEVER A BANK BALANCE. RECOVERED = CONFIRMED REFUNDS ONLY.</div>
      </Receipt>

      <Receipt>
        <ReceiptHeader title="Spent" subtitle={label} />
        <ReceiptRule />
        <ReceiptLine label="ON YOU" value={usd(s.spentOnYou)} />
        <ReceiptLine label="ON OTHERS (GIFTS)" value={usd(s.spentOnOthers)} muted />
        {s.budget ? (
          <>
            <ReceiptLine label="ENVELOPE" value={usd(s.budget.envelopeCents)} muted />
            <ReceiptLine label="REMAINING" value={s.budget.remainingCents != null ? usd(s.budget.remainingCents) : '—'} />
            <ReceiptLine label="PROJECTED MONTH END" value={usd(s.budget.projectedCents)} muted />
          </>
        ) : <ReceiptLine label="ENVELOPE" value={<Link href="/budget" className="underline">no budget set</Link>} muted />}
      </Receipt>

    </div>
  );
}
