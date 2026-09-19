import { NextResponse } from 'next/server';
import { pingProvider, MODELS, isDemoMode } from '@weave/shared';
import { ensureLLM } from '@/lib/llm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Pings both LLM providers so we can prove "yes, that's live" to judges. */
export async function GET() {
  ensureLLM();
  const [meta, openai] = await Promise.all([pingProvider('meta'), pingProvider('openai')]);
  // ok = every provider that has a key responds. An unconfigured provider is reported, not counted as a failure.
  const configured = [meta, openai].filter((p) => p.configured);
  const allOk = configured.length > 0 && configured.every((p) => p.ok);
  return NextResponse.json(
    {
      ok: allOk,
      configuredProviders: configured.map((p) => p.provider),
      demoMode: isDemoMode(),
      checkedAt: new Date().toISOString(),
      providers: { meta, openai },
      models: { meta: MODELS.meta.chat, openai: MODELS.openai.chat, embed: MODELS.openai.embed },
    },
    { status: allOk ? 200 : 503 },
  );
}
