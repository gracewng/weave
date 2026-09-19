/**
 * Single source of truth for every model ID, price, and task → provider route.
 * Verified 2026-09-19 against:
 *   - https://developer.meta.com/ai/models/muse-spark/   (muse-spark-1.3, $1.25 / $0.15 cached / $4.25 per 1M)
 *   - https://developers.openai.com/api/docs/pricing      (gpt-5.6-luna $0.20 / $0.02 / $1.20; text-embedding-3-small $0.02)
 * If a provider renames a model, change it HERE only.
 */

export type Provider = 'meta' | 'openai';
export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

export const MODELS = {
  meta: {
    chat: 'muse-spark-1.3',
    baseURL: 'https://api.meta.ai/v1',
  },
  openai: {
    chat: 'gpt-5.6-luna',
    embed: 'text-embedding-3-small',
    baseURL: 'https://api.openai.com/v1',
  },
} as const;

/** USD per 1M tokens. */
export const PRICING: Record<string, { input: number; cached: number; output: number }> = {
  'muse-spark-1.3': { input: 1.25, cached: 0.15, output: 4.25 },
  'muse-spark-1.1': { input: 1.25, cached: 0.15, output: 4.25 },
  'gpt-5.6-luna': { input: 0.2, cached: 0.02, output: 1.2 },
  'text-embedding-3-small': { input: 0.02, cached: 0.02, output: 0 },
};

export const EMBEDDING_DIMS = 1536;

export type Task =
  | 'extract_email'
  | 'tag_items'
  | 'read_capture'
  | 'parse_query'
  | 'search_note'
  | 'borrow_message'
  | 'spoken_line'
  | 'embed'
  | 'health';

export interface TaskConfig {
  provider: Provider;
  /** Provider to try if the primary errors or times out. */
  fallback?: Provider;
  reasoningEffort?: ReasoningEffort;
  /** Expect strict JSON (schema passed by caller). */
  structured: boolean;
  /** Items per call when the task is batched. */
  batchSize?: number;
  timeoutMs?: number;
  maxOutputTokens?: number;
  why: string;
}

export const TASKS: Record<Task, TaskConfig> = {
  extract_email: {
    provider: 'meta', fallback: 'openai', reasoningEffort: 'minimal', structured: true,
    timeoutMs: 12000, maxOutputTokens: 1200,
    why: 'High volume, simple; minimal reasoning keeps tokens low',
  },
  tag_items: {
    provider: 'meta', fallback: 'openai', reasoningEffort: 'minimal', structured: true, batchSize: 20,
    timeoutMs: 12000, maxOutputTokens: 2500,
    why: 'Cheap bulk work, batched 20 per call',
  },
  read_capture: {
    provider: 'meta', fallback: 'openai', reasoningEffort: 'low', structured: true,
    timeoutMs: 15000, maxOutputTokens: 800,
    why: 'Native multimodal (receipt / tag / garment photo)',
  },
  parse_query: {
    provider: 'meta', fallback: 'openai', reasoningEffort: 'minimal', structured: true,
    timeoutMs: 8000, maxOutputTokens: 200,
    why: 'Search bar: "black slip dress under $60" → {category, color, max price, event}',
  },
  search_note: {
    provider: 'openai', fallback: 'meta', structured: false,
    timeoutMs: 8000, maxOutputTokens: 80,
    why: 'One line above search results: "You own 3 black tees, worn 2x total." Verdict is rule-based.',
  },
  borrow_message: {
    provider: 'meta', fallback: 'openai', reasoningEffort: 'minimal', structured: false,
    timeoutMs: 8000, maxOutputTokens: 120,
    why: 'Short social copy',
  },
  spoken_line: {
    provider: 'openai', fallback: 'meta', structured: false,
    timeoutMs: 8000, maxOutputTokens: 80,
    why: 'ElevenLabs spoken statement / verdict (low priority)',
  },
  embed: {
    provider: 'openai', structured: false, batchSize: 100, timeoutMs: 10000,
    why: 'text-embedding-3-small for pgvector search',
  },
  health: {
    provider: 'meta', structured: false, timeoutMs: 6000, maxOutputTokens: 5,
    why: 'Provider liveness ping for /api/llm/health',
  },
};

export function chatModelFor(provider: Provider): string {
  return MODELS[provider].chat;
}

export function costUsd(model: string, inputTokens: number, outputTokens: number, cachedTokens = 0): number {
  const p = PRICING[model];
  if (!p) return 0;
  const uncached = Math.max(0, inputTokens - cachedTokens);
  return (uncached * p.input + cachedTokens * p.cached + outputTokens * p.output) / 1_000_000;
}
