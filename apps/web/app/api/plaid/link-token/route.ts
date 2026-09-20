import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLinkToken, plaidConfigured } from '@/lib/plaid';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
export async function POST() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('unauthorized', { status: 401 });
  if (!plaidConfigured()) return NextResponse.json({ error: 'Plaid not configured' }, { status: 500 });
  try { return NextResponse.json({ link_token: await createLinkToken(user.id) }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 }); }
}
