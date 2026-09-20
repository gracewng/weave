import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPush } from '@/lib/push';
export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';
/** Hourly: holds past their 48h release with no answer yet → one "still want it?" push, once. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET; const auth = req.headers.get('authorization');
  if (!secret || (auth !== `Bearer ${secret}` && req.headers.get('x-weave-cron') !== secret)) return new Response('unauthorized', { status: 401 });
  const admin = createAdminClient(); if (!admin) return NextResponse.json({ error: 'no service role' }, { status: 500 });
  const { data } = await admin.from('holds').select('id,user_id,title,price_cents').eq('status', 'held').lte('release_at', new Date().toISOString()).is('reminded_at', null).limit(100);
  let sent = 0;
  for (const h of (data ?? []) as Array<{ id: string; user_id: string; title: string; price_cents: number }>) {
    sent += await sendPush(admin, h.user_id, { title: 'Still want it?', body: `${h.title}${h.price_cents ? ` · $${(h.price_cents / 100).toFixed(0)} intended` : ''}. Skipped, bought used, or bought anyway?`, url: '/ghosts', tag: `hold-${h.id}` });
    await admin.from('holds').update({ reminded_at: new Date().toISOString() }).eq('id', h.id);
  }
  return NextResponse.json({ due: (data ?? []).length, sent });
}
