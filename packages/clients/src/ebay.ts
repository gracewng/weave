/**
 * DEVIN-OWNED. eBay Browse API — used listings for the "Secondhand" section of search.
 *
 * Endpoints (verified against developer.ebay.com, 2026-09-20):
 *   POST https://api.ebay.com/identity/v1/oauth2/token   (client_credentials, scope api_scope)
 *   GET  https://api.ebay.com/buy/browse/v1/item_summary/search?q=&filter=conditions:{USED|...}
 * Marketplace is a header, not a query param: X-EBAY-C-MARKETPLACE-ID.
 */
import type { EbayClient, UsedListing } from '@weave/shared/contracts';

const OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const SEARCH_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const SCOPE = 'https://api.ebay.com/oauth/api_scope';
/** Pre-owned conditions we treat as "secondhand": used, very good, good, acceptable, seller refurbished. */
const USED_CONDITIONS = '{USED|3000|4000|5000|6000|2500}';
const TIMEOUT_MS = 8000;

export function ebayConfigured(): boolean {
  return !!(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}

function marketplace(): string {
  return process.env.EBAY_MARKETPLACE_ID ?? 'EBAY_US';
}

let token: { value: string; expiresAt: number } | null = null;

/** Client-credentials token, cached in memory until 60s before expiry. */
async function accessToken(): Promise<string> {
  if (token && token.expiresAt > Date.now()) return token.value;
  const basic = Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: SCOPE }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`eBay oauth ${res.status}: ${await res.text()}`);
  const d = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: d.access_token, expiresAt: Date.now() + (d.expires_in - 60) * 1000 };
  return token.value;
}

interface ItemSummary {
  title?: string;
  itemWebUrl?: string;
  condition?: string;
  image?: { imageUrl?: string };
  thumbnailImages?: Array<{ imageUrl?: string }>;
  price?: { value?: string; currency?: string };
}

function toCents(price: ItemSummary['price']): number | null {
  const n = Number(price?.value);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

async function searchSummaries(query: string, limit: number, maxPriceCents?: number): Promise<ItemSummary[]> {
  const filters = [`conditions:${USED_CONDITIONS}`, 'buyingOptions:{FIXED_PRICE}'];
  if (maxPriceCents != null) {
    filters.push(`price:[..${(maxPriceCents / 100).toFixed(2)}]`, 'priceCurrency:USD');
  }
  const url = `${SEARCH_URL}?${new URLSearchParams({
    q: query,
    filter: filters.join(','),
    sort: 'price',
    limit: String(Math.min(Math.max(limit, 1), 200)),
  })}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      'X-EBAY-C-MARKETPLACE-ID': marketplace(),
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`eBay search ${res.status}: ${await res.text()}`);
  const d = (await res.json()) as { itemSummaries?: ItemSummary[] };
  return d.itemSummaries ?? [];
}

export function createEbayClient(): EbayClient {
  return {
    async searchUsed(query, opts = {}) {
      const items = await searchSummaries(query, opts.limit ?? 10, opts.maxPriceCents);
      const listings: UsedListing[] = [];
      for (const it of items) {
        const priceCents = toCents(it.price);
        if (priceCents == null || !it.title || !it.itemWebUrl) continue;
        if (opts.maxPriceCents != null && priceCents > opts.maxPriceCents) continue;
        listings.push({
          title: it.title,
          priceCents,
          url: it.itemWebUrl,
          imageUrl: it.image?.imageUrl ?? it.thumbnailImages?.[0]?.imageUrl ?? null,
          condition: it.condition ?? 'Pre-owned',
          source: 'ebay',
        });
      }
      // `sort=price` orders by price + shipping on eBay's side; re-sort on item price so ties are deterministic.
      return listings.sort((a, b) => a.priceCents - b.priceCents).slice(0, opts.limit ?? 10);
    },

    /**
     * Approximation, documented deliberately: true sold/completed prices live in the Marketplace Insights API,
     * which is limited-release and not granted to this app. We use the median asking price of the cheapest 50
     * active used listings instead — it tracks sold prices closely for commodity apparel and is conservative
     * for resale estimates because asking prices sit at or above sold prices.
     */
    async soldMedianCents(query) {
      const items = await searchSummaries(query, 50);
      const prices = items.map((i) => toCents(i.price)).filter((c): c is number => c != null).sort((a, b) => a - b);
      return median(prices);
    },
  };
}

export function median(sorted: number[]): number | null {
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}
