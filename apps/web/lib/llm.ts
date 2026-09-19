import 'server-only';
import { configureLLM, type LLMCallLog } from '@worthit/shared/llm';
import { createAdminClient } from '@/lib/supabase/admin';

let configured = false;

/** Wire the shared LLM router's logger to the `llm_calls` table. Call once per server module that uses callLLM. */
export function ensureLLM() {
  if (configured) return;
  configured = true;
  configureLLM({
    logger: async (log: LLMCallLog) => {
      const admin = createAdminClient();
      if (!admin) { if (process.env.NODE_ENV !== 'production') console.log('[llm]', summarize(log)); return; }
      const { error } = await admin.from('llm_calls').insert({
        user_id: log.userId ?? null,
        task: log.task, provider: log.provider, model: log.model,
        input_tokens: log.inputTokens, output_tokens: log.outputTokens, cached_tokens: log.cachedTokens,
        cost_usd: log.costUsd, latency_ms: log.latencyMs, fell_back: log.fellBack, ok: log.ok,
        error: log.error ?? null,
      });
      if (error) console.warn('[llm] log insert failed', error.message);
    },
  });
}

function summarize(l: LLMCallLog) {
  return `${l.task} ${l.provider}/${l.model} in=${l.inputTokens} out=${l.outputTokens} cached=${l.cachedTokens} $${l.costUsd.toFixed(5)} ${l.latencyMs}ms${l.fellBack ? ' FALLBACK' : ''}${l.ok ? '' : ' ERR ' + l.error}`;
}
