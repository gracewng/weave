import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env, supabaseConfigured } from '@/lib/env';

const PROTECTED = ['/wardrobe', '/search', '/charges', '/budget', '/returns', '/friends', '/ghosts', '/statement', '/profile', '/settings', '/stats', '/capture', '/join', '/welcome'];

/** Refreshes the Supabase session cookie on every request and gates app routes. */
export async function proxy(request: NextRequest) {
  if (!supabaseConfigured()) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (!user && PROTECTED.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }
  if (user && path === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/wardrobe';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|api/).*)'],
};
