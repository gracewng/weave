import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { originFrom } from '@/lib/env';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

/** Ask Google which scopes an access token actually carries. Fails closed: no answer means no Gmail. */
async function grantsGmail(accessToken: string | null | undefined): Promise<boolean> {
  if (!accessToken) return false;
  try {
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`, { cache: 'no-store' });
    if (!r.ok) return false;
    const j = (await r.json()) as { scope?: string };
    return (j.scope ?? '').split(/\s+/).includes(GMAIL_SCOPE);
  } catch { return false; }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/home';
  const wantedGmail = url.searchParams.get('gmail') === '1';
  const origin = originFrom(req);
  if (!code) return NextResponse.redirect(`${origin}/?error=missing_code`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error?.message ?? 'exchange_failed')}`);

  const { session, user } = data;
  const admin = createAdminClient();
  let gmailConnected = false;
  if (admin) {
    // The refresh token only appears on this first session. Keep it only when the grant really covers Gmail,
    // so a plain sign-in never overwrites a working Gmail token with a basic-scope one.
    if (session.provider_refresh_token && (await grantsGmail(session.provider_token))) {
      await admin.from('gmail_tokens').upsert({ user_id: user.id, refresh_token: session.provider_refresh_token, updated_at: new Date().toISOString() });
      gmailConnected = true;
    }
    const { data: prof } = await admin.from('profiles').select('id').eq('id', user.id).maybeSingle();
    if (!prof) {
      const meta = user.user_metadata ?? {};
      await admin.from('profiles').insert({
        id: user.id,
        display_name: meta.full_name ?? meta.name ?? user.email?.split('@')[0] ?? 'You',
        avatar_url: meta.avatar_url ?? meta.picture ?? null,
        invite_code: Math.random().toString(36).slice(2, 10).toUpperCase(),
      });
    }
  }
  const safeNext = next.startsWith('/') ? next : '/home';
  const flag = wantedGmail ? (gmailConnected ? 'gmail=connected' : 'gmail=denied') : '';
  return NextResponse.redirect(`${origin}${safeNext}${flag ? (safeNext.includes('?') ? '&' : '?') + flag : ''}`);
}
