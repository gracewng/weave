import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Page, PageHeader, Card, CardTitle, Stat, StatGrid, Row, Note, usd } from '@/components/ui';
import { buildStatement } from '@/lib/statement';

export const dynamic = 'force-dynamic';

function shiftMonth(ym: string, n: number) { const [y, m] = ym.split('-').map(Number); const d = new Date(Date.UTC(y!, m! - 1 + n, 1)); return d.toISOString().slice(0, 7); }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthName = (ym: string) => MONTHS[Number(ym.slice(5)) - 1];

export default async function StatementPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const ym = /^\d{4}-\d{2}$/.test(m ?? '') ? m! : new Date().toISOString().slice(0, 7);
  const { supabase, user } = await requireUser();
  const s = await buildStatement(supabase, user.id, ym);
  const label = `${monthName(ym)} ${ym.slice(0, 4)}`;
  const combined = s.kept.keptCents + s.kept.recoveredCents;
  const prev = shiftMonth(ym, -1); const next = shiftMonth(ym, 1);

  return (
    <Page>
      <PageHeader
        eyebrow={user.email ?? ''}
        title={`Statement · ${label}`}
        subtitle="One monthly receipt. Every headline traces to an action you confirmed."
        actions={<div className="flex gap-2"><Link href={`/statement?m=${prev}`} className="btn btn-sm btn-outline">← {monthName(prev)}</Link><Link href={`/statement?m=${next}`} className="btn btn-sm btn-outline">{monthName(next)} →</Link></div>}
      />

      <StatGrid>
        <Stat value={usd(s.kept.keptCents)} label="Money Kept*" tone="pine" valueClass={s.kept.keptCents > 0 ? 'saved' : ''} />
        <Stat value={usd(s.kept.recoveredCents)} label="Money Recovered" valueClass={s.kept.recoveredCents > 0 ? 'saved' : ''} />
        <Stat value={usd(combined)} label="kept + recovered" valueClass={combined > 0 ? 'saved' : ''} />
      </StatGrid>

      <Card>
        <CardTitle hint="Each line opens its page">Timeline</CardTitle>
        {s.timeline.length === 0 ? (
          <Note>No intentions, returns or loans this month. A quiet month is a feature.</Note>
        ) : (
          <div>
            {s.timeline.map((e, i) => (
              <Link key={i} href={e.href ?? '#'} className="row -mx-2 rounded-xl px-2 transition hover:bg-paper">
                <span className="flex min-w-0 items-baseline gap-3"><span className="shrink-0 text-xs text-ink-3">{monthName(e.date)} {e.date.slice(8)}</span><span className="truncate">{e.text}</span></span>
                <span className={`shrink-0 tabular-nums ${e.kept || e.recovered ? 'saved font-medium' : 'text-ink-3'}`}>{e.amountCents != null ? `${usd(e.amountCents)} ${e.recovered ? 'recovered' : e.kept ? 'kept*' : ''}` : ''}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardTitle hint="*Estimated against confirmed purchase intentions. Never a bank balance.">Money Kept</CardTitle>
          <Row label="Money Kept*" value={usd(s.kept.keptCents)} valueClass={s.kept.keptCents > 0 ? 'saved' : ''} />
          <Row label="Skipped / used mine" value={usd(s.kept.byOutcome.skipped)} muted sub />
          <Row label="Borrowed instead" value={usd(s.kept.byOutcome.borrowed)} muted sub />
          <Row label="Bought used" value={usd(s.kept.byOutcome.boughtUsed)} muted sub />
          <Row label="Money Recovered" value={usd(s.kept.recoveredCents)} valueClass={s.kept.recoveredCents > 0 ? 'saved' : ''} />
          {s.kept.pendingRecoveryCount > 0 && <Row label="Returns pending" value={String(s.kept.pendingRecoveryCount)} muted sub />}
          {s.kept.potentialKeptCents > 0 && <Row label="Paused, not yet kept" value={usd(s.kept.potentialKeptCents)} muted sub />}
          <Row label="Kept + recovered" value={usd(combined)} valueClass={combined > 0 ? 'saved' : ''} />
          <Note className="mt-3">Recovered counts confirmed refunds only.</Note>
        </Card>

        <Card>
          <CardTitle hint={label}>Spent</CardTitle>
          <Row label="On you" value={usd(s.spentOnYou)} />
          <Row label="On others (gifts)" value={usd(s.spentOnOthers)} muted />
          {s.budget ? (
            <>
              <Row label="Envelope" value={usd(s.budget.envelopeCents)} muted />
              <Row label="Remaining" value={s.budget.remainingCents != null ? usd(s.budget.remainingCents) : '—'} />
              <Row label="Projected month end" value={usd(s.budget.projectedCents)} muted />
            </>
          ) : <Row label="Envelope" value={<Link href="/budget" className="underline">No budget set</Link>} muted />}
        </Card>
      </div>
    </Page>
  );
}
