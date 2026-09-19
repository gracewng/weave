import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { originFrom } from '@/lib/env';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/wardrobe';
  const origin = originFrom(req);
  if (!code) return NextResponse.redirect(`${origin}/?error=missing_code`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error?.message ?? 'exchange_failed')}`);

  const { session, user } = data;
  const admin = createAdminClient();
  if (admin) {
    // Capture the Gmail refresh token NOW — it is not available on later sessions.
    if (session.provider_refresh_token) {
      await admin.from('gmail_tokens').upsert({ user_id: user.id, refresh_token: session.provider_refresh_token, updated_at: new Date().toISOString() });
    }
    // Belt-and-braces: the DB trigger creates the profile, but make sure it exists.
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
  const safeNext = next.startsWith('/') ? next : '/wardrobe';
  return NextResponse.redirect(`${origin}${safeNext}`);
}
