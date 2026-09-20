'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';

const paths = (id: string) => { revalidatePath('/returns'); revalidatePath('/statement'); revalidatePath('/wardrobe'); revalidatePath(`/wardrobe/${id}`); };

/** Return Pending. Nothing is recovered yet. */
export async function startReturn(itemId: string): Promise<boolean> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from('items').update({ status: 'returning', return_initiated_at: new Date().toISOString() }).eq('id', itemId).eq('user_id', user.id).eq('status', 'owned');
  paths(itemId); return !error;
}

/** Refund Confirmed: the actual amount, entered by the user (labeled as user confirmation). Credits Money Recovered. */
export async function confirmRefund(itemId: string, refundCents: number): Promise<boolean> {
  const { supabase, user } = await requireUser();
  const cents = Math.max(0, Math.round(refundCents));
  const { error } = await supabase.from('items').update({ status: 'returned', refund_cents: cents, refunded_at: new Date().toISOString() }).eq('id', itemId).eq('user_id', user.id).in('status', ['owned', 'returning']);
  paths(itemId); return !error;
}

/** Changed your mind: back to owned. */
export async function cancelReturn(itemId: string): Promise<boolean> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from('items').update({ status: 'owned', return_initiated_at: null }).eq('id', itemId).eq('user_id', user.id).eq('status', 'returning');
  paths(itemId); return !error;
}
