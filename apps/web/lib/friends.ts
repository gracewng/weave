import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FriendItem, Loan, Profile } from '@weave/shared/types';

export const SIZE_KEY: Record<string, 'top' | 'bottom' | 'shoes' | null> = { top: 'top', dress: 'top', outerwear: 'top', bottom: 'bottom', shoes: 'shoes', accessory: null, intimates: null, other: null };

/** "In my size": true when we can't tell (no size on item or no profile size for that slot), or sizes match. */
export function inMySize(item: { category: string | null; size: string | null }, mySizes: Record<string, string>): boolean {
  const key = item.category ? SIZE_KEY[item.category] : null;
  if (!key || !item.size) return true;
  const mine = mySizes[key];
  if (!mine) return true;
  return mine.trim().toLowerCase() === item.size.trim().toLowerCase();
}

export async function listFriends(supabase: SupabaseClient, userId: string): Promise<Array<Profile & { since: string }>> {
  const { data: fs } = await supabase.from('friendships').select('user_a,user_b,created_at').eq('status', 'accepted');
  const rows = (fs ?? []) as Array<{ user_a: string; user_b: string; created_at: string }>;
  const ids = rows.map((f) => (f.user_a === userId ? f.user_b : f.user_a));
  if (ids.length === 0) return [];
  const { data: ps } = await supabase.from('profiles').select('*').in('id', ids);
  const since = new Map(rows.map((f) => [f.user_a === userId ? f.user_b : f.user_a, f.created_at]));
  return ((ps ?? []) as Profile[]).map((p) => ({ ...p, since: since.get(p.id) ?? '' }));
}

export async function friendWardrobe(supabase: SupabaseClient, ownerId: string): Promise<FriendItem[]> {
  const { data } = await supabase.from('friend_items').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false });
  return (data ?? []) as FriendItem[];
}

export interface Karma { lent: number; helpedKeepCents: number; borrowed: number }

/** Closet Karma: lending is the status symbol. Helped-keep = Money Kept on holds that this person's loans replaced. */
export async function karmaFor(admin: SupabaseClient, userId: string): Promise<Karma> {
  const { data: loans } = await admin.from('loans').select('id,owner_id,borrower_id,status').or(`owner_id.eq.${userId},borrower_id.eq.${userId}`).in('status', ['out', 'returned']);
  const rows = (loans ?? []) as Array<{ id: string; owner_id: string; borrower_id: string; status: string }>;
  const lentIds = rows.filter((l) => l.owner_id === userId).map((l) => l.id);
  let helped = 0;
  if (lentIds.length) {
    const { data: holds } = await admin.from('holds').select('kept_cents').in('loan_id', lentIds).eq('status', 'borrowed');
    helped = ((holds ?? []) as Array<{ kept_cents: number }>).reduce((s, h) => s + h.kept_cents, 0);
  }
  return { lent: lentIds.length, helpedKeepCents: helped, borrowed: rows.filter((l) => l.borrower_id === userId).length };
}

export type LoanWithNames = Loan & { item_name: string; item_image: string | null; owner_name: string; borrower_name: string };

export async function loansFor(supabase: SupabaseClient, userId: string): Promise<LoanWithNames[]> {
  const { data } = await supabase.from('loans').select('*').or(`owner_id.eq.${userId},borrower_id.eq.${userId}`).order('created_at', { ascending: false });
  const loans = (data ?? []) as Loan[];
  if (loans.length === 0) return [];
  const ids = [...new Set(loans.flatMap((l) => [l.owner_id, l.borrower_id]))];
  const [{ data: ps }, { data: mine }, { data: theirs }] = await Promise.all([
    supabase.from('profiles').select('id,display_name').in('id', ids),
    supabase.from('items').select('id,name,image_url').in('id', loans.map((l) => l.item_id)),          // my own items (RLS)
    supabase.from('friend_items').select('id,name,image_url').in('id', loans.map((l) => l.item_id)),   // friends' shareable items
  ]);
  const names = new Map(((ps ?? []) as Array<{ id: string; display_name: string | null }>).map((p) => [p.id, p.display_name ?? 'Friend']));
  const items = new Map<string, { name: string; image_url: string | null }>();
  for (const it of [...((mine ?? []) as Array<{ id: string; name: string; image_url: string | null }>), ...((theirs ?? []) as Array<{ id: string; name: string; image_url: string | null }>)]) items.set(it.id, it);
  return loans.map((l) => ({ ...l, item_name: items.get(l.item_id)?.name ?? 'Item', item_image: items.get(l.item_id)?.image_url ?? null, owner_name: names.get(l.owner_id) ?? 'Owner', borrower_name: names.get(l.borrower_id) ?? 'Borrower' }));
}
