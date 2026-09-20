import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
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
  // The envelope is paper: remaining money = remaining paper. Over budget = the paper has run out.
  const paperPct = hasEnvelope ? Math.round((s.remainingRatio ?? 0) * 100) : 100;
  const projPct = hasEnvelope && s.envelopeCents ? Math.min(140, Math.round((s.projectedCents / s.envelopeCents) * 100)) : 0;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Receipt>
        <ReceiptHeader title="This month's envelope" subtitle={now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()} />
        <ReceiptRule />
        {hasEnvelope ? (
          <>
            <ReceiptLine label="ENVELOPE" value={usd(s.envelopeCents)} />
            <ReceiptLine label="SPENT ON YOU" value={usd(onYou)} />
            {onOthers > 0 && <ReceiptLine label="SPENT ON OTHERS" value={usd(onOthers)} muted />}
            <ReceiptLine label="LEFT" value={s.overBy > 0 ? 'RAN OUT' : usd(s.remainingCents)} />
            <ReceiptLine label="PROJECTED MONTH END" value={usd(s.projectedCents)} muted />
            {/* the envelope as a strip of paper */}
            <div className="mt-3">
              <div className="relative h-6 w-full border border-rule bg-paper">
                <div className="absolute inset-y-0 left-0 bg-paper-2" style={{ width: `${paperPct}%`, borderRight: paperPct > 0 && paperPct < 100 ? '1px dashed var(--ink-3)' : 'none' }} />
                {projPct > 0 && <div className="absolute inset-y-0 left-0 border-r-2 border-dotted border-ink-3" style={{ width: `${Math.min(100, projPct)}%` }} title="projected" />}
                <div className="mono absolute inset-0 flex items-center justify-center text-[10px] text-ink-3">{s.overBy > 0 ? `OVER BY ${usd(s.overBy)}` : `${paperPct}% LEFT`}</div>
              </div>
              <div className="mono mt-1 text-[9px] text-ink-3">SOLID = LEFT · DOTTED = PROJECTED</div>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-2">Enter take-home pay to get a monthly clothing envelope.</p>
        )}
      </Receipt>

      {hasEnvelope && (s.overBy > 0 || onYou > 0) && (
        <Receipt>
          <ReceiptHeader title="What this could be instead" subtitle={s.overBy > 0 ? `THE ${usd(s.overBy)} OVER` : `THIS MONTH'S ${usd(onYou)}`} />
          <ReceiptRule />
          {describe(s.overBy > 0 ? s.overBy : onYou).map((d) => <ReceiptLine key={d} label={d.toUpperCase()} value="" muted />)}
          <ReceiptLine label="INVESTED 10 YEARS AT 7%" value={usd(investedTenYears(s.overBy > 0 ? s.overBy : onYou))} muted />
        </Receipt>
      )}

      <Receipt>
        <ReceiptHeader title="Set the envelope" />
        <ReceiptRule />
        <form action={saveBudget} className="space-y-3">
          <label className="block"><div className="mono text-[10px] uppercase text-ink-3">Take-home pay / month</div><input name="income" inputMode="decimal" defaultValue={budget?.monthly_income_cents ? (budget.monthly_income_cents / 100).toFixed(0) : ''} placeholder="4200" className="mono mt-0.5 w-full border border-rule bg-paper p-2 text-sm" /></label>
          <label className="block"><div className="mono text-[10px] uppercase text-ink-3">Clothes share (%)</div><input name="pct" type="number" min={1} max={50} step={0.5} defaultValue={budget ? Number(budget.clothing_pct) : 5} className="mono mt-0.5 w-32 border border-rule bg-paper p-2 text-sm" /></label>
          <label className="block"><div className="mono text-[10px] uppercase text-ink-3">Or a flat envelope</div><input name="override" inputMode="decimal" defaultValue={budget?.envelope_override_cents ? (budget.envelope_override_cents / 100).toFixed(0) : ''} placeholder="optional" className="mono mt-0.5 w-40 border border-rule bg-paper p-2 text-sm" /></label>
          <button className="btn btn-primary" type="submit">Save</button>
        </form>
        <ReceiptRule />
        <div className="mono text-[10px] text-ink-3"><Link href="/search" className="underline">SEARCH</Link> HOLDS ANYTHING OVER WHAT&apos;S LEFT FOR 48H.</div>
      </Receipt>
    </div>
  );
}
