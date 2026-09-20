import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Hold, Item, Loan } from '@weave/shared/types';
import { summarizeKept } from '@weave/shared/kept';
import { summarizeBudget } from '@weave/shared/budget';

export interface TimelineEvent { date: string; kind: 'hold' | 'skipped' | 'borrowed' | 'bought_used' | 'bought' | 'released' | 'returning' | 'returned' | 'loan'; text: string; amountCents: number | null; kept: boolean; recovered: boolean; href?: string }

export function monthRange(ym: string) { const [y, m] = ym.split('-').map(Number); const start = `${ym}-01`; const end = new Date(Date.UTC(y!, m!, 0)).toISOString().slice(0, 10); return { start, end, days: Number(end.slice(8)) }; }

export async function buildStatement(supabase: SupabaseClient, userId: string, ym: string) {
  const { start, end, days } = monthRange(ym);
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: items }, { data: holds }, { data: loans }, { data: budget }] = await Promise.all([
    supabase.from('items').select('*').eq('user_id', userId),
    supabase.from('holds').select('*').eq('user_id', userId),
    supabase.from('loans').select('*').or(`owner_id.eq.${userId},borrower_id.eq.${userId}`),
    supabase.from('budgets').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  const all = (items ?? []) as Item[]; const H = (holds ?? []) as Hold[]; const L = (loans ?? []) as Loan[];
  const inMonth = (d: string | null | undefined) => !!d && d.slice(0, 10) >= start && d.slice(0, 10) <= end;

  // Spend: purchases dated this month. Gifts count as spend on others.
  const bought = all.filter((i) => inMonth(i.purchase_date) && i.status !== 'returned');
  const spentOnYou = bought.filter((i) => i.status !== 'gifted').reduce((s, i) => s + (i.price_cents ?? 0), 0);
  const spentOnOthers = bought.filter((i) => i.status === 'gifted').reduce((s, i) => s + (i.price_cents ?? 0), 0);

  // Money Kept / Recovered this month (confirmed only)
  const monthHolds = H.filter((h) => inMonth(h.outcome_confirmed_at) || (h.status === 'held' && inMonth(h.created_at)));
  const monthReturns = all.filter((i) => (i.status === 'returned' && inMonth(i.refunded_at)) || (i.status === 'returning' && inMonth(i.return_initiated_at)));
  const kept = summarizeKept({
    holds: monthHolds.map((h) => ({ id: h.id, status: h.status, priceCents: h.price_cents > 0 ? h.price_cents : null, actualPaidCents: h.actual_paid_cents, outcomeConfirmedAt: h.outcome_confirmed_at })),
    returns: monthReturns.map((i) => ({ itemId: i.id, status: i.status as 'returning' | 'returned', refundCents: i.refund_cents })),
  });

  // Timeline
  const ev: TimelineEvent[] = [];
  const usd = (c: number | null) => (c == null ? '' : `$${(c / 100).toFixed(0)}`);
  for (const h of monthHolds) {
    const d = (h.outcome_confirmed_at ?? h.created_at).slice(0, 10);
    const want = h.price_cents > 0 ? `Wanted a ${usd(h.price_cents)} ${h.title}` : `Wanted ${h.title}`;
    if (h.status === 'held') ev.push({ date: d, kind: 'hold', text: `${want} → paused`, amountCents: h.price_cents || null, kept: false, recovered: false, href: '/ghosts' });
    else if (h.status === 'skipped') ev.push({ date: d, kind: 'skipped', text: `${want} → ${h.note === 'used mine' ? 'used mine' : 'skipped'}`, amountCents: h.kept_cents, kept: true, recovered: false, href: '/ghosts' });
    else if (h.status === 'borrowed') ev.push({ date: d, kind: 'borrowed', text: `${want} → borrowed instead`, amountCents: h.kept_cents, kept: true, recovered: false, href: '/friends' });
    else if (h.status === 'bought_used') ev.push({ date: d, kind: 'bought_used', text: `${want} → paid ${usd(h.actual_paid_cents)} used`, amountCents: h.kept_cents, kept: true, recovered: false, href: '/ghosts' });
    else if (h.status === 'bought') ev.push({ date: d, kind: 'bought', text: `${want} → bought anyway`, amountCents: null, kept: false, recovered: false, href: '/ghosts' });
    else ev.push({ date: d, kind: 'released', text: `${want} → expired, unanswered`, amountCents: null, kept: false, recovered: false, href: '/ghosts' });
  }
  for (const i of monthReturns) {
    if (i.status === 'returned') ev.push({ date: (i.refunded_at ?? '').slice(0, 10), kind: 'returned', text: `Returned ${i.name} → refund confirmed`, amountCents: i.refund_cents, kept: false, recovered: true, href: '/wardrobe' });
    else ev.push({ date: (i.return_initiated_at ?? '').slice(0, 10), kind: 'returning', text: `Returning ${i.name} → pending`, amountCents: null, kept: false, recovered: false, href: '/wardrobe' });
  }
  for (const l of L.filter((l) => l.owner_id === userId && ['out', 'returned'].includes(l.status) && inMonth(l.updated_at))) {
    ev.push({ date: l.updated_at.slice(0, 10), kind: 'loan', text: `Lent an item to a friend${l.event_name ? ` for ${l.event_name}` : ''}`, amountCents: null, kept: false, recovered: false, href: '/friends' });
  }
  ev.sort((a, b) => b.date.localeCompare(a.date));

  const owned = all.filter((i) => i.status === 'owned');

  const b = budget as { monthly_income_cents: number | null; clothing_pct: number; envelope_override_cents: number | null } | null;
  const now = new Date(); const isCurrent = ym === today.slice(0, 7);
  const bud = b ? summarizeBudget({ monthlyIncomeCents: b.monthly_income_cents, clothingPct: Number(b.clothing_pct), envelopeOverrideCents: b.envelope_override_cents, spentThisMonthCents: spentOnYou + spentOnOthers, dayOfMonth: isCurrent ? now.getUTCDate() : days, daysInMonth: days }) : null;

  return { ym, start, end, spentOnYou, spentOnOthers, kept, timeline: ev, budget: bud, ownedCount: owned.length };
}
