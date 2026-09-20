/**
 * DEVIN-OWNED. Fixture eBay client: used when DEMO_MODE=true and whenever the real call throws.
 * Listings are plausible stand-ins (prices in the real used range for each garment), not live data —
 * every one is `source: 'fixture'` so the UI can label it.
 */
import type { EbayClient, UsedListing } from '@weave/shared/contracts';
import { fixtureLatency } from '@weave/shared/env';
import { median } from './ebay';

type Fixture = { keywords: string[]; listings: Array<Omit<UsedListing, 'source'>> };

const IMG = (slug: string) => `https://i.ebayimg.com/images/g/fixture-${slug}/s-l500.jpg`;

const FIXTURES: Fixture[] = [
  {
    keywords: ['uniqlo', 'crew', 'tee', 't-shirt', 'crewneck'],
    listings: [
      { title: 'Uniqlo U Crew Neck T-Shirt Black M', priceCents: 900, url: 'https://www.ebay.com/itm/fixture-uniqlo-tee-1', imageUrl: IMG('uniqlo-tee-1'), condition: 'Pre-owned' },
      { title: 'Uniqlo Supima Cotton Crewneck Tee Black Medium', priceCents: 1_400, url: 'https://www.ebay.com/itm/fixture-uniqlo-tee-2', imageUrl: IMG('uniqlo-tee-2'), condition: 'Like new' },
      { title: 'Uniqlo U Heavyweight Tee Black M NWOT', priceCents: 1_850, url: 'https://www.ebay.com/itm/fixture-uniqlo-tee-3', imageUrl: IMG('uniqlo-tee-3'), condition: 'New without tags' },
    ],
  },
  {
    keywords: ['levi', '501', 'jeans', 'denim'],
    listings: [
      { title: "Levi's 501 Original Fit Jeans W30 L32 Medium Wash", priceCents: 2_600, url: 'https://www.ebay.com/itm/fixture-501-1', imageUrl: IMG('501-1'), condition: 'Pre-owned' },
      { title: "Levi's 501 Straight Leg Button Fly Jeans 30x32", priceCents: 3_700, url: 'https://www.ebay.com/itm/fixture-501-2', imageUrl: IMG('501-2'), condition: 'Very good' },
      { title: "Vintage Levi's 501 Dark Wash Jeans 30x32", priceCents: 5_200, url: 'https://www.ebay.com/itm/fixture-501-3', imageUrl: IMG('501-3'), condition: 'Pre-owned' },
    ],
  },
  {
    keywords: ['slip', 'dress', 'satin', 'midi'],
    listings: [
      { title: 'Black Satin Slip Dress Midi Size S', priceCents: 2_200, url: 'https://www.ebay.com/itm/fixture-slip-1', imageUrl: IMG('slip-1'), condition: 'Pre-owned' },
      { title: 'Reformation-style Bias Cut Slip Dress Black 4', priceCents: 4_200, url: 'https://www.ebay.com/itm/fixture-slip-2', imageUrl: IMG('slip-2'), condition: 'Like new' },
      { title: 'Silk Slip Dress Black Small Excellent Condition', priceCents: 6_800, url: 'https://www.ebay.com/itm/fixture-slip-3', imageUrl: IMG('slip-3'), condition: 'Very good' },
    ],
  },
  {
    keywords: ['trench', 'coat', 'jacket', 'blazer'],
    listings: [
      { title: 'Everlane Trench Coat Khaki Size 4', priceCents: 6_500, url: 'https://www.ebay.com/itm/fixture-trench-1', imageUrl: IMG('trench-1'), condition: 'Pre-owned' },
      { title: 'Classic Belted Trench Coat Beige S', priceCents: 8_900, url: 'https://www.ebay.com/itm/fixture-trench-2', imageUrl: IMG('trench-2'), condition: 'Very good' },
    ],
  },
  {
    keywords: ['sweater', 'cashmere', 'knit', 'cardigan'],
    listings: [
      { title: 'Merino Wool Crewneck Sweater Grey M', priceCents: 2_400, url: 'https://www.ebay.com/itm/fixture-knit-1', imageUrl: IMG('knit-1'), condition: 'Pre-owned' },
      { title: 'Everlane Cashmere Crew Sweater Oatmeal S', priceCents: 4_800, url: 'https://www.ebay.com/itm/fixture-knit-2', imageUrl: IMG('knit-2'), condition: 'Like new' },
    ],
  },
  {
    keywords: ['boots', 'shoes', 'sneakers', 'loafers'],
    listings: [
      { title: 'Dr. Martens 1460 Boots Black UK 6', priceCents: 5_500, url: 'https://www.ebay.com/itm/fixture-boots-1', imageUrl: IMG('boots-1'), condition: 'Pre-owned' },
      { title: 'Leather Chelsea Boots Black Size 7', priceCents: 7_400, url: 'https://www.ebay.com/itm/fixture-boots-2', imageUrl: IMG('boots-2'), condition: 'Very good' },
    ],
  },
];

/** Generic pre-owned listings so an unknown query still shows a secondhand option in the demo. */
const GENERIC: Fixture['listings'] = [
  { title: 'Pre-owned similar item (fixture)', priceCents: 1_900, url: 'https://www.ebay.com/itm/fixture-generic-1', imageUrl: IMG('generic-1'), condition: 'Pre-owned' },
  { title: 'Pre-owned similar item, like new (fixture)', priceCents: 3_400, url: 'https://www.ebay.com/itm/fixture-generic-2', imageUrl: IMG('generic-2'), condition: 'Like new' },
];

function pick(query: string): Fixture['listings'] {
  const q = query.toLowerCase();
  let best: { hits: number; listings: Fixture['listings'] } | null = null;
  for (const f of FIXTURES) {
    const hits = f.keywords.filter((k) => q.includes(k)).length;
    if (hits && (!best || hits > best.hits)) best = { hits, listings: f.listings };
  }
  return best?.listings ?? GENERIC;
}

export function createEbayMock(): EbayClient {
  return {
    async searchUsed(query, opts = {}) {
      await fixtureLatency();
      return pick(query)
        .filter((l) => opts.maxPriceCents == null || l.priceCents <= opts.maxPriceCents)
        .map((l) => ({ ...l, source: 'fixture' as const }))
        .sort((a, b) => a.priceCents - b.priceCents)
        .slice(0, opts.limit ?? 10);
    },
    async soldMedianCents(query) {
      await fixtureLatency();
      const prices = pick(query).map((l) => l.priceCents).sort((a, b) => a - b);
      return median(prices);
    },
  };
}
