import Link from 'next/link';
import { ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
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
  return (
    <div id="budget">
      <div className="mono mb-1 text-xs uppercase text-ink-3">Budget · {now.toLocaleDateString('en-US', { month: 'long' })}</div>
      {has ? (
        <>
          <ReceiptLine label="ENVELOPE" value={usd(s.envelopeCents)} muted />
          <ReceiptLine label="SPENT" value={usd(spent)} />
          <ReceiptLine label="LEFT" value={s.overBy > 0 ? `OVER BY ${usd(s.overBy)}` : usd(s.remainingCents)} />
          {s.overBy === 0 && s.remainingCents != null && s.remainingCents > 0 && <ReceiptLine label={`PACE FOR THE ${daysLeft} DAYS LEFT`} value={`${usd(Math.round(s.remainingCents / weeksLeft))} / WEEK`} muted />}
          <ReceiptLine label="PROJECTED MONTH END" value={usd(s.projectedCents)} muted />
          {spent > 0 && <div className="mono mt-1 text-[10px] text-ink-3">{usd(s.overBy > 0 ? s.overBy : spent)} = {describeAlternatives(s.overBy > 0 ? s.overBy : spent, 2).join(' · ').toUpperCase()}</div>}
        </>
      ) : <div className="mono text-[10px] text-ink-3">NO ENVELOPE YET. ENTER TAKE-HOME PAY BELOW.</div>}
      <form action={saveBudget} className="mt-3 grid grid-cols-3 gap-2">
        <label className="block"><div className="mono text-[10px] uppercase text-ink-3">Take-home / mo</div><input name="income" inputMode="decimal" defaultValue={budget?.monthly_income_cents ? (budget.monthly_income_cents / 100).toFixed(0) : ''} placeholder="4200" className="input mt-0.5 " /></label>
        <label className="block"><div className="mono text-[10px] uppercase text-ink-3">Clothes %</div><input name="pct" type="number" min={1} max={50} step={0.5} defaultValue={budget ? Number(budget.clothing_pct) : 5} className="input mt-0.5 " /></label>
        <label className="block"><div className="mono text-[10px] uppercase text-ink-3">Or flat $</div><input name="override" inputMode="decimal" defaultValue={budget?.envelope_override_cents ? (budget.envelope_override_cents / 100).toFixed(0) : ''} placeholder="optional" className="input mt-0.5 " /></label>
        <div className="col-span-3"><button className="btn !py-1 !text-[10px]" type="submit">Save budget</button></div>
      </form>
      <ReceiptRule />
      <div className="mono flex flex-wrap gap-x-4 gap-y-1 text-[10px] uppercase text-ink-3">
        <Link href="/statement" className="underline hover:text-ink">Monthly statement</Link>
        <Link href="/returns" className="underline hover:text-ink">Returns</Link>
        <Link href="/stats" className="underline hover:text-ink">AI spend</Link>
      </div>
    </div>
  );
}
