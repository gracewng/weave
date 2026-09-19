import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tagAndEmbed } from '@/lib/tagging';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** POST /api/items/tag — tag + embed the signed-in user's untagged items (or ?user= with x-weave-cron). */
export async function POST(req: Request) {
  const url = new URL(req.url);
  let userId: string | null = null;
  if (process.env.CRON_SECRET && req.headers.get('x-weave-cron') === process.env.CRON_SECRET && url.searchParams.get('user')) userId = url.searchParams.get('user');
  else { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); userId = user?.id ?? null; }
  if (!userId) return new Response('unauthorized', { status: 401 });
  const summary = await tagAndEmbed(userId);
  return NextResponse.json(summary);
}
