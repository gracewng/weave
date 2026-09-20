/**
 * CONTRACTS — interfaces Devin's packages must satisfy and Claude's app consumes.
 * Changing anything here requires a note in CLAUDE.md ("Contract changes") and telling the lead.
 *
 * Implementers (Devin):  /packages/data  /packages/clients  /apps/web/fixtures  /scripts
 * Consumers (Claude):    /apps/web  /apps/extension/src  /packages/shared
 */
import type { Verdict } from './types';
export type { Verdict };

// ─── /packages/data ───────────────────────────────────────────────────────────

export interface RetailerInfo {
  /** Stable slug, e.g. "uniqlo". */
  id: string;
  /** Display name, e.g. "Uniqlo". */
  name: string;
  /** Email sender domains that pass the pre-LLM allowlist, e.g. ["uniqlo.com", "email.uniqlo.com"]. */
  senderDomains: string[];
  /** Merchant strings as they appear on card statements, e.g. ["UNIQLO", "UNIQLO USA", "UNIQLO NEWBURY"]. */
  merchantVariants: string[];
  /** true for Amazon/Target-style mixed retailers — allowed through, but the model must drop non-clothing lines. */
  mixed: boolean;
  /** Source URL for the data (comment in code too). */
  source?: string;
}

export interface ReturnPolicy {
  retailerId: string;
  /** Days from purchase; null = final sale / no returns. */
  windowDays: number | null;
  notes?: string;
  source?: string;
}

export interface RetailerData {
  retailers: RetailerInfo[];
  returnPolicies: ReturnPolicy[];
  /** Default return window when a retailer has no entry. Spec: 30. */
  defaultReturnWindowDays: number;
  /** Lookup helpers (pure, no I/O). */
  bySenderDomain(domain: string): RetailerInfo | undefined;
  byMerchant(merchantString: string): RetailerInfo | undefined;
  returnWindowFor(retailerId: string | undefined | null): number | null;
}

// ─── /packages/clients ────────────────────────────────────────────────────────

export interface UsedListing {
  title: string;
  priceCents: number;
  url: string;
  imageUrl: string | null;
  condition: string;          // e.g. "Pre-owned", "Like new"
  source: 'ebay' | 'fixture';
}

export interface EbayClient {
  /** Used-condition listings for a query, cheapest first. */
  searchUsed(query: string, opts?: { limit?: number; maxPriceCents?: number }): Promise<UsedListing[]>;
  /** Median sold price for resale estimates, or null if no data. */
  soldMedianCents(query: string): Promise<number | null>;
}

export interface ShoppingResult {
  title: string;
  imageUrl: string;
  priceCents: number | null;
  merchant: string | null;
  url: string | null;
  /** true when the thumbnail looks product-only (flat/white background, no person). Heuristic; null = unknown. */
  productOnly: boolean | null;
}

export interface SerpClient {
  /** Google Shopping results — text query → candidate products (Identify the item, Mystery "pick from store"). */
  shoppingResults(query: string, opts?: { limit?: number }): Promise<ShoppingResult[]>;
  /** Google Lens reverse image search — garment photo → visually matching products. */
  lens(imageUrl: string, opts?: { limit?: number }): Promise<ShoppingResult[]>;
}

export interface PlaidTransaction {
  externalId: string;
  merchant: string;
  amountCents: number;
  /** YYYY-MM-DD */
  date: string;
  /** Plaid personal_finance_category.primary/detailed when present. */
  category: string | null;
  /** true when Plaid's category is clothing & accessories. */
  isClothingCategory: boolean;
}

export interface PlaidClient {
  createLinkToken(userId: string): Promise<{ linkToken: string }>;
  exchangePublicToken(publicToken: string): Promise<{ accessToken: string; itemId: string }>;
  /** Wraps /transactions/sync; returns all added transactions and the next cursor. */
  syncTransactions(accessToken: string, cursor: string | null): Promise<{ added: PlaidTransaction[]; nextCursor: string }>;
}

/** Every client module exports a factory that picks real vs mock by DEMO_MODE. */
export interface Clients {
  ebay: EbayClient;
  serp: SerpClient;
  plaid: PlaidClient;
}

// ─── /apps/web/fixtures ───────────────────────────────────────────────────────

export interface FixtureEmail {
  id: string;
  from: string;
  subject: string;
  /** ISO date */
  date: string;
  /** Raw HTML body — fixtures only; real bodies are never persisted. */
  html: string;
}

export interface FixtureCharge {
  externalId: string;
  merchant: string;
  amountCents: number;
  date: string;
  isClothing: boolean;
}

export interface FixtureProductPage {
  url: string;
  title: string;
  priceCents: number;
  imageUrl: string;
  /** Extracted description used to build the embedding query. */
  description: string;
}

