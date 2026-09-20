import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runIngestion, type IngestEvent } from '@/lib/ingest/pipeline';
import { tagAndEmbed } from '@/lib/tagging';
import { lookupMissingImages } from '@/lib/identify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;   // Vercel Hobby limit; scans are resumable, the panel says "scan again to continue"

/**
 * GET /api/ingest/gmail?max=300  — server-sent events.
 * Reads the signed-in user's Gmail (or fixtures in DEMO_MODE), extracts clothing items, streams progress.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  // Two ways in: the signed-in user's cookie session, or an internal call (cron / demo panel / tests)
  // authenticated with the CRON_SECRET header and an explicit ?user=<uuid>.
  let userId: string | null = null;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get('x-weave-cron') === cronSecret && url.searchParams.get('user')) {
    userId = url.searchParams.get('user');
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }
  if (!userId) return new Response('unauthorized', { status: 401 });
  const user = { id: userId };

  const hard = process.env.VERCEL ? 80 : 1000;   // ~80 messages fit in one 60s function run
  const max = Math.max(1, Math.min(hard, Number(url.searchParams.get('max') ?? process.env.INGEST_MAX_EMAILS ?? 300)));

  const admin = createAdminClient();
  const { data: tok } = admin ? await admin.from('gmail_tokens').select('refresh_token').eq('user_id', user.id).maybeSingle() : { data: null };
  const refreshToken = (tok as { refresh_token?: string } | null)?.refresh_token ?? null;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (e: IngestEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      const keepalive = setInterval(() => controller.enqueue(encoder.encode(': keepalive\n\n')), 15000);
      runIngestion({ userId: user.id, refreshToken, maxEmails: max, forceFixture: url.searchParams.get('source') === 'fixture', onEvent: send })
        .then(async (c) => {
          if (c.itemsFound > 0) {
            const t = await tagAndEmbed(user.id).catch(() => null);
            if (t) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tagged', ...t })}\n\n`));
            // Identify the item: product images for anything the email didn't picture. Capped to protect the search quota.
            const im = await lookupMissingImages(user.id, { maxSearches: 15 }).catch(() => null);
            if (im) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'images', ...im })}\n\n`));
          }
        })
        .catch((err) => send({ type: 'error', message: err instanceof Error ? err.message : String(err), counters: { scanned: 0, prefiltered: 0, sent: 0, clothingOrders: 0, itemsFound: 0, duplicates: 0, failed: 0, costUsd: 0, tokens: 0, cached: 0 } }))
        .finally(() => { clearInterval(keepalive); controller.close(); });
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
  });
}
