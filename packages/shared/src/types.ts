/** Row types mirroring /supabase/migrations. Keep in sync with the schema (Claude-owned). */

export type Category = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'accessory' | 'intimates' | 'other';
export type Slot = 'top' | 'bottom' | 'one_piece' | 'outer' | 'shoes' | 'accessory';
export type ItemSource = 'email' | 'receipt' | 'tag' | 'photo' | 'quick_add' | 'mystery' | 'search';
export type ImageSource = 'email' | 'product_page' | 'identifier' | 'shopping' | 'lens' | 'user_photo' | 'cutout' | 'none';
export type ItemStatus = 'owned' | 'returning' | 'returned' | 'sold' | 'donated' | 'gifted';
export type LoanStatus = 'requested' | 'accepted' | 'declined' | 'out' | 'returned';
export type MatchStatus = 'unmatched' | 'matched' | 'captured' | 'mystery' | 'skipped';
export type Verdict = 'skip' | 'borrow' | 'secondhand' | 'wait' | 'buy';
export type HoldStatus = 'held' | 'skipped' | 'borrowed' | 'bought_used' | 'bought' | 'released';
export type ChargeDecision = 'keep' | 'returning' | 'not_clothes' | 'gift';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  sizes: Record<string, string>;
  invite_code: string | null;
  /** Onboarding basics — image matching + mismatch flags only. Never shown to friends. */
  age_range: AgeRange | null;
  gender: Gender | null;
  shops_department: Department | null;
  onboarded_at: string | null;
  /** True once the whole onboarding (basics + bank step) is done. */
  onboarding_complete: boolean;
  bio: string | null;
  /** Self-reported, free text ("Cambridge, MA"). Never device location. Shown to friends. */
  area: string | null;
}
export type AgeRange = 'under_18' | '18_24' | '25_34' | '35_44' | '45_54' | '55_plus' | 'prefer_not';
export type Gender = 'woman' | 'man' | 'non_binary' | 'prefer_not';
export type Department = 'womens' | 'mens' | 'both' | 'kids';

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
  image_source: ImageSource | null;
  identifier: string | null;
  product_url: string | null;
  receipt_url: string | null;
  source: ItemSource;
  return_by: string | null;
  status: ItemStatus;
  return_initiated_at: string | null;
  refund_cents: number | null;
  refunded_at: string | null;
  sold_cents: number | null;
  sold_at: string | null;
  department: 'womens' | 'mens' | 'unisex' | 'kids' | 'unknown' | null;
  profile_mismatch: boolean;
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
  updated_at: string;
}

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
  decision: ChargeDecision | null;
  decided_at: string | null;
  plaid_category: string | null;
  pending: boolean;
  source: 'plaid' | 'mock';
}

export interface Budget {
  user_id: string;
  monthly_income_cents: number | null;
  clothing_pct: number;
  envelope_override_cents: number | null;
  updated_at: string;
}

/** Ghost Rack row: something searched for and not bought (yet). */
export interface Hold {
  id: string;
  user_id: string;
  title: string;
  url: string | null;
  image_url: string | null;
  /** Intended (new) price. */
  price_cents: number;
  intended_source: string | null;
  query: string | null;
  verdict: Verdict | null;
  similar_item_ids: string[];
  friend_item_ids: string[];
  cheapest_used_cents: number | null;
  status: HoldStatus;
  outcome_confirmed_at: string | null;
  actual_paid_cents: number | null;
  loan_id: string | null;
  owned_item_id: string | null;
  /** Money Kept — valid only when outcome_confirmed_at is set. */
  kept_cents: number;
  for_other: boolean;
  note: string | null;
  release_at: string | null;
  created_at: string;
  updated_at: string;
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
