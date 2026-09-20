import { Card, CardTitle, Field, Row, Note, Progress, usd } from '@/components/ui';
import { summarizeBudget } from '@weave/shared/budget';
import { describeAlternatives } from '@weave/data';
import { saveBudget } from '@/app/(app)/budget/actions';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Envelope from income, live spend, and a plain pace for the rest of the month. Zero model calls. */
export async function BudgetSection({ supabase, userId }: { supabase: SupabaseClient; userId: string }) {
  const now = new Date(); const ym = now.toISOString().slice(0, 7);
  const days = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const [{ data: b }, { data: items }] = await Promise.all([
    supabase.from('budgets').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('items').select('price_cents,status').eq('user_id', userId).gte('purchase_date', `${ym}-01`).neq('status', 'returned'),
  ]);
  const rows = (items ?? []) as Array<{ price_cents: number | null; status: string }>;
  const spent = rows.reduce((s, i) => s + (i.price_cents ?? 0), 0);
  const budget = b as { monthly_income_cents: number | null; clothing_pct: number; envelope_override_cents: number | null } | null;
  const s = summarizeBudget({ monthlyIncomeCents: budget?.monthly_income_cents ?? null, clothingPct: Number(budget?.clothing_pct ?? 5), envelopeOverrideCents: budget?.envelope_override_cents ?? null, spentThisMonthCents: spent, dayOfMonth: now.getUTCDate(), daysInMonth: days });
  const daysLeft = Math.max(1, days - now.getUTCDate() + 1);
  const weeksLeft = Math.max(1, Math.round(daysLeft / 7));
  const has = s.envelopeCents != null;
  const month = now.toLocaleDateString('en-US', { month: 'long' });
  const remainingPct = has ? Math.round((s.remainingRatio ?? 0) * 100) : 0;

  return (
    <Card className="scroll-mt-6" >
      <div id="budget" />
      <CardTitle hint={has ? `Take-home pay × your clothes share. Fills from receipts and card automatically.` : 'Set take-home pay and Weave sets a monthly clothing envelope.'}>Budget · {month}</CardTitle>

      {has && (
        <div className="mb-4">
          <div className="flex items-baseline justify-between">
            <div className="display text-3xl font-semibold text-pine">{s.overBy > 0 ? 'Ran out' : usd(s.remainingCents)}</div>
            <div className="text-xs text-ink-3">{s.overBy > 0 ? `over by ${usd(s.overBy)}` : `left of ${usd(s.envelopeCents)}`}</div>
          </div>
          <Progress pct={remainingPct} className="mt-2" />
          <div className="mt-3">
            <Row label="Spent so far" value={usd(spent)} />
            {s.overBy === 0 && s.remainingCents != null && s.remainingCents > 0 && <Row label={`Pace for the ${daysLeft} days left`} value={`${usd(Math.round(s.remainingCents / weeksLeft))} / week`} muted />}
            <Row label="Projected month end" value={usd(s.projectedCents)} muted />
          </div>
          {spent > 0 && <Note className="mt-2">{usd(s.overBy > 0 ? s.overBy : spent)} is {describeAlternatives(s.overBy > 0 ? s.overBy : spent, 2).join(', or ')}.</Note>}
        </div>
      )}

      <form action={saveBudget} className="grid grid-cols-3 gap-3">
        <Field label="Take-home / mo"><input name="income" inputMode="decimal" defaultValue={budget?.monthly_income_cents ? (budget.monthly_income_cents / 100).toFixed(0) : ''} placeholder="4200" className="input" /></Field>
        <Field label="Clothes %"><input name="pct" type="number" min={1} max={50} step={0.5} defaultValue={budget ? Number(budget.clothing_pct) : 5} className="input" /></Field>
        <Field label="Or a flat $" hint="Overrides the %"><input name="override" inputMode="decimal" defaultValue={budget?.envelope_override_cents ? (budget.envelope_override_cents / 100).toFixed(0) : ''} placeholder="optional" className="input" /></Field>
        <div className="col-span-3"><button className="btn btn-sm" type="submit">Save budget</button></div>
      </form>
    </Card>
  );
}
