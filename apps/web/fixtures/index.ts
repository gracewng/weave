/**
 * DEVIN-OWNED (task 3). Everything DEMO_MODE=true needs, with no external service reachable.
 * Dates are relative to today, so the demo never goes stale: return windows stay open and the two
 * "last 48 hours" charges are always in the last 48 hours.
 */
import type { Fixtures, ShoppingResult, UsedListing } from '@weave/shared/contracts';
import { fixtureEmails, fixtureExtractEmail } from './emails';
import { fixtureCharges } from './charges';
import { fixtureUsedListings, fixtureShoppingResults, fixtureProductPages } from './search';
import { fixtureParseQuery, fixtureSearchNote, fixtureBorrowMessage } from './llm';

export const fixtures: Fixtures = {
  emails: fixtureEmails,
  charges: fixtureCharges,
  usedListings: fixtureUsedListings,
  shoppingResults: fixtureShoppingResults,
  productPages: fixtureProductPages,
  llm: {
    extract_email: fixtureExtractEmail,
    parse_query: fixtureParseQuery,
    search_note: fixtureSearchNote,
    borrow_message: fixtureBorrowMessage,
  },
};

/**
 * Keys are query prefixes, so "black slip dress for a wedding" finds the "black slip dress" bucket.
 * Longest matching key wins; null when nothing matches (callers should show an honest empty state).
 */
export function lookupByQueryPrefix<T>(table: Record<string, T[]>, query: string): T[] | null {
  const q = query.toLowerCase().trim();
  let best: { key: string; value: T[] } | null = null;
  for (const [key, value] of Object.entries(table)) {
    if ((q.startsWith(key) || q.includes(key)) && (!best || key.length > best.key.length)) best = { key, value };
  }
  return best?.value ?? null;
}

export function fixtureUsedFor(query: string): UsedListing[] | null {
  return lookupByQueryPrefix(fixtures.usedListings, query);
}

export function fixtureShoppingFor(query: string): ShoppingResult[] | null {
  return lookupByQueryPrefix(fixtures.shoppingResults, query);
}

export * from './emails';
export * from './charges';
export * from './search';
export * from './llm';
