import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { insertCharges, type SyncSummary } from '@/lib/plaid';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
/** POST /api/demo/charge — an in-store clothing charge hits the card right now ($42.00 · UNIQLO NEWBURY ST). Labeled DEMO. */
export async function POST(req: Request) {
  const url = new URL(req.url);
  let userId: string | null = null;
  if (process.env.CRON_SECRET && req.headers.get('x-weave-cron') === process.env.CRON_SECRET && url.searchParams.get('user')) userId = url.searchParams.get('user');
  else { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); userId = user?.id ?? null; }
  if (!userId) return new Response('unauthorized', { status: 401 });
  const admin = createAdminClient(); if (!admin) return NextResponse.json({ error: 'no service role' }, { status: 500 });
  const body = (await req.json().catch(() => ({}))) as { merchant?: string; amountCents?: number };
  const out: SyncSummary = { added: 0, clothing: 0, matched: 0, mystery: 0, unmatched: 0, removed: 0 };
  await insertCharges(admin, userId, [{ externalId: `mock-${Date.now()}`, merchant: body.merchant ?? 'UNIQLO NEWBURY ST', amountCents: body.amountCents ?? 4200, date: new Date().toISOString().slice(0, 10), category: 'GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES', pending: false, source: 'mock' }], out);
  return NextResponse.json(out);
}
