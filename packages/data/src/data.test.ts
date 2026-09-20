import { describe, expect, it } from 'vitest';
import {
  alternatives,
  bestAlternatives,
  byMerchant,
  bySenderDomain,
  describeAlternatives,
  marketplaces,
  normalizeMerchant,
  retailLinks,
  retailerData,
  returnWindowFor,
  secondhandLinks,
} from './index';
import { retailers } from './retailers';
import { returnPolicies } from './returnPolicies';

describe('dataset integrity', () => {
  it('has ~60 retailers with unique ids', () => {
    expect(retailers.length).toBeGreaterThanOrEqual(60);
    expect(new Set(retailers.map((r) => r.id)).size).toBe(retailers.length);
  });

  it('every retailer has sender domains and merchant variants', () => {
    for (const r of retailers) {
      expect(r.senderDomains.length, r.id).toBeGreaterThan(0);
      expect(r.merchantVariants.length, r.id).toBeGreaterThan(0);
      for (const d of r.senderDomains) expect(d, r.id).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/);
    }
  });

  it('every return policy points at a known retailer and has a source', () => {
    const ids = new Set(retailers.map((r) => r.id));
    expect(returnPolicies.length).toBeGreaterThanOrEqual(25);
    for (const p of returnPolicies) {
      expect(ids.has(p.retailerId), p.retailerId).toBe(true);
      expect(p.source, p.retailerId).toMatch(/^https:\/\//);
      if (p.windowDays !== null) expect(p.windowDays, p.retailerId).toBeGreaterThan(0);
    }
    expect(new Set(returnPolicies.map((p) => p.retailerId)).size).toBe(returnPolicies.length);
  });
});

describe('bySenderDomain', () => {
  const cases: Array<[string, string | undefined]> = [
    ['email.uniqlo.com', 'uniqlo'],
    ['uniqlo.com', 'uniqlo'],
    ['EM.TARGET.COM', 'target'],
    ['orders.amazon.com', 'amazon'],
    ['eml.nordstrom.com', 'nordstrom'],
    ['nordstromrack.com', 'nordstrom_rack'],
    ['oldnavy.com', 'old_navy'],
    ['email.thereformation.com', 'reformation'],
    ['mail.depop.com', 'depop'],
    ['info.lululemon.com', 'lululemon'],
    ['notifications.nike.com', 'nike'],
    ['news.yourbank.com', undefined],
  ];
  it.each(cases)('%s → %s', (domain, id) => {
    expect(bySenderDomain(domain)?.id).toBe(id);
  });

  it('accepts a full address', () => {
    expect(bySenderDomain('Uniqlo <no-reply@email.uniqlo.com>')?.id).toBe('uniqlo');
  });

  it('does not match a lookalike domain', () => {
    expect(bySenderDomain('notuniqlo.com')).toBeUndefined();
  });
});

describe('byMerchant', () => {
  const cases: Array<[string, string | undefined]> = [
    ['UNIQLO NEWBURY ST', 'uniqlo'],
    ['SQ *UNIQLO NEWBURY', 'uniqlo'],
    ['AMZN Mktp US*2K4', 'amazon'],
    ['AMAZON.COM*RT4XY9', 'amazon'],
    ['ZARA USA #0421', 'zara'],
    ['H&M 0512 BOSTON', 'hm'],
    ['NORDSTROM RACK #212', 'nordstrom_rack'],
    ['NORDSTROM.COM', 'nordstrom'],
    ['TST* LULULEMON 4471', 'lululemon'],
    ['OLD NAVY US 06122', 'old_navy'],
    ['FOOTLOCKER 0234 CAMBRIDGE', 'foot_locker'],
    ['LEVIS OUTLET #112', 'levis'],
    ['SHELL OIL 1234', undefined],
  ];
  it.each(cases)('%s → %s', (merchant, id) => {
    expect(byMerchant(merchant)?.id).toBe(id);
  });

  it('longest variant wins over its prefix', () => {
    expect(byMerchant('NORDSTROM RACK BOSTON')?.id).toBe('nordstrom_rack');
    expect(byMerchant('NORDSTROM BOSTON')?.id).toBe('nordstrom');
  });

  it('normalizes punctuation and whitespace', () => {
    expect(normalizeMerchant('  SQ *UNIQLO   #123 ')).toBe('SQ UNIQLO 123');
    expect(byMerchant('')).toBeUndefined();
  });
});

describe('returnWindowFor', () => {
  it.each([
    ['zara', 30],
    ['shein', 35],
    ['asos', 28],
    ['zappos', 365],
    ['aritzia', 14],
    ['nike', 60],
    ['target', 90],
  ] as Array<[string, number]>)('%s → %i days', (id, days) => {
    expect(returnWindowFor(id)).toBe(days);
  });

  it('returns null for final-sale resale marketplaces', () => {
    expect(returnWindowFor('depop')).toBeNull();
    expect(returnWindowFor('grailed')).toBeNull();
  });

  it('defaults to 30 for unknown or missing retailers', () => {
    expect(returnWindowFor('some-boutique')).toBe(30);
    expect(returnWindowFor(null)).toBe(30);
    expect(returnWindowFor(undefined)).toBe(30);
  });
});

