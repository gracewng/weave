/**
 * The ONE wrapper every LLM call goes through.
 *  - routes task → provider/model/settings from models.ts
 *  - strict structured output via zod (OpenAI + Meta both accept json_schema)
 *  - per-provider timeout, then fallback to the other provider, then to a fixture in DEMO_MODE
 *  - logs provider/model/task/tokens/cached/cost/latency/fell_back to a sink (wired to `llm_calls` by the web app)
 *
 * Prompt-cache discipline: callers put stable instructions in `system` and variable data in `input`
 * so the static prefix is identical across calls and provider prompt caching hits.
 */
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { ZodType } from 'zod';
import {
  MODELS, TASKS, EMBEDDING_DIMS, chatModelFor, costUsd,
  type Provider, type Task, type ReasoningEffort,
} from './models';
import { isDemoMode, llmTimeoutMs, fixtureLatency } from './env';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ImagePart = { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };
export type TextPart = { type: 'text'; text: string };
export type ChatContent = string | Array<TextPart | ImagePart>;
export interface LLMMessage { role: 'system' | 'user' | 'assistant'; content: ChatContent }

export interface LLMCallLog {
  userId?: string | null;
  task: Task;
  provider: Provider | 'fixture';
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  costUsd: number;
  latencyMs: number;
  fellBack: boolean;
  ok: boolean;
  error?: string;
}

export type LLMLogger = (log: LLMCallLog) => void | Promise<void>;

export interface CallLLMOptions<T> {
  task: Task;
  /** Stable instructions. Identical across calls → prompt cache hits. */
  system?: string;
  /** Variable data. A string becomes a single user message. */
  input: string | LLMMessage[];
  /** When given, the model is forced to strict JSON matching this schema and the result is validated. */
  schema?: ZodType<T>;
  schemaName?: string;
  userId?: string | null;
  /** Returned when both providers fail (always in DEMO_MODE; also outside it if provided and `allowFixtureOutsideDemo`). */
  fixture?: () => T | Promise<T>;
  allowFixtureOutsideDemo?: boolean;
  maxOutputTokens?: number;
  timeoutMs?: number;
  reasoningEffort?: ReasoningEffort;
  /** Override provider (e.g. health checks). */
  provider?: Provider;
  disableFallback?: boolean;
}

export interface CallLLMResult<T> {
  data: T;
  /** Raw text for unstructured tasks. */
  text: string;
  provider: Provider | 'fixture';
  model: string;
  fellBack: boolean;
  usage: { input: number; output: number; cached: number };
  costUsd: number;
  latencyMs: number;
}

export class LLMError extends Error {
  constructor(message: string, public provider: Provider, public cause?: unknown) {
    super(message);
    this.name = 'LLMError';
  }
}

// ─── Logging sink ─────────────────────────────────────────────────────────────

let logger: LLMLogger = () => {};
export function configureLLM(opts: { logger?: LLMLogger }) {
  if (opts.logger) logger = opts.logger;
}
function emit(log: LLMCallLog) {
  try {
    const r = logger(log);
    if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => {});
  } catch { /* never let logging break a call */ }
}

// ─── Clients ──────────────────────────────────────────────────────────────────

const clients: Partial<Record<Provider, OpenAI>> = {};

export function providerKey(p: Provider): string | undefined {
  return p === 'meta'
    ? (process.env.META_MODEL_API_KEY || process.env.MODEL_API_KEY || undefined)
    : (process.env.OPENAI_API_KEY || undefined);
}
export function hasProvider(p: Provider): boolean { return !!providerKey(p); }

