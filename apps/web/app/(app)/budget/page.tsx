import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Page, PageHeader, Card, CardTitle, Stat, StatGrid, Row, Note, Field, Progress, usd } from '@/components/ui';
import { summarizeBudget } from '@weave/shared/budget';
import { describe, investedTenYears } from '@/lib/alternatives';
import { saveBudget } from './actions';

export const dynamic = 'force-dynamic';

export default async function BudgetPage() {
  const { supabase, user } = await requireUser();
  const now = new Date(); const ym = now.toISOString().slice(0, 7);
  const days = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const [{ data: b }, { data: items }] = await Promise.all([
    supabase.from('budgets').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('items').select('price_cents,status,purchase_date').eq('user_id', user.id).gte('purchase_date', `${ym}-01`).neq('status', 'returned'),
  ]);
  const rows = (items ?? []) as Array<{ price_cents: number | null; status: string }>;
  const onYou = rows.filter((i) => i.status !== 'gifted').reduce((s, i) => s + (i.price_cents ?? 0), 0);
  const onOthers = rows.filter((i) => i.status === 'gifted').reduce((s, i) => s + (i.price_cents ?? 0), 0);
  const budget = b as { monthly_income_cents: number | null; clothing_pct: number; envelope_override_cents: number | null } | null;
  const s = summarizeBudget({ monthlyIncomeCents: budget?.monthly_income_cents ?? null, clothingPct: Number(budget?.clothing_pct ?? 5), envelopeOverrideCents: budget?.envelope_override_cents ?? null, spentThisMonthCents: onYou + onOthers, dayOfMonth: now.getUTCDate(), daysInMonth: days });
  const hasEnvelope = s.envelopeCents != null;
  // Remaining money = remaining bar. Over budget = the bar has run out.
  const remainingPct = hasEnvelope ? Math.round((s.remainingRatio ?? 0) * 100) : 100;
  const projPct = hasEnvelope && s.envelopeCents ? Math.min(140, Math.round((s.projectedCents / s.envelopeCents) * 100)) : 0;
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const instead = s.overBy > 0 ? s.overBy : onYou;

  return (
    <Page>
      <PageHeader eyebrow={monthLabel} title="This month's envelope" subtitle="Take-home pay times a share for clothes. It fills from your receipts and card automatically. Zero model calls." />

      {hasEnvelope ? (
        <>
          <StatGrid>
            <Stat value={usd(s.envelopeCents)} label="envelope" />
            <Stat value={usd(onYou)} label="spent on you" />
            <Stat value={s.overBy > 0 ? 'Ran out' : usd(s.remainingCents)} label="remaining" tone="pine" />
          </StatGrid>

          <Card>
            <CardTitle hint="Solid = what's left. The projection runs to month end at today's pace.">Remaining</CardTitle>
            <Progress pct={remainingPct} />
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-ink-3">
              <span>{s.overBy > 0 ? `Over by ${usd(s.overBy)}` : `${remainingPct}% of the envelope left`}</span>
              <span>Projected month end {usd(s.projectedCents)}{projPct > 100 ? ' · runs past the envelope' : ''}</span>
            </div>
            <div className="mt-3">
              {onOthers > 0 && <Row label="Spent on others" value={usd(onOthers)} muted />}
              <Row label="Projected month end" value={usd(s.projectedCents)} muted />
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <CardTitle>No envelope yet</CardTitle>
          <p className="text-sm text-ink-2">Set your take-home pay and Weave sets a monthly clothing envelope. It fills from your receipts and card automatically.</p>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {hasEnvelope && (s.overBy > 0 || onYou > 0) && (
          <Card>
            <CardTitle hint={s.overBy > 0 ? `The ${usd(s.overBy)} over` : `This month's ${usd(onYou)}`}>What this could be instead</CardTitle>
            {describe(instead).map((d) => <Row key={d} label={d} value="" muted />)}
            <Row label="Invested 10 years at 7%" value={usd(investedTenYears(instead))} muted />
            <Note className="mt-3">Opportunity cost, shown plainly. Not a suggestion to spend elsewhere.</Note>
          </Card>
        )}

        <Card>
          <CardTitle hint="All arithmetic, no model calls">Set the envelope</CardTitle>
          <form action={saveBudget} className="space-y-4">
            <Field label="Monthly take-home pay"><input name="income" inputMode="decimal" defaultValue={budget?.monthly_income_cents ? (budget.monthly_income_cents / 100).toFixed(0) : ''} placeholder="4200" className="input" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Share for clothes (%)"><input name="pct" type="number" min={1} max={50} step={0.5} defaultValue={budget ? Number(budget.clothing_pct) : 5} className="input" /></Field>
              <Field label="Or a flat monthly envelope" hint="Overrides the %"><input name="override" inputMode="decimal" defaultValue={budget?.envelope_override_cents ? (budget.envelope_override_cents / 100).toFixed(0) : ''} placeholder="optional" className="input" /></Field>
            </div>
            <button className="btn btn-primary" type="submit">Save</button>
          </form>
          <Note className="mt-4">With an envelope set, <Link href="/search" className="underline">search</Link> holds anything priced over what&apos;s left for 48 hours. The page never says &quot;you can still spend $X.&quot;</Note>
        </Card>
      </div>
    </Page>
  );
}
