import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth';
import { summarizeKept } from '@weave/shared/kept';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule } from '@/components/Receipt';
import { TASKS, MODELS } from '@weave/shared/models';
import type { LlmCallRow } from '@weave/shared/types';

export const dynamic = 'force-dynamic';

function money(n: number) { return `$${n.toFixed(4)}`; }

export default async function StatsPage() {
  const { supabase, user } = await requireUser();
  const admin = createAdminClient();
  const [{ data }, { data: holds }, { data: refunds }] = await Promise.all([
    admin ? admin.from('llm_calls').select('*').order('created_at', { ascending: false }).limit(5000) : Promise.resolve({ data: [] as LlmCallRow[] }),
    supabase.from('holds').select('id,status,price_cents,actual_paid_cents,outcome_confirmed_at').eq('user_id', user.id),
    supabase.from('items').select('id,status,refund_cents').eq('user_id', user.id).in('status', ['returning', 'returned']),
  ]);
  const rows = (data ?? []) as LlmCallRow[];
  const mine = rows.filter((r) => r.user_id === user.id);
  const myCost = mine.reduce((s, r) => s + Number(r.cost_usd), 0);
  const kept = summarizeKept({
    holds: ((holds ?? []) as Array<{ id: string; status: string; price_cents: number; actual_paid_cents: number | null; outcome_confirmed_at: string | null }>).map((h) => ({ id: h.id, status: h.status as never, priceCents: h.price_cents > 0 ? h.price_cents : null, actualPaidCents: h.actual_paid_cents, outcomeConfirmedAt: h.outcome_confirmed_at })),
    returns: ((refunds ?? []) as Array<{ id: string; status: string; refund_cents: number | null }>).map((r) => ({ itemId: r.id, status: r.status as 'returning' | 'returned', refundCents: r.refund_cents })),
  });
  const emails = mine.filter((r) => r.task === 'extract_email'); const searches = mine.filter((r) => r.task === 'parse_query');
  const liveCalls = rows.filter((r) => r.provider !== 'fixture').length;

  const totalCost = rows.reduce((s, r) => s + Number(r.cost_usd), 0);
  const totalIn = rows.reduce((s, r) => s + r.input_tokens, 0);
  const totalOut = rows.reduce((s, r) => s + r.output_tokens, 0);
  const totalCached = rows.reduce((s, r) => s + r.cached_tokens, 0);
  const fallbacks = rows.filter((r) => r.fell_back).length;
  const cacheRate = totalIn ? (totalCached / totalIn) * 100 : 0;

  const byTask = new Map<string, { calls: number; cost: number; in: number; out: number; cached: number }>();
  for (const r of rows) {
    const key = `${r.task} · ${r.provider}`;
    const e = byTask.get(key) ?? { calls: 0, cost: 0, in: 0, out: 0, cached: 0 };
    e.calls++; e.cost += Number(r.cost_usd); e.in += r.input_tokens; e.out += r.output_tokens; e.cached += r.cached_tokens;
    byTask.set(key, e);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Receipt>
        <ReceiptHeader title="AI spend" subtitle={`${rows.length} CALLS · LIVE FROM llm_calls`} />
        <ReceiptRule />
        <ReceiptLine label="INPUT TOKENS" value={totalIn.toLocaleString()} />
        <ReceiptLine label="OUTPUT TOKENS" value={totalOut.toLocaleString()} />
        <ReceiptLine label="CACHED TOKENS" value={totalCached.toLocaleString()} />
        <ReceiptLine label="CACHE HIT RATE" value={`${cacheRate.toFixed(1)}%`} />
        <ReceiptLine label="FALLBACKS" value={String(fallbacks)} />
        <ReceiptRule />
        <ReceiptLine label="AI SPEND (ALL USERS)" value={money(totalCost)} />
        <ReceiptLine label="YOUR AI SPEND" value={money(myCost)} muted />
        <ReceiptLine label="  PER EMAIL EXTRACTED" value={emails.length ? money(emails.reduce((s, r) => s + Number(r.cost_usd), 0) / emails.length) : 'N/A'} muted />
        <ReceiptLine label="  PER SEARCH" value={searches.length ? money(mine.filter((r) => ['parse_query', 'search_note', 'embed'].includes(r.task)).reduce((s, r) => s + Number(r.cost_usd), 0) / searches.length) : 'N/A'} muted />
        <ReceiptRule />
        <ReceiptLine label="YOUR MONEY KEPT (CONFIRMED)" value={`$${(kept.keptCents / 100).toFixed(2)}`} valueClass={kept.keptCents > 0 ? 'saved' : ''} />
        <ReceiptLine label="YOUR MONEY RECOVERED" value={`$${(kept.recoveredCents / 100).toFixed(2)}`} valueClass={kept.recoveredCents > 0 ? 'saved' : ''} />
        <ReceiptLine label="KEPT PER $1 OF AI" value={myCost > 0 && kept.keptCents > 0 ? `$${(kept.keptCents / 100 / myCost).toFixed(0)}` : 'N/A'} valueClass="saved" />
        <ReceiptLine label="MODE" value={liveCalls > 0 ? `live · ${liveCalls} real calls` : 'fixture / no calls'} muted />
        <ReceiptRule />
        <div className="mono text-[11px] text-ink-3">Confirmed outcomes only. N/A at zero.</div>
      </Receipt>

      <Receipt>
        <ReceiptHeader title="By task" />
        <ReceiptRule />
        {byTask.size === 0 && <div className="mono text-xs text-ink-3">No calls yet.</div>}
        {[...byTask.entries()].map(([k, v]) => (
          <ReceiptLine key={k} label={k} value={`${v.calls}× · ${v.in + v.out} tok · ${v.cached} cached · ${money(v.cost)}`} />
        ))}
      </Receipt>

      <Receipt>
        <ReceiptHeader title="Routing" subtitle={`META ${MODELS.meta.chat} · OPENAI ${MODELS.openai.chat} · EMBED ${MODELS.openai.embed}`} />
        <ReceiptRule />
        {Object.entries(TASKS).map(([task, cfg]) => (
          <ReceiptLine key={task} label={task} value={`${cfg.provider}${cfg.reasoningEffort ? ` · ${cfg.reasoningEffort}` : ''}${cfg.batchSize ? ` · batch ${cfg.batchSize}` : ''}`} muted />
        ))}
        <ReceiptRule />
        <ul className="mono list-disc space-y-1 pl-4 text-[11px] text-ink-3">
          <li>Allowlist before any model call</li>
          <li>Emails stripped to ~6k chars</li>
          <li>Minimal reasoning for extraction</li>
          <li>Tagging batched 20/call; cache-friendly prompts</li>
          <li>Embed once; verdicts are rules; model writes one line</li>
        </ul>
      </Receipt>
    </div>
  );
}
