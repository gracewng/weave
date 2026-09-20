import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { originFrom, supabaseConfigured } from '@/lib/env';

export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

/**
 * Optional second consent: Gmail read-only, asked for only when the user clicks "Connect Gmail".
 * access_type=offline + prompt=consent make Google return a refresh token; include_granted_scopes keeps the
 * basic sign-in grant. /auth/callback stores the refresh token only after confirming the grant covers Gmail.
 */
export async function GET(req: Request) {
  if (!supabaseConfigured()) return NextResponse.json({ error: 'Supabase env not configured' }, { status: 500 });
  const origin = originFrom(req);
  const next = new URL(req.url).searchParams.get('next') ?? '/wardrobe';
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?gmail=1&next=${encodeURIComponent(next)}`,
      scopes: GMAIL_SCOPE,
      queryParams: { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' },
      skipBrowserRedirect: true,
    },
  });
  if (error || !data.url) return NextResponse.json({ error: error?.message ?? 'no url' }, { status: 500 });
  return NextResponse.redirect(data.url);
}
