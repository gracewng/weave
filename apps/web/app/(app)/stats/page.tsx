import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth';
import { summarizeKept } from '@weave/shared/kept';
import { Page, PageHeader, Card, CardTitle, Stat, StatGrid, Row, Note, Badge } from '@/components/ui';
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
  const perEmail = emails.length ? money(emails.reduce((s, r) => s + Number(r.cost_usd), 0) / emails.length) : 'N/A';
  const perSearch = searches.length ? money(mine.filter((r) => ['parse_query', 'search_note', 'embed'].includes(r.task)).reduce((s, r) => s + Number(r.cost_usd), 0) / searches.length) : 'N/A';
  const ratio = myCost > 0 && kept.keptCents > 0 ? `$${(kept.keptCents / 100 / myCost).toFixed(0)}` : 'N/A';

  return (
    <Page>
      <PageHeader
        title="AI spend"
        subtitle={`${rows.length} calls, live from the call log. Every model call is routed, logged and priced.`}
        actions={<Badge tone={liveCalls > 0 ? 'pine' : 'warn'}>{liveCalls > 0 ? `Live · ${liveCalls} real calls` : 'Fixture / no calls'}</Badge>}
      />

      <StatGrid cols={4}>
        <Stat value={ratio} label="kept per $1 of your AI spend" tone="pine" valueClass={ratio !== 'N/A' ? 'saved' : ''} />
        <Stat value={money(myCost)} label="your AI spend" />
        <Stat value={`${cacheRate.toFixed(1)}%`} label="cache hit rate" />
        <Stat value={fallbacks} label="fallbacks" />
      </StatGrid>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardTitle hint="All users, all time">Tokens and cost</CardTitle>
          <Row label="Input tokens" value={totalIn.toLocaleString()} />
          <Row label="Output tokens" value={totalOut.toLocaleString()} />
          <Row label="Cached tokens" value={totalCached.toLocaleString()} />
          <Row label="Total AI spend (all users)" value={money(totalCost)} />
          <Row label="Your AI spend" value={money(myCost)} muted />
          <Row label="Per email extracted" value={perEmail} muted sub />
          <Row label="Per search" value={perSearch} muted sub />
        </Card>

        <Card>
          <CardTitle hint="Confirmed outcomes only. The ratio is a product ratio over the period shown, not a causal claim. N/A at zero.">Kept against spend</CardTitle>
          <Row label="Your Money Kept (confirmed)" value={`$${(kept.keptCents / 100).toFixed(2)}`} valueClass={kept.keptCents > 0 ? 'saved' : ''} />
          <Row label="Your Money Recovered" value={`$${(kept.recoveredCents / 100).toFixed(2)}`} valueClass={kept.recoveredCents > 0 ? 'saved' : ''} />
          <Row label="Kept per $1 of your AI spend" value={ratio} valueClass={ratio !== 'N/A' ? 'saved' : ''} />
          <Row label="Mode" value={liveCalls > 0 ? `Live · ${liveCalls} real calls` : 'Fixture / no calls'} muted />
        </Card>
      </div>

      <Card>
        <CardTitle hint="Calls · tokens · cached · cost">By task</CardTitle>
        {byTask.size === 0 && <Note>No calls yet. Hit /api/llm/health to log the first two.</Note>}
        {[...byTask.entries()].map(([k, v]) => (
          <Row key={k} label={k} value={`${v.calls}× · ${(v.in + v.out).toLocaleString()} tok · ${v.cached.toLocaleString()} cached · ${money(v.cost)}`} />
        ))}
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardTitle hint={`Meta ${MODELS.meta.chat} · OpenAI ${MODELS.openai.chat} · embed ${MODELS.openai.embed}`}>Routing</CardTitle>
          {Object.entries(TASKS).map(([task, cfg]) => (
            <Row key={task} label={task} value={`${cfg.provider}${cfg.reasoningEffort ? ` · ${cfg.reasoningEffort}` : ''}${cfg.batchSize ? ` · batch ${cfg.batchSize}` : ''}`} muted />
          ))}
        </Card>
        <Card>
          <CardTitle>Token discipline</CardTitle>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-2">
            <li>Gmail query and sender allowlist before any model call</li>
            <li>HTML stripped, boilerplate removed, truncated to about 6k characters</li>
            <li>Minimal reasoning effort for extraction, tagging and query parsing</li>
            <li>Batched tagging (20 per call); static prompt prefix first for cache hits</li>
            <li>Embeddings once per item; audio cached; verdicts and budget math are rules, the model only writes one line</li>
          </ul>
        </Card>
      </div>
    </Page>
  );
}
