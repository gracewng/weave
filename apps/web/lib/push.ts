import 'server-only';
import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface PushPayload { title: string; body: string; url?: string; tag?: string }

let configured = false;
function ensure(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) { webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:team@weave.app', pub, priv); configured = true; }
  return true;
}

/** Send to every subscription the user has. Dead endpoints (404/410) are removed. Returns the number delivered. */
export async function sendPush(admin: SupabaseClient, userId: string, payload: PushPayload): Promise<number> {
  if (!ensure()) return 0;
  const { data } = await admin.from('push_subscriptions').select('id,endpoint,keys').eq('user_id', userId);
  let sent = 0;
  for (const s of (data ?? []) as Array<{ id: string; endpoint: string; keys: { p256dh: string; auth: string } }>) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), { TTL: 3600 }); sent++; }
    catch (err) { const code = (err as { statusCode?: number }).statusCode; if (code === 404 || code === 410) await admin.from('push_subscriptions').delete().eq('id', s.id); else console.warn('[push] failed', code, (err as Error).message); }
  }
  return sent;
}
