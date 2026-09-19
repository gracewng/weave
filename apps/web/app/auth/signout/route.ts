import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { originFrom } from '@/lib/env';

export async function POST(req: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(`${originFrom(req)}/`, { status: 303 });
}
