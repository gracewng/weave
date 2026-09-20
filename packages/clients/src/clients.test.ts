import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EbayClient, SerpClient } from '@weave/shared/contracts';
import { getClients, setFallbackReporter } from './index';
import { createEbayMock } from './ebay.mock';
import { createSerpMock, fakeImageHash } from './serp.mock';
import { mockTransactions, isClothingCategory, createPlaidMock } from './plaid.mock';
import { median } from './ebay';

afterEach(() => {
  setFallbackReporter(null);
  vi.unstubAllEnvs();
});

describe('ebay fixture', () => {
  const ebay = createEbayMock();

  it('returns cheapest-first used listings for a known query', async () => {
    const out = await ebay.searchUsed('uniqlo black crew neck t-shirt');
    expect(out.length).toBeGreaterThan(1);
    expect(out.map((l) => l.priceCents)).toEqual([...out.map((l) => l.priceCents)].sort((a, b) => a - b));
    expect(out.every((l) => l.source === 'fixture')).toBe(true);
  });

  it('respects maxPriceCents and limit', async () => {
    const out = await ebay.searchUsed("levi's 501 jeans", { maxPriceCents: 3_000, limit: 1 });
    expect(out).toHaveLength(1);
    expect(out[0]!.priceCents).toBeLessThanOrEqual(3_000);
  });

  it('still returns something for an unknown query so secondhand is never empty', async () => {
    expect(await ebay.searchUsed('bright orange bespoke cape')).not.toHaveLength(0);
  });

  it('reports a median sold estimate', async () => {
    expect(await ebay.soldMedianCents('uniqlo tee')).toBe(1_400);
  });
});

describe('median', () => {
  it('averages the middle pair for an even count and is null when empty', () => {
    expect(median([100, 200, 300])).toBe(200);
    expect(median([100, 300])).toBe(200);
    expect(median([])).toBeNull();
  });
});

describe('serp fixture', () => {
  const serp = createSerpMock();

  it('returns shopping candidates with prices in cents', async () => {
    const out = await serp.shoppingResults('uniqlo black crew neck t-shirt', { limit: 3 });
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ merchant: 'Uniqlo', priceCents: 1_990, productOnly: true });
  });

  it('lens returns the fixtures keyed by the image hash', async () => {
    const url = imageUrlForHash('9f1c');
    const out = await serp.lens(url, { limit: 2 });
    expect(out[0]!.title).toContain('Uniqlo');
  });
});

/** Search for a URL the fake hash maps to the wanted bucket — keeps the test independent of the hash function. */
function imageUrlForHash(want: string): string {
  for (let i = 0; i < 100_000; i++) {
    const url = `https://fixtures.example/photo-${i}.jpg`;
    if (fakeImageHash(url) === want) return url;
  }
  throw new Error(`no fixture image url hashes to ${want}`);
}

describe('plaid fixture', () => {
  it('generates 42 transactions over ~18 months, newest first, deterministically', () => {
    const today = new Date('2026-09-20T00:00:00Z');
    const a = mockTransactions(today);
    expect(a).toHaveLength(42);
    expect(a).toEqual(mockTransactions(today));
    expect(a[0]!.date >= a[a.length - 1]!.date).toBe(true);
    const oldest = new Date(a[a.length - 1]!.date);
    const months = (today.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24 * 30);
    expect(months).toBeGreaterThan(15);
    expect(months).toBeLessThan(19);
  });

  it('flags only Plaid clothing & accessories as clothing', () => {
    expect(isClothingCategory('GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES')).toBe(true);
    expect(isClothingCategory('FOOD_AND_DRINK_GROCERIES')).toBe(false);
    expect(isClothingCategory(null)).toBe(false);
    const txs = mockTransactions();
    expect(txs.some((t) => t.isClothingCategory)).toBe(true);
    expect(txs.some((t) => !t.isClothingCategory)).toBe(true);
  });

  it('is caught up once a cursor has been served', async () => {
    const plaid = createPlaidMock();
    const first = await plaid.syncTransactions('access-x', null);
    expect(first.added).toHaveLength(42);
    const second = await plaid.syncTransactions('access-x', first.nextCursor);
    expect(second).toEqual({ added: [], nextCursor: first.nextCursor });
  });
});

describe('getClients', () => {
  it('uses fixtures in demo mode even with credentials present', async () => {
    vi.stubEnv('EBAY_CLIENT_ID', 'id');
    vi.stubEnv('EBAY_CLIENT_SECRET', 'secret');
    const { ebay } = getClients({ demo: true });
    const out = await ebay.searchUsed('uniqlo tee');
    expect(out.every((l) => l.source === 'fixture')).toBe(true);
  });

  it('prefers an injected real client but falls back to the fixture when it throws', async () => {
    const calls: string[] = [];
    setFallbackReporter((r) => calls.push(`${r.client}.${r.method}`));
    const flaky: SerpClient = {
      shoppingResults: async () => {
        throw new Error('serpapi 429');
      },
      lens: async () => [{ title: 'real', imageUrl: 'u', priceCents: 1, merchant: null, url: null, productOnly: null }],
    };
    const { serp } = getClients({ serp: flaky, demo: false });
    expect(await serp.lens('x')).toHaveLength(1);
    expect((await serp.shoppingResults('uniqlo black crew neck t-shirt'))[0]!.merchant).toBe('Uniqlo');
    expect(calls).toEqual(['serp.shoppingResults']);
  });

  it('falls back per call, not per client — a later success still uses the real client', async () => {
    let attempts = 0;
    const sometimes: SerpClient = {
      shoppingResults: async () => {
        attempts++;
        if (attempts === 1) throw new Error('transient');
        return [{ title: 'real', imageUrl: 'u', priceCents: 2, merchant: 'Real', url: null, productOnly: null }];
      },
      lens: async () => [],
    };
    const { serp } = getClients({ serp: sometimes, demo: false });
    expect((await serp.shoppingResults('q'))[0]!.merchant).not.toBe('Real');
    expect((await serp.shoppingResults('q'))[0]!.merchant).toBe('Real');
  });

  it('returns every client in the contract', () => {
    const c = getClients({ demo: true });
    const shapes: Array<[keyof typeof c, string[]]> = [
      ['ebay', ['searchUsed', 'soldMedianCents']],
      ['serp', ['shoppingResults', 'lens']],
      ['plaid', ['createLinkToken', 'exchangePublicToken', 'syncTransactions']],
    ];
    for (const [name, methods] of shapes) {
      for (const m of methods) expect(typeof (c[name] as unknown as Record<string, unknown>)[m]).toBe('function');
    }
  });
});

describe('ebay real client contract', () => {
  it('is typed as an EbayClient', async () => {
    const { createEbayClient } = await import('./ebay');
    vi.stubEnv('EBAY_CLIENT_ID', 'id');
    vi.stubEnv('EBAY_CLIENT_SECRET', 'secret');
    const c: EbayClient = createEbayClient();
    expect(typeof c.searchUsed).toBe('function');
  });
});