function client(p: Provider): OpenAI {
  const existing = clients[p];
  if (existing) return existing;
  const apiKey = providerKey(p);
  if (!apiKey) throw new LLMError(`${p}: no API key configured`, p);
  const baseURL = p === 'meta'
    ? (process.env.META_MODEL_BASE_URL || MODELS.meta.baseURL)
    : (process.env.OPENAI_BASE_URL || MODELS.openai.baseURL);
  const c = new OpenAI({ apiKey, baseURL, maxRetries: 0 });
  clients[p] = c;
  return c;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMessages(system: string | undefined, input: string | LLMMessage[]): LLMMessage[] {
  const msgs: LLMMessage[] = [];
  if (system) msgs.push({ role: 'system', content: system });
  if (typeof input === 'string') msgs.push({ role: 'user', content: input });
  else msgs.push(...input);
  return msgs;
}

function extractUsage(usage: unknown): { input: number; output: number; cached: number } {
  const u = (usage ?? {}) as Record<string, unknown>;
  const details = (u.prompt_tokens_details ?? u.input_tokens_details ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    input: num(u.prompt_tokens ?? u.input_tokens),
    output: num(u.completion_tokens ?? u.output_tokens),
    // OpenAI: usage.prompt_tokens_details.cached_tokens. Meta docs mention usage.cached_tokens. Accept both.
    cached: num(details.cached_tokens ?? u.cached_tokens),
  };
}

function stripFences(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m?.[1] ?? t;
}

function isTimeout(err: unknown): boolean {
  const e = err as { name?: string; code?: string; message?: string };
  return e?.name === 'APIConnectionTimeoutError' || e?.code === 'ETIMEDOUT' || /timed? ?out/i.test(e?.message ?? '');
}

// ─── Core call ────────────────────────────────────────────────────────────────

async function callProvider<T>(p: Provider, opts: CallLLMOptions<T>, fellBack: boolean): Promise<CallLLMResult<T>> {
  const cfg = TASKS[opts.task];
  const model = chatModelFor(p);
  const timeout = opts.timeoutMs ?? cfg.timeoutMs ?? llmTimeoutMs();
  const started = Date.now();
  const messages = toMessages(opts.system, opts.input);

  const body: Record<string, unknown> = {
    model,
    messages,
    max_completion_tokens: opts.maxOutputTokens ?? cfg.maxOutputTokens,
  };
  // reasoning_effort: Meta accepts minimal→xhigh. Only send when configured.
  const effort = opts.reasoningEffort ?? cfg.reasoningEffort;
  if (effort && p === 'meta') body.reasoning_effort = effort;
  if (opts.schema) {
    body.response_format = zodResponseFormat(opts.schema, opts.schemaName ?? `${opts.task}_result`);
  }

  try {
    const res = await client(p).chat.completions.create(
      body as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
      { timeout },
    );
    const text = res.choices[0]?.message?.content ?? '';
    const usage = extractUsage(res.usage);
    const latencyMs = Date.now() - started;
    const cost = costUsd(model, usage.input, usage.output, usage.cached);

    let data: T;
    if (opts.schema) {
      const parsed = opts.schema.safeParse(JSON.parse(stripFences(text)));
      if (!parsed.success) throw new LLMError(`${p}: schema validation failed: ${parsed.error.message}`, p, parsed.error);
      data = parsed.data;
    } else {
      data = text as unknown as T;
    }

    emit({ userId: opts.userId, task: opts.task, provider: p, model, inputTokens: usage.input, outputTokens: usage.output,
      cachedTokens: usage.cached, costUsd: cost, latencyMs, fellBack, ok: true });
    return { data, text, provider: p, model, fellBack, usage, costUsd: cost, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const message = err instanceof Error ? err.message : String(err);
    emit({ userId: opts.userId, task: opts.task, provider: p, model, inputTokens: 0, outputTokens: 0, cachedTokens: 0,
      costUsd: 0, latencyMs, fellBack, ok: false, error: isTimeout(err) ? `timeout>${timeout}ms: ${message}` : message });
    if (err instanceof LLMError) throw err;
    throw new LLMError(`${p} ${model}: ${message}`, p, err);
  }
}

/**
 * callLLM — route a task to its provider with structured output, fallback, and logging.
 * Throws LLMError only if every provider failed and no fixture applies.
 */
export async function callLLM<T = string>(opts: CallLLMOptions<T>): Promise<CallLLMResult<T>> {
  const cfg = TASKS[opts.task];
  const primary = opts.provider ?? cfg.provider;
  const chain: Provider[] = [primary];
  if (!opts.disableFallback && cfg.fallback && cfg.fallback !== primary) chain.push(cfg.fallback);

  const errors: string[] = [];
  let attempt = 0;
  for (const p of chain) {
    if (!hasProvider(p)) { errors.push(`${p}: no key`); continue; }
    try {
      const r = await callProvider(p, opts, attempt > 0);
      return r;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
      attempt++;
    }
  }

  if (opts.fixture && (isDemoMode() || opts.allowFixtureOutsideDemo)) {
    const started = Date.now();
    await fixtureLatency();
    const data = await opts.fixture();
    const latencyMs = Date.now() - started;
    emit({ userId: opts.userId, task: opts.task, provider: 'fixture', model: 'fixture', inputTokens: 0, outputTokens: 0,
      cachedTokens: 0, costUsd: 0, latencyMs, fellBack: true, ok: true, error: errors.join(' | ') || undefined });
    return { data, text: typeof data === 'string' ? data : JSON.stringify(data), provider: 'fixture', model: 'fixture',
      fellBack: true, usage: { input: 0, output: 0, cached: 0 }, costUsd: 0, latencyMs };
  }

  throw new LLMError(`All providers failed for ${opts.task}: ${errors.join(' | ')}`, primary);
}

// ─── Embeddings ───────────────────────────────────────────────────────────────

/** Deterministic pseudo-embedding so DEMO_MODE search still returns stable neighbors. */
export function fakeEmbedding(text: string, dims = EMBEDDING_DIMS): number[] {
  let h = 2166136261;
  const v = new Array<number>(dims).fill(0);
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (const tok of tokens) {
    for (let i = 0; i < tok.length; i++) { h ^= tok.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    for (let j = 0; j < 8; j++) { const idx = (h + j * 2654435761) % dims; v[idx] = (v[idx] ?? 0) + 1; h = Math.imul(h ^ j, 16777619) >>> 0; }
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

export async function embedTexts(texts: string[], userId?: string | null): Promise<{ vectors: number[][]; provider: Provider | 'fixture'; costUsd: number }> {
  if (texts.length === 0) return { vectors: [], provider: 'fixture', costUsd: 0 };
  const cfg = TASKS.embed;
  const model = MODELS.openai.embed;
  const started = Date.now();
  if (hasProvider('openai')) {
    try {
      const res = await client('openai').embeddings.create({ model, input: texts, dimensions: EMBEDDING_DIMS }, { timeout: cfg.timeoutMs });
      const usage = extractUsage(res.usage);
      const cost = costUsd(model, usage.input, 0, 0);
      emit({ userId, task: 'embed', provider: 'openai', model, inputTokens: usage.input, outputTokens: 0, cachedTokens: 0,
        costUsd: cost, latencyMs: Date.now() - started, fellBack: false, ok: true });
      return { vectors: res.data.map((d) => d.embedding), provider: 'openai', costUsd: cost };
    } catch (err) {
      emit({ userId, task: 'embed', provider: 'openai', model, inputTokens: 0, outputTokens: 0, cachedTokens: 0, costUsd: 0,
        latencyMs: Date.now() - started, fellBack: false, ok: false, error: err instanceof Error ? err.message : String(err) });
      if (!isDemoMode()) throw new LLMError(`openai embeddings failed: ${err instanceof Error ? err.message : err}`, 'openai', err);
    }
  } else if (!isDemoMode()) {
    throw new LLMError('openai: no API key configured for embeddings', 'openai');
  }
  await fixtureLatency(100, 300);
  emit({ userId, task: 'embed', provider: 'fixture', model: 'fixture', inputTokens: 0, outputTokens: 0, cachedTokens: 0,
    costUsd: 0, latencyMs: Date.now() - started, fellBack: true, ok: true });
  return { vectors: texts.map((t) => fakeEmbedding(t)), provider: 'fixture', costUsd: 0 };
}

// ─── Health ───────────────────────────────────────────────────────────────────

export interface ProviderHealth {
  provider: Provider;
  model: string;
  configured: boolean;
  ok: boolean;
  latencyMs: number;
  error?: string;
  sample?: string;
}

export async function pingProvider(p: Provider): Promise<ProviderHealth> {
  const model = chatModelFor(p);
  if (!hasProvider(p)) return { provider: p, model, configured: false, ok: false, latencyMs: 0, error: 'no API key' };
  try {
    const r = await callLLM<string>({
      task: 'health', provider: p, disableFallback: true,
      system: 'Reply with exactly the single word: ok',
      input: 'ping', maxOutputTokens: 5,
    });
    return { provider: p, model, configured: true, ok: true, latencyMs: r.latencyMs, sample: r.text.trim().slice(0, 40) };
  } catch (err) {
    return { provider: p, model, configured: true, ok: false, latencyMs: 0, error: err instanceof Error ? err.message : String(err) };
  }
}
