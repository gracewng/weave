/**
 * DEVIN-OWNED. Fixture Plaid client.
 *
 * The live Plaid sandbox wrapper lives in `apps/web/lib/plaid.ts` (working: link token, exchange, /transactions/sync
 * pagination, charge classification); per the docs/devin-tasks.md status note task 2 is scoped to eBay + ElevenLabs,
 * so this package supplies the fixture side only and `getClients({ plaid })` lets the web app inject the real one.
 *
 * 42 transactions over 18 months, deterministic (seeded LCG): clothing purchases across known retailers plus
 * non-clothing noise, so the matcher, Mystery Purchases and Closet Coverage all have something to chew on.
 */
import type { PlaidClient, PlaidTransaction } from '@weave/shared/contracts';
import { fixtureLatency } from '@weave/shared/env';

const CLOTHING_DETAILED = 'GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES';

/** Plaid's clothing & accessories category, per personal_finance_category.detailed. */
export function isClothingCategory(detailed: string | null): boolean {
  return detailed === CLOTHING_DETAILED;
}

const CLOTHING_MERCHANTS: Array<[merchant: string, low: number, high: number]> = [
  ['UNIQLO USA LLC', 1_990, 8_950],
  ['SQ *UNIQLO NEWBURY', 2_490, 6_900],
  ['ZARA USA #2041', 3_990, 12_900],
  ['MADEWELL 1204', 4_800, 14_800],
  ['EVERLANE.COM', 3_500, 16_800],
  ['AMZN Mktp US*2K4L9', 1_599, 7_499],
  ['NORDSTROM.COM', 6_500, 24_800],
  ['H&M US 0384', 1_299, 5_990],
  ['LULULEMON BOSTON', 6_800, 12_800],
  ['DEPOP', 1_800, 6_200],
];

const OTHER_MERCHANTS: Array<[merchant: string, detailed: string, low: number, high: number]> = [
  ['TRADER JOE S #512', 'FOOD_AND_DRINK_GROCERIES', 2_100, 9_400],
  ['MBTA CHARLIE', 'TRANSPORTATION_PUBLIC_TRANSIT', 275, 1_500],
  ['SPOTIFY USA', 'ENTERTAINMENT_MUSIC_AND_AUDIO', 1_199, 1_199],
  ['BLUE BOTTLE COFFEE', 'FOOD_AND_DRINK_COFFEE', 425, 980],
  ['CVS/PHARMACY #2201', 'GENERAL_MERCHANDISE_CONVENIENCE_STORES', 800, 4_200],
  ['SHELL OIL 4412', 'TRANSPORTATION_GAS', 3_200, 6_800],
];

/** Mulberry32 — small, deterministic, no dependency. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDaysAgo(days: number, today: Date): string {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** 42 transactions spread over the last 18 months, newest first. */
export function mockTransactions(today = new Date(), seed = 20260920): PlaidTransaction[] {
  const rand = rng(seed);
  const out: PlaidTransaction[] = [];
  for (let i = 0; i < 42; i++) {
    const daysAgo = Math.floor((i / 42) * 540 + rand() * 12);
    const clothing = i % 3 !== 2; // ~2 in 3 are clothing so the wardrobe has enough to reconstruct
    if (clothing) {
      const [merchant, low, high] = CLOTHING_MERCHANTS[Math.floor(rand() * CLOTHING_MERCHANTS.length)]!;
      out.push({
        externalId: `fixture-tx-${i}`,
        merchant,
        amountCents: Math.round(low + rand() * (high - low)),
        date: isoDaysAgo(daysAgo, today),
        category: CLOTHING_DETAILED,
        isClothingCategory: true,
      });
    } else {
      const [merchant, detailed, low, high] = OTHER_MERCHANTS[Math.floor(rand() * OTHER_MERCHANTS.length)]!;
      out.push({
        externalId: `fixture-tx-${i}`,
        merchant,
        amountCents: Math.round(low + rand() * (high - low)),
        date: isoDaysAgo(daysAgo, today),
        category: detailed,
        isClothingCategory: isClothingCategory(detailed),
      });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function createPlaidMock(): PlaidClient {
  return {
    async createLinkToken(userId) {
      await fixtureLatency();
      return { linkToken: `link-sandbox-fixture-${userId}` };
    },
    async exchangePublicToken(publicToken) {
      await fixtureLatency();
      return { accessToken: `access-sandbox-fixture-${publicToken.slice(-6)}`, itemId: 'item-fixture-1' };
    },
    /** One page: a cursor that has already been served returns nothing added, like a real caught-up sync. */
    async syncTransactions(_accessToken, cursor) {
      await fixtureLatency();
      if (cursor) return { added: [], nextCursor: cursor };
      return { added: mockTransactions(), nextCursor: 'cursor-fixture-1' };
    },
  };
}
