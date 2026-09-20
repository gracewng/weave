'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';

/** One question per charge: keep / returning / not clothes / for someone else. */
export async function decideCharge(txId: string, decision: 'keep' | 'returning' | 'not_clothes' | 'gift'): Promise<boolean> {
  const { supabase, user } = await requireUser();
  const patch: Record<string, unknown> = { decision, decided_at: new Date().toISOString() };
  if (decision === 'not_clothes') Object.assign(patch, { is_clothing: false, match_status: 'skipped' });
  if (decision === 'gift') Object.assign(patch, { match_status: 'skipped' });
  const { error } = await supabase.from('transactions').update(patch).eq('id', txId).eq('user_id', user.id);
  revalidatePath('/charges'); revalidatePath('/statement');
  return !error;
}

/** Mystery quiz: "Skip" leaves it unresolved but out of the way. */
export async function skipCharge(txId: string): Promise<boolean> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from('transactions').update({ match_status: 'skipped' }).eq('id', txId).eq('user_id', user.id);
  revalidatePath('/charges');
  return !error;
}
