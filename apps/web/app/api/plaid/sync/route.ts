import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncTransactions, sandboxPublicToken, exchangeAndStore } from '@/lib/plaid';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic'; export const maxDuration = 60;
/**
 * POST /api/plaid/sync — sync linked accounts (session or x-weave-cron + ?user=).
 * ?sandbox=1 links Plaid's test bank without the Link UI first (labeled DEMO in the UI).
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  let userId: string | null = null;
  if (process.env.CRON_SECRET && req.headers.get('x-weave-cron') === process.env.CRON_SECRET && url.searchParams.get('user')) userId = url.searchParams.get('user');
  else { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); userId = user?.id ?? null; }
  if (!userId) return new Response('unauthorized', { status: 401 });
  const admin = createAdminClient(); if (!admin) return NextResponse.json({ error: 'no service role' }, { status: 500 });
  try {
    if (url.searchParams.get('sandbox') === '1') await exchangeAndStore(admin, userId, await sandboxPublicToken(), 'Plaid sandbox (First Platypus Bank)');
    return NextResponse.json(await syncTransactions(admin, userId));
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 }); }
}
