/** Row types mirroring /supabase/migrations. Keep in sync with the schema (Claude-owned). */

export type Category = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'accessory' | 'intimates' | 'other';
export type Slot = 'top' | 'bottom' | 'one_piece' | 'outer' | 'shoes' | 'accessory';
export type ItemSource = 'email' | 'receipt' | 'tag' | 'photo' | 'quick_add' | 'mystery' | 'intervention';
export type ItemStatus = 'owned' | 'returned' | 'sold' | 'donated';
export type VoicePersona = 'bestie' | 'stylist' | 'cfo';
export type LoanStatus = 'requested' | 'accepted' | 'declined' | 'out' | 'returned';
export type MatchStatus = 'unmatched' | 'matched' | 'captured' | 'mystery' | 'skipped';
export type Verdict = 'skip' | 'borrow' | 'secondhand' | 'wait' | 'buy';
export type Decision = 'skipped' | 'borrowed' | 'bought_secondhand' | 'queued' | 'bought' | 'pending';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  sizes: Record<string, string>;
  voice_persona: VoicePersona;
  invite_code: string | null;
}

export interface Item {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  category: Category | null;
  slot: Slot | null;
  color: string | null;
  formality: number | null;
  size: string | null;
  price_cents: number | null;
  purchase_date: string | null;
  retailer: string | null;
  image_url: string | null;
  source: ItemSource;
  return_by: string | null;
  status: ItemStatus;
  shareable: boolean;
  lendable: boolean;
  est_resale_cents: number | null;
  description: string | null;
  embedding?: number[] | string | null;
  created_at: string;
}

/** What a friend sees — the `friend_items` view. No prices, dates, retailer, or resale value. */
export interface FriendItem {
  id: string;
  owner_id: string;
  owner_name: string | null;
  owner_avatar: string | null;
  owner_sizes: Record<string, string>;
  name: string;
  brand: string | null;
  category: Category | null;
  slot: Slot | null;
  color: string | null;
  formality: number | null;
  size: string | null;
  image_url: string | null;
  status: ItemStatus;
  lendable: boolean;
  description: string | null;
  created_at: string;
}

export interface Friendship { user_a: string; user_b: string; status: 'pending' | 'accepted'; created_at: string }

export interface Loan {
  id: string;
  item_id: string;
  owner_id: string;
  borrower_id: string;
  status: LoanStatus;
  event_name: string | null;
  needed_on: string | null;
  due_back: string | null;
  message: string | null;
  saved_cents: number | null;
  created_at: string;
}

export interface Crew { id: string; name: string | null; event_date: string | null; dress_code: string | null; vibe: string | null; created_by: string | null }
export interface CrewLook { id: string; crew_id: string; user_id: string; item_ids: string[]; borrowed_item_ids: string[]; rationale: string | null; accepted: boolean }

export interface Transaction {
  id: string;
  user_id: string;
  external_id: string | null;
  merchant: string | null;
  amount_cents: number | null;
  date: string | null;
  is_clothing: boolean | null;
  match_status: MatchStatus;
  item_ids: string[];
}

export interface Intervention {
  id: string;
  user_id: string;
  product_title: string | null;
  product_url: string | null;
  product_image: string | null;
  price_cents: number | null;
  similar_item_ids: string[] | null;
  friend_item_ids: string[] | null;
  outfits_unlocked: number | null;
  verdict: Verdict | null;
  decision: Decision | null;
  saved_cents: number;
  remind_at: string | null;
  created_at: string;
}

export interface LlmCallRow {
  id: number;
  user_id: string | null;
  task: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  cost_usd: number;
  latency_ms: number;
  fell_back: boolean;
  created_at: string;
}
