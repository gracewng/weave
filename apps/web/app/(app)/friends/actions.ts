'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureLLM } from '@/lib/llm';
import { callLLM } from '@weave/shared';
import { BORROW_MESSAGE_SYSTEM, borrowMessageInput } from '@weave/shared/prompts';
import { keptForHold } from '@weave/shared/kept';

export async function acceptInviteCode(code: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('accept_invite', { p_code: code.trim().toUpperCase() });
  revalidatePath('/friends');
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** One short model call (fixture fallback). The user edits it before sending. */
export async function draftBorrowMessage(input: { friendName: string; itemName: string; event: string; neededOn: string; returnBy: string }): Promise<string> {
  const { user } = await requireUser();
  ensureLLM();
  const fallback = `Hey ${input.friendName}! Any chance I could borrow your ${input.itemName} for ${input.event || 'an event'} on ${input.neededOn}? I'd have it back to you by ${input.returnBy}.`;
  try {
    const r = await callLLM<string>({ task: 'borrow_message', system: BORROW_MESSAGE_SYSTEM, input: borrowMessageInput({ ...input, usesEmoji: false }), userId: user.id, fixture: () => fallback, allowFixtureOutsideDemo: true });
    return r.text.trim() || fallback;
  } catch { return fallback; }
}

export interface RequestLoanInput { itemId: string; ownerId: string; event: string; neededOn: string; dueBack: string; message: string; intendedPriceCents?: number | null; query?: string | null; title?: string | null }

/** Borrower asks. Creates the loan (requested) and, when it replaces a purchase, a linked hold (pending until the item is out). */
export async function requestLoan(i: RequestLoanInput): Promise<{ ok: boolean; loanId?: string; error?: string }> {
  const { supabase, user } = await requireUser();
  const { data: loan, error } = await supabase.from('loans').insert({
    item_id: i.itemId, owner_id: i.ownerId, borrower_id: user.id, status: 'requested', event_name: i.event.trim() || null,
    needed_on: i.neededOn || null, due_back: i.dueBack || null, message: i.message.trim().slice(0, 500) || null, saved_cents: i.intendedPriceCents ?? null,
  }).select('id').single();
  if (error || !loan) return { ok: false, error: error?.message ?? 'insert failed' };
  if (i.intendedPriceCents != null || i.query) {
    await supabase.from('holds').insert({
      user_id: user.id, title: (i.title ?? `Borrow instead: ${i.query ?? ''}`).slice(0, 200), price_cents: i.intendedPriceCents ?? 0, query: i.query ?? null,
      verdict: 'borrow', friend_item_ids: [i.itemId], status: 'held', loan_id: loan.id, note: 'borrow requested',
    });
  }
  revalidatePath('/friends');
  return { ok: true, loanId: loan.id };
}

/** Owner: accept / decline. Either party: handed over (out) / returned. */
export async function setLoanStatus(loanId: string, status: 'accepted' | 'declined' | 'out' | 'returned'): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  const { data: loan } = await supabase.from('loans').select('id,owner_id,borrower_id,status').eq('id', loanId).maybeSingle();
  if (!loan) return { ok: false, error: 'not found' };
  const isOwner = loan.owner_id === user.id;
  if ((status === 'accepted' || status === 'declined') && !isOwner) return { ok: false, error: 'only the owner can answer a request' };
  const allowed: Record<string, string[]> = { requested: ['accepted', 'declined'], accepted: ['out', 'declined'], out: ['returned'] };
  if (!allowed[loan.status]?.includes(status)) return { ok: false, error: `cannot go from ${loan.status} to ${status}` };
  const { error } = await supabase.from('loans').update({ status }).eq('id', loanId);
  if (error) return { ok: false, error: error.message };
  // The linked hold (borrower's intention) becomes a confirmed "borrowed instead" once the item is actually out.
  if (status === 'out') {
    const admin = createAdminClient();
    if (admin) {
      const { data: h } = await admin.from('holds').select('id,price_cents,actual_paid_cents').eq('loan_id', loanId).eq('status', 'held').maybeSingle();
      if (h) await admin.from('holds').update({ status: 'borrowed', outcome_confirmed_at: new Date().toISOString(), kept_cents: keptForHold({ status: 'borrowed', priceCents: h.price_cents > 0 ? h.price_cents : null, actualPaidCents: h.actual_paid_cents }), note: 'borrowed instead' }).eq('id', h.id);
    }
  }
  if (status === 'declined') { const admin = createAdminClient(); if (admin) await admin.from('holds').update({ status: 'released', note: 'borrow declined' }).eq('loan_id', loanId).eq('status', 'held'); }
  revalidatePath('/friends'); revalidatePath('/statement');
  return { ok: true };
}
