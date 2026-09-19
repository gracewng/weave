import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { refreshGoogleAccessToken } from '@/lib/google';
import { getMessage } from '@/lib/gmail';
import { prepareEmail } from '@/lib/ingest/html';
import { prefilter } from '@/lib/ingest/prefilter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Dev-only: GET /api/ingest/debug?user=<uuid>&message=<gmailId>  (header x-weave-cron: CRON_SECRET)
 * Shows what the pipeline would feed the model for one email. Returns nothing to the browser session; never persists.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('x-weave-cron') !== secret) return new Response('unauthorized', { status: 401 });
  const userId = url.searchParams.get('user'); const messageId = url.searchParams.get('message');
  if (!userId || !messageId) return NextResponse.json({ error: 'user and message required' }, { status: 400 });
  const admin = createAdminClient();
  const { data: tok } = await admin!.from('gmail_tokens').select('refresh_token').eq('user_id', userId).maybeSingle();
  if (!tok) return NextResponse.json({ error: 'no gmail token' }, { status: 404 });
  const token = await refreshGoogleAccessToken((tok as { refresh_token: string }).refresh_token);
  const msg = await getMessage(token, messageId);
  const prepared = prepareEmail(msg);
  const allImgs = (msg.html?.match(/<img\b[^>]*>/gi) ?? []).map((t) => /src=["']([^"']+)["']/i.exec(t)?.[1] ?? '').filter(Boolean);
  return NextResponse.json({
    from: msg.from, subject: msg.subject, date: msg.date, hasHtml: !!msg.html, htmlLength: msg.html?.length ?? 0,
    prefilter: prefilter({ from: msg.from, subject: msg.subject, text: prepared.text }),
    imageUrlsKept: prepared.imageUrls, allImgTagsInEmail: allImgs.slice(0, 40),
    textChars: prepared.text.length, textPreview: prepared.text.slice(0, 1500),
  });
}
