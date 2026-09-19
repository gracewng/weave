import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { originFrom, supabaseConfigured } from '@/lib/env';

/**
 * Starts Google OAuth via Supabase with the Gmail read-only scope.
 * access_type=offline + prompt=consent make Google return a refresh token, which Supabase exposes
 * ONLY on the immediate post-sign-in session — /auth/callback captures it into gmail_tokens.
 */
export async function GET(req: Request) {
  if (!supabaseConfigured()) return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 });
  const origin = originFrom(req);
  const next = new URL(req.url).searchParams.get('next') ?? '/closet';
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      scopes: 'https://www.googleapis.com/auth/gmail.readonly',
      queryParams: { access_type: 'offline', prompt: 'consent' },
      skipBrowserRedirect: true,
    },
  });
  if (error || !data.url) return NextResponse.json({ error: error?.message ?? 'no url' }, { status: 500 });
  return NextResponse.redirect(data.url);
}
