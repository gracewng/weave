import { NextResponse } from 'next/server';
import { pingProvider, MODELS, isDemoMode } from '@worthit/shared';
import { ensureLLM } from '@/lib/llm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Pings both LLM providers so we can prove "yes, that's live" to judges. */
export async function GET() {
  ensureLLM();
  const [meta, openai] = await Promise.all([pingProvider('meta'), pingProvider('openai')]);
  const allOk = meta.ok && openai.ok;
  return NextResponse.json(
    {
      ok: allOk,
      demoMode: isDemoMode(),
      checkedAt: new Date().toISOString(),
      providers: { meta, openai },
      models: { meta: MODELS.meta.chat, openai: MODELS.openai.chat, embed: MODELS.openai.embed },
    },
    { status: allOk ? 200 : 503 },
  );
}
