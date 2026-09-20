'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { keptForHold } from '@weave/shared/kept';

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

/** DEMO: the friend accepts and hands over my oldest pending request (stands in for the second phone). */
export async function demoFriendAccepts(): Promise<number> {
  const { user } = await requireUser();
  const admin = createAdminClient(); if (!admin) return 0;
  const { data: loan } = await admin.from('loans').select('id').eq('borrower_id', user.id).in('status', ['requested', 'accepted']).order('created_at').limit(1).maybeSingle();
  if (!loan) return 0;
  await admin.from('loans').update({ status: 'out' }).eq('id', loan.id);
  const { data: h } = await admin.from('holds').select('id,price_cents,actual_paid_cents').eq('loan_id', loan.id).eq('status', 'held').maybeSingle();
  if (h) await admin.from('holds').update({ status: 'borrowed', outcome_confirmed_at: new Date().toISOString(), kept_cents: keptForHold({ status: 'borrowed', priceCents: h.price_cents > 0 ? h.price_cents : null, actualPaidCents: h.actual_paid_cents }), note: 'borrowed instead (demo accept)' }).eq('id', h.id);
  revalidatePath('/friends'); revalidatePath('/ghosts'); revalidatePath('/statement');
  return 1;
}
