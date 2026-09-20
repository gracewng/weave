import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runLocalStage, runMarketStage, type LocalStage } from '@/lib/search/run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

/**
 * POST /api/search  { stage: 'local', q, forOther }            → wardrobe + friends + memory + provisional verdict
 * POST /api/search  { stage: 'market', local, priceCents? }    → used + retail + final verdict + one-line note
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  let userId: string | null = null;
  if (process.env.CRON_SECRET && req.headers.get('x-weave-cron') === process.env.CRON_SECRET && url.searchParams.get('user')) userId = url.searchParams.get('user');
  else { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); userId = user?.id ?? null; }
  if (!userId) return new Response('unauthorized', { status: 401 });
  const user = { id: userId };
  const body = (await req.json()) as { stage: 'local'; q: string; forOther?: boolean } | { stage: 'market'; local: LocalStage; priceCents?: number | null };
  try {
    if (body.stage === 'local') {
      const q = (body.q ?? '').trim().slice(0, 120);
      if (!q) return NextResponse.json({ error: 'empty query' }, { status: 400 });
      return NextResponse.json(await runLocalStage(user.id, q, !!body.forOther));
    }
    return NextResponse.json(await runMarketStage(user.id, body.local, body.priceCents ?? null));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
