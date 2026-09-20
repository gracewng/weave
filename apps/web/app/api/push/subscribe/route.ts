import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
/** POST { endpoint, keys } — save this browser's push subscription. DELETE { endpoint } — remove it. */
export async function POST(req: Request) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('unauthorized', { status: 401 });
  const sub = (await req.json()) as { endpoint?: string; keys?: { p256dh: string; auth: string } };
  if (!sub.endpoint || !sub.keys) return NextResponse.json({ error: 'bad subscription' }, { status: 400 });
  const { error } = await supabase.from('push_subscriptions').upsert({ user_id: user.id, endpoint: sub.endpoint, keys: sub.keys }, { onConflict: 'endpoint' });
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}
export async function DELETE(req: Request) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('unauthorized', { status: 401 });
  const { endpoint } = (await req.json()) as { endpoint?: string };
  if (endpoint) await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id);
  return NextResponse.json({ ok: true });
}
