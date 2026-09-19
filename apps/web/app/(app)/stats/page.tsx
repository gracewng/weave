import { createAdminClient } from '@/lib/supabase/admin';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule } from '@/components/Receipt';
import { TASKS, MODELS } from '@weave/shared/models';
import type { LlmCallRow } from '@weave/shared/types';

export const dynamic = 'force-dynamic';

function money(n: number) { return `$${n.toFixed(4)}`; }

export default async function StatsPage() {
  const admin = createAdminClient();
  const { data } = admin ? await admin.from('llm_calls').select('*').order('created_at', { ascending: false }).limit(5000) : { data: [] as LlmCallRow[] };
  const rows = (data ?? []) as LlmCallRow[];

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
        <ReceiptLine label="TOTAL AI SPEND" value={money(totalCost)} />
        <ReceiptLine label="DOLLARS SAVED" value="$0.00" valueClass="saved" />
        <ReceiptLine label="SAVED PER $1 OF AI" value={totalCost > 0 ? `$${(0 / totalCost).toFixed(0)}` : '—'} valueClass="saved" />
        <ReceiptRule />
        <div className="mono text-[11px] text-ink-3">SAVED figure wires up with interventions in Phase 7.</div>
      </Receipt>

      <Receipt>
        <ReceiptHeader title="By task" />
        <ReceiptRule />
        {byTask.size === 0 && <div className="mono text-xs text-ink-3">No calls yet. Hit /api/llm/health to log the first two.</div>}
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
          <li>Gmail query + sender allowlist before any LLM call</li>
          <li>HTML stripped, boilerplate removed, truncated to ~6k chars</li>
          <li>reasoning_effort minimal for extraction/tagging; medium only for crew styling</li>
          <li>Batched tagging (20) and pairing scores; static prompt prefix first for cache hits</li>
          <li>Embeddings once per item; pairings + audio cached; verdicts are rules, the model only writes one line</li>
        </ul>
      </Receipt>
    </div>
  );
}