/** Marketplace deep links for the "secondhand" and "new retail" tiers of search (no API needed). */
export interface MarketplaceLink {
  id: string;                 // "depop" | "poshmark" | "thredup" | "ebay" | "google_shopping" ...
  name: string;
  kind: 'secondhand' | 'retail';
  /** Build a search URL for a query. */
  searchUrl(query: string): string;
  logoEmoji?: string;
}

/** "What this could be instead" comparisons for the budget page. Sourced averages, with URLs in comments. */
export interface MoneyAlternative {
  id: string;
  label: string;              // "months of Spotify", "weeks of groceries (1 person)", "invested for 10 years at 7%"
  /** Convert cents to a human count, e.g. 4900 → "4.5 months of Spotify". */
  describe(cents: number): string;
  source?: string;
}

export interface Fixtures {
  emails: FixtureEmail[];
  charges: FixtureCharge[];
  usedListings: Record<string, UsedListing[]>;      // keyed by lowercased query prefix
  shoppingResults: Record<string, ShoppingResult[]>;
  productPages: FixtureProductPage[];
  /** Pre-computed LLM outputs keyed by task, used when both providers are down. */
  llm: {
    extract_email: Record<string, unknown>;      // keyed by FixtureEmail.id — must pass ExtractEmailSchema
    parse_query: Record<string, unknown>;        // keyed by lowercased query — must pass ParseQuerySchema
    search_note: Record<string, string>;         // keyed by verdict
    borrow_message: string;
  };
}

// ─── Verdicts (rules live in /packages/shared; tests are Devin's) ─────────────

export interface VerdictInputs {
  topOwnedSimilarity: number | null;
  topFriendSimilarity: number | null;
  friendItemLendable: boolean;
  oneTimeNeedSignal: boolean;
  priceCents: number;
  cheapestUsedCents: number | null;
  /** Monthly envelope minus spend so far; null when no budget set. */
  budgetRemainingCents: number | null;
  /** Shopping for someone else: owned/borrow rules cannot fire. */
  forOther: boolean;
}

// ─── Money Kept / Recovered (pure, in /packages/shared/src/kept.ts; tests are Devin's) ─

export type HoldOutcome = 'held' | 'skipped' | 'borrowed' | 'bought_used' | 'bought' | 'released';

export interface KeptInputs {
  holds: Array<{
    id: string;
    status: HoldOutcome;
    priceCents: number | null;          // intended new price; null = unknown → excluded from dollars, counted in actions
    actualPaidCents: number | null;     // used price / borrowing cost; null = 0
    outcomeConfirmedAt: string | null;  // unconfirmed → potential only
  }>;
  returns: Array<{
    itemId: string;
    status: 'returning' | 'returned' | 'owned';
    refundCents: number | null;         // confirmed refund net of fees; null = pending
  }>;
}
export interface KeptSummary {
  keptCents: number;                    // confirmed only
  potentialKeptCents: number;           // held + unconfirmed, informational
  byOutcome: { skipped: number; borrowed: number; boughtUsed: number };
  actionsCount: number;                 // confirmed outcomes incl. unpriced ones
  unpricedActions: number;
  recoveredCents: number;               // confirmed refunds only
  pendingRecoveryCount: number;
}

// ─── Closet Coverage (pure, in /packages/shared/src/coverage.ts) ─────────────

export interface CoverageInputs {
  periodStart: string;                  // YYYY-MM-DD
  periodEnd: string;
  transactions: Array<{ id: string; date: string; isClothing: boolean | null; matchStatus: 'unmatched' | 'matched' | 'captured' | 'mystery' | 'skipped'; decision: 'keep' | 'returning' | 'not_clothes' | 'gift' | null; hasReceipt: boolean }>;
  /** Email orders = items grouped by (retailer, purchase_date); always resolved. */
  emailOrders: Array<{ key: string; date: string }>;
}
export interface CoverageSummary {
  detected: number;
  resolved: number;
  ratio: number | null;                 // null when detected = 0 → "Not enough purchase history"
  unresolved: number;
  missingReceipts: number;              // subset of unresolved
  confirmedItems: number;
}

// ─── Budget math (pure, in /packages/shared/src/budget.ts; tests are Devin's) ─

export interface BudgetInputs {
  monthlyIncomeCents: number | null;
  clothingPct: number;               // e.g. 5
  envelopeOverrideCents: number | null;
  spentThisMonthCents: number;
  dayOfMonth: number;
  daysInMonth: number;
}
export interface BudgetSummary {
  envelopeCents: number | null;
  spentCents: number;
  remainingCents: number | null;
  /** Linear projection of month-end spend from pace so far. */
  projectedCents: number;
  /** remaining / envelope, clamped 0..1; null without an envelope. */
  remainingRatio: number | null;
  overBy: number;                    // cents over envelope (0 when under)
}