describe('retailerData facade', () => {
  it('exposes the same helpers and the 30-day default', () => {
    expect(retailerData.defaultReturnWindowDays).toBe(30);
    expect(retailerData.bySenderDomain('email.uniqlo.com')?.name).toBe('Uniqlo');
    expect(retailerData.byMerchant('UNIQLO NEWBURY ST')?.id).toBe('uniqlo');
    expect(retailerData.returnWindowFor('zara')).toBe(30);
  });

  it('marks mixed retailers', () => {
    expect(retailerData.byMerchant('AMZN Mktp US*2K4')?.mixed).toBe(true);
    expect(retailerData.byMerchant('UNIQLO')?.mixed).toBe(false);
  });
});

describe('marketplaces', () => {
  const q = 'black slip dress';

  it('returns ≥5 secondhand links, secondhand before retail', () => {
    const second = secondhandLinks(q);
    expect(second.length).toBeGreaterThanOrEqual(5);
    expect(second.every((m) => m.kind === 'secondhand')).toBe(true);
    const kinds = marketplaces.map((m) => m.kind);
    expect(kinds.lastIndexOf('secondhand')).toBeLessThan(kinds.indexOf('retail'));
  });

  it('builds URL-encoded, parseable search URLs with the query in them', () => {
    for (const link of [...secondhandLinks(q), ...retailLinks(q)]) {
      const url = new URL(link.url);
      expect(url.protocol, link.id).toBe('https:');
      expect(link.url, link.id).not.toContain(' ');
      expect(decodeURIComponent(url.search), link.id).toContain(q);
    }
  });

  it('filters eBay to pre-owned and ends on Google Shopping as the retail tier', () => {
    expect(secondhandLinks(q).find((m) => m.id === 'ebay')!.url).toContain('LH_ItemCondition=3000');
    const retail = retailLinks(q);
    expect(retail).toHaveLength(1);
    expect(retail[0]!.id).toBe('google_shopping');
  });

  it('escapes characters that would break a query string', () => {
    const query = "levi's 501 & jacket";
    for (const link of secondhandLinks(query)) {
      expect(link.url, link.id).toContain(encodeURIComponent(query));
      const url = new URL(link.url);
      const firstParam = url.search.slice(1).split('=')[0] ?? '';
      expect(url.searchParams.get(firstParam), link.id).toBe(query);
    }
  });

  it('has unique ids', () => {
    expect(new Set(marketplaces.map((m) => m.id)).size).toBe(marketplaces.length);
  });
});

describe('money alternatives', () => {
  it('has ≥8 sourced alternatives with unique ids', () => {
    expect(alternatives.length).toBeGreaterThanOrEqual(8);
    expect(new Set(alternatives.map((a) => a.id)).size).toBe(alternatives.length);
    for (const a of alternatives) expect(a.source, a.id).toMatch(/^https:\/\//);
  });

  it('bestAlternatives(4900) returns 3 readable phrases', () => {
    const phrases = describeAlternatives(4900);
    expect(phrases).toHaveLength(3);
    for (const p of phrases) expect(p).toMatch(/^(\d+(\.\d)?\s\S|\$\d)/);
  });

  it('describes with at most one decimal and singular units at 1', () => {
    expect(describeAlternatives(1199).some((p) => p === '1 month of Spotify')).toBe(true);
    for (const phrase of describeAlternatives(4900)) expect(phrase).not.toMatch(/\d\.\d\d/);
  });

  it('only offers counts between 0.5 and 50', () => {
    for (const cents of [1500, 4900, 12800, 250000]) {
      for (const a of bestAlternatives(cents, 10)) {
        const n = a.count(cents);
        if (n !== null) {
          expect(n, `${a.id} @ ${cents}`).toBeGreaterThanOrEqual(0.5);
          expect(n, `${a.id} @ ${cents}`).toBeLessThanOrEqual(50);
        }
      }
    }
  });

  it('compounds the invested comparison at 7% for 10 years', () => {
    const invested = alternatives.find((a) => a.id === 'invested_10y')!;
    expect(invested.describe(10000)).toBe('$197 in 10 years at 7%');
    expect(invested.count(10000)).toBeNull();
  });

  it('returns nothing for zero, negative, or unusable amounts', () => {
    expect(bestAlternatives(0)).toEqual([]);
    expect(bestAlternatives(-500)).toEqual([]);
    expect(bestAlternatives(Number.NaN)).toEqual([]);
  });
});
