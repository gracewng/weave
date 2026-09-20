import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { exchangeAndStore, syncTransactions } from '@/lib/plaid';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic'; export const maxDuration = 60;
/** POST { public_token, institution? } → stores the item and runs the first sync. */
export async function POST(req: Request) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('unauthorized', { status: 401 });
  const admin = createAdminClient(); if (!admin) return NextResponse.json({ error: 'no service role' }, { status: 500 });
  const body = (await req.json()) as { public_token: string; institution?: string | null };
  try {
    await exchangeAndStore(admin, user.id, body.public_token, body.institution);
    return NextResponse.json(await syncTransactions(admin, user.id));
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 }); }
}
