'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { keptForHold } from '@weave/shared/kept';

/** Hidden demo panel (press D three times). Every trigger is labeled in the UI; nothing here pretends to be live data. */
export async function demoFriendAccepts(): Promise<number> {
  const { user } = await requireUser();
  const admin = createAdminClient(); if (!admin) return 0;
  const { data: loan } = await admin.from('loans').select('id').eq('borrower_id', user.id).in('status', ['requested', 'accepted']).order('created_at').limit(1).maybeSingle();
  if (!loan) return 0;
  await admin.from('loans').update({ status: 'out' }).eq('id', loan.id);
  const { data: h } = await admin.from('holds').select('id,price_cents,actual_paid_cents').eq('loan_id', loan.id).eq('status', 'held').maybeSingle();
  if (h) await admin.from('holds').update({ status: 'borrowed', outcome_confirmed_at: new Date().toISOString(), kept_cents: keptForHold({ status: 'borrowed', priceCents: h.price_cents > 0 ? h.price_cents : null, actualPaidCents: h.actual_paid_cents }), note: 'borrowed instead (demo accept)' }).eq('id', h.id);
  revalidatePath('/friends'); revalidatePath('/statement');
  return 1;
}

/** DEMO: the item with the soonest open return window becomes Return Pending → Refund Confirmed at its paid price. */
export async function demoSeedRefund(): Promise<number> {
  const { supabase, user } = await requireUser();
  const today = new Date().toISOString().slice(0, 10);
  const { data: it } = await supabase.from('items').select('id,price_cents').eq('user_id', user.id).eq('status', 'owned').gte('return_by', today).order('return_by').limit(1).maybeSingle();
  if (!it) return 0;
  await supabase.from('items').update({ status: 'returned', return_initiated_at: new Date(Date.now() - 86400000).toISOString(), refund_cents: it.price_cents ?? 0, refunded_at: new Date().toISOString() }).eq('id', it.id);
  revalidatePath('/returns'); revalidatePath('/statement'); revalidatePath('/wardrobe');
  return it.price_cents ?? 0;
}
