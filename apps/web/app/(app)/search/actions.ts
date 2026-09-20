'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { keptForHold } from '@weave/shared/kept';
import type { Verdict } from '@weave/shared/types';

export interface DecisionInput {
  decision: 'hold' | 'skip' | 'wear_mine' | 'bought_used' | 'buy';
  title: string; url?: string | null; imageUrl?: string | null; priceCents: number | null; query: string; verdict: Verdict | null;
  similarIds?: string[]; friendIds?: string[]; cheapestUsedCents?: number | null; forOther: boolean;
  woreItemId?: string | null; actualPaidCents?: number | null; source?: string | null;
}

/** Every button on the search page lands here. One intention → one holds row. */
export async function recordDecision(d: DecisionInput): Promise<{ id: string; status: string; keptCents: number; confirmed: boolean } | null> {
  const { supabase, user } = await requireUser();
  const status = d.decision === 'hold' ? 'held' : d.decision === 'buy' ? 'bought' : d.decision === 'bought_used' ? 'bought_used' : 'skipped';
  const confirmed = status !== 'held';
  const price = d.priceCents != null && d.priceCents > 0 ? Math.round(d.priceCents) : null;
  const actual = d.decision === 'bought_used' ? (d.actualPaidCents ?? d.cheapestUsedCents ?? null) : null;
  const kept = confirmed ? keptForHold({ status, priceCents: price, actualPaidCents: actual }) : 0;
  const row = {
    user_id: user.id, title: d.title.slice(0, 200), url: d.url ?? null, image_url: d.imageUrl ?? null,
    price_cents: price ?? 0, intended_source: d.source ?? null, query: d.query.slice(0, 200), verdict: d.verdict,
    similar_item_ids: d.similarIds ?? [], friend_item_ids: d.friendIds ?? [], cheapest_used_cents: d.cheapestUsedCents ?? null,
    status, outcome_confirmed_at: confirmed ? new Date().toISOString() : null, actual_paid_cents: actual,
    wore_item_id: d.decision === 'wear_mine' ? d.woreItemId ?? null : null, kept_cents: kept, for_other: d.forOther,
    note: d.decision === 'wear_mine' ? 'wore mine' : d.decision === 'bought_used' ? 'bought used' : d.decision === 'buy' ? 'bought anyway' : null,
    release_at: status === 'held' ? new Date(Date.now() + 48 * 3600 * 1000).toISOString() : null,
  };
  const { data, error } = await supabase.from('holds').insert(row).select('id,status,kept_cents').single();
  if (error || !data) return null;
  revalidatePath('/ghosts'); revalidatePath('/statement'); if (d.woreItemId) revalidatePath(`/wardrobe/${d.woreItemId}`);
  return { id: data.id, status: data.status, keptCents: data.kept_cents, confirmed };
}
