import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPush } from '@/lib/push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Daily (vercel.json): items whose return window closes within 4 days.
 * Push delivery lands in Phase 10; until then this returns the list and logs it (one notification per item, ever).
 * Auth: Vercel cron sends `Authorization: Bearer CRON_SECRET`; internal callers may use x-weave-cron.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || (auth !== `Bearer ${secret}` && req.headers.get('x-weave-cron') !== secret)) return new Response('unauthorized', { status: 401 });
  const admin = createAdminClient(); if (!admin) return NextResponse.json({ error: 'no service role' }, { status: 500 });
  const today = new Date(); const cutoff = new Date(today); cutoff.setUTCDate(cutoff.getUTCDate() + 4);
  const t = today.toISOString().slice(0, 10), c = cutoff.toISOString().slice(0, 10);
  const { data: items } = await admin.from('items').select('id,user_id,name,price_cents,return_by').eq('status', 'owned').gte('return_by', t).lte('return_by', c).is('return_reminded_at', null);
  const rows = (items ?? []) as Array<{ id: string; user_id: string; name: string; price_cents: number | null; return_by: string }>;
  if (rows.length === 0) return NextResponse.json({ due: [] });
  const due = rows;
  let sent = 0;
  for (const d of due) {
    sent += await sendPush(admin, d.user_id, { title: 'Return window closing', body: `${d.name} · $${((d.price_cents ?? 0) / 100).toFixed(0)} at stake · by ${d.return_by}`, url: '/wardrobe', tag: `return-${d.id}` });
    await admin.from('items').update({ return_reminded_at: new Date().toISOString() }).eq('id', d.id);
  }
  return NextResponse.json({ due: due.map((d) => ({ id: d.id, name: d.name, price_cents: d.price_cents, return_by: d.return_by })), sent });
}
