/**
 * DEVIN-OWNED. Fixture SerpAPI client (Google Shopping + Google Lens shapes).
 *
 * The live SerpAPI calls live in `apps/web/lib/identify.ts` (working, with the product_lookups cache and the
 * image judge); per docs/devin-tasks.md status note task 2 is scoped to eBay + ElevenLabs, so this package
 * supplies the fixture side only and `getClients({ serp })` lets the web app inject its real implementation.
 */
import type { SerpClient, ShoppingResult } from '@weave/shared/contracts';
import { fixtureLatency } from '@weave/shared/env';

const r = (
  title: string,
  merchant: string,
  priceCents: number | null,
  slug: string,
  productOnly: boolean | null = true,
): ShoppingResult => ({
  title,
  imageUrl: `https://serpapi.example/fixture/${slug}.jpg`,
  priceCents,
  merchant,
  url: `https://www.google.com/shopping/product/fixture-${slug}`,
  productOnly,
});

const SHOPPING: Record<string, ShoppingResult[]> = {
  'uniqlo black crew neck t-shirt': [
    r('Uniqlo U Crew Neck Short-Sleeve T-Shirt, Black', 'Uniqlo', 1_990, 'uniqlo-u-crew-black'),
    r('Uniqlo Supima Cotton Crew Neck T-Shirt, Black', 'Uniqlo', 1_490, 'uniqlo-supima-black'),
    r('Uniqlo Airism Cotton Crew Neck T-Shirt, Black', 'Uniqlo', 1_990, 'uniqlo-airism-black'),
    r('Black Crewneck Tee', 'Amazon.com', 1_299, 'generic-black-tee', false),
  ],
  "levi's 501 jeans": [
    r("Levi's 501 Original Fit Men's Jeans", "Levi's", 6_950, 'levis-501-original'),
    r("Levi's 501 '93 Straight Fit Jeans", "Levi's", 9_800, 'levis-501-93'),
    r("Levi's 501 Original Fit Jeans, Medium Stonewash", 'Nordstrom', 6_950, 'levis-501-nordstrom'),
  ],
  'black slip dress': [
    r('Satin Bias Cut Slip Dress, Black', 'Reformation', 14_800, 'reformation-slip', true),
    r('Silk Slip Midi Dress, Black', 'Everlane', 12_800, 'everlane-slip'),
    r('Satin Slip Dress', 'Zara', 4_990, 'zara-slip', false),
  ],
  'everlane trench coat': [
    r('The Trench Coat, Khaki', 'Everlane', 29_800, 'everlane-trench'),
    r('ReNew Long Trench Coat', 'Everlane', 22_800, 'everlane-renew-trench'),
  ],
  'madewell striped tee': [
    r('Whisper Cotton Crewneck Tee in Stripe', 'Madewell', 2_950, 'madewell-stripe-tee'),
    r('Perfect Vintage Striped Tee', 'Madewell', 3_950, 'madewell-vintage-stripe', null),
  ],
  'dr martens 1460 boots': [
    r('Dr. Martens 1460 Smooth Leather Lace Up Boots, Black', 'Dr. Martens', 17_000, 'dm-1460'),
    r('Dr. Martens 1460 Boots', 'Nordstrom', 17_000, 'dm-1460-nordstrom'),
  ],
};

/** Fake perceptual hashes so the lens mock is keyed by "image" the way the real endpoint is. */
const LENS_BY_HASH: Record<string, keyof typeof SHOPPING> = {
  '9f1c': 'uniqlo black crew neck t-shirt',
  'a20b': "levi's 501 jeans",
  c73d: 'black slip dress',
  e015: 'everlane trench coat',
};

/** Cheap deterministic stand-in for a perceptual hash of the image bytes. */
export function fakeImageHash(imageUrl: string): string {
  let h = 0;
  for (const ch of imageUrl) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h.toString(16).slice(0, 4).padStart(4, '0');
}

function bestMatch(query: string): ShoppingResult[] {
  const q = query.toLowerCase();
  let best: { hits: number; results: ShoppingResult[] } | null = null;
  for (const [key, results] of Object.entries(SHOPPING)) {
    const hits = key.split(/[^a-z0-9']+/).filter((t) => t.length > 2 && q.includes(t)).length;
    if (hits && (!best || hits > best.hits)) best = { hits, results };
  }
  return best?.results ?? SHOPPING['uniqlo black crew neck t-shirt']!;
}

export function createSerpMock(): SerpClient {
  return {
    async shoppingResults(query, opts = {}) {
      await fixtureLatency();
      return bestMatch(query).slice(0, opts.limit ?? 6);
    },
    async lens(imageUrl, opts = {}) {
      await fixtureLatency();
      const key = LENS_BY_HASH[fakeImageHash(imageUrl)];
      const results = key ? SHOPPING[key]! : bestMatch(imageUrl);
      return results.slice(0, opts.limit ?? 6);
    },
  };
}
