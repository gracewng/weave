'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { keptForHold } from '@weave/shared/kept';

/** "What happened?" on a pending hold, or a correction on a confirmed one. One intention, one outcome. */
export async function resolveHold(id: string, outcome: 'skipped' | 'bought_used' | 'bought' | 'released', actualPaidCents?: number | null): Promise<{ ok: boolean; keptCents: number }> {
  const { supabase, user } = await requireUser();
  const { data: h } = await supabase.from('holds').select('price_cents').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!h) return { ok: false, keptCents: 0 };
  const actual = outcome === 'bought_used' ? actualPaidCents ?? null : null;
  const kept = outcome === 'released' ? 0 : keptForHold({ status: outcome, priceCents: h.price_cents, actualPaidCents: actual });
  const { error } = await supabase.from('holds').update({
    status: outcome, outcome_confirmed_at: outcome === 'released' ? null : new Date().toISOString(), actual_paid_cents: actual, kept_cents: kept,
    note: outcome === 'bought_used' ? 'bought used' : outcome === 'bought' ? 'bought anyway' : outcome === 'skipped' ? 'didn\'t need it' : null,
  }).eq('id', id).eq('user_id', user.id);
  revalidatePath('/ghosts'); revalidatePath('/statement');
  return { ok: !error, keptCents: kept };
}
