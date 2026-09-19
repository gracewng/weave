import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { similarOwned } from '@/lib/tagging';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/items/similar?item=<id> | ?q=<text>  — nearest owned items (acceptance check for Phase 3). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  let userId: string | null = null;
  if (process.env.CRON_SECRET && req.headers.get('x-weave-cron') === process.env.CRON_SECRET && url.searchParams.get('user')) userId = url.searchParams.get('user');
  else { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); userId = user?.id ?? null; }
  if (!userId) return new Response('unauthorized', { status: 401 });
  const itemId = url.searchParams.get('item') ?? undefined; const text = url.searchParams.get('q') ?? undefined;
  if (!itemId && !text) return NextResponse.json({ error: 'item or q required' }, { status: 400 });
  const results = await similarOwned(userId, { itemId, text }, Number(url.searchParams.get('k') ?? 5));
  return NextResponse.json({ results });
}
