'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';

/** Hidden demo panel (press D three times). Every trigger is labeled in the UI; nothing here pretends to be live data. */
export async function demoAdvance48h(): Promise<number> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from('holds').update({ release_at: new Date(Date.now() - 3600 * 1000).toISOString() }).eq('user_id', user.id).eq('status', 'held').select('id');
  revalidatePath('/ghosts');
  return data?.length ?? 0;
}

export async function demoResetHolds(): Promise<number> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from('holds').delete().eq('user_id', user.id).select('id');
  revalidatePath('/ghosts'); revalidatePath('/statement');
  return data?.length ?? 0;
}
