import { describe, expect, it } from 'vitest';
import { daysApart, matchTransaction, merchantMatches, normalizeMerchant, type OrderLike } from './matcher';

describe('normalizeMerchant', () => {
  const cases: Array<[string, string]> = [
    ['SQ *UNIQLO NEWBURY', 'uniqlo newbury'],
    ['UNIQLO USA LLC', 'uniqlo'],
    ['AMZN Mktp US*2K4L9', 'amzn mktp 2k4l9'],   // an alphanumeric order ref survives; only 3+ digit runs are dropped
    ['ZARA #2041 BOSTON', 'zara boston'],
    ['NORDSTROM.COM', 'nordstrom'],
    ['TST* MADEWELL 1204', 'madewell'],
  ];
  it.each(cases)('%s → %s', (raw, expected) => {
    expect(normalizeMerchant(raw)).toBe(expected);
  });

  it('is empty for a string of only noise', () => {
    expect(normalizeMerchant('SQ *#12345')).toBe('');
  });
});

describe('merchantMatches', () => {
  it('matches statement strings to retailer names in either direction', () => {
    expect(merchantMatches('SQ *UNIQLO NEWBURY', 'Uniqlo')).toBe(true);
    expect(merchantMatches('ZARA', 'Zara USA')).toBe(true);
    expect(merchantMatches('MADEWELL 1204', 'Madewell')).toBe(true);
  });

  it('matches on a shared first token of 4+ characters', () => {
    expect(merchantMatches('EVERLANE SF', 'Everlane Inc')).toBe(true);
  });

  it('does not match unrelated retailers', () => {
    expect(merchantMatches('ZARA', 'Uniqlo')).toBe(false);
    expect(merchantMatches('SHELL OIL 4412', 'Shein')).toBe(false);
  });

  it('never matches on empty input', () => {
    expect(merchantMatches('', 'Uniqlo')).toBe(false);
    expect(merchantMatches('SQ *#1234', 'Uniqlo')).toBe(false);
  });
});

describe('daysApart', () => {
  it('is absolute and order-independent', () => {
    expect(daysApart('2026-09-18', '2026-09-14')).toBe(4);
    expect(daysApart('2026-09-14', '2026-09-18')).toBe(4);
    expect(daysApart('2026-09-14', '2026-09-14')).toBe(0);
  });

  it('counts across a month boundary', () => {
    expect(daysApart('2026-10-01', '2026-09-29')).toBe(2);
  });
});

describe('matchTransaction', () => {
  const orders: OrderLike[] = [
    { id: 'o-uniqlo', retailer: 'Uniqlo', totalCents: 5_000, date: '2026-09-14' },
    { id: 'o-zara', retailer: 'Zara', totalCents: 12_000, date: '2026-09-02' },
  ];

  it('matches a messy statement string to its order', () => {
    const m = matchTransaction({ merchant: 'SQ *UNIQLO NEWBURY', amountCents: 5_000, date: '2026-09-14' }, orders);
    expect(m).toEqual({ orderId: 'o-uniqlo', score: 1 });
  });

  it('accepts a 10% amount difference — measured against the larger amount — but not past it', () => {
    const order: OrderLike[] = [{ id: 'o', retailer: 'Uniqlo', totalCents: 4_500, date: '2026-09-14' }];
    const at = matchTransaction({ merchant: 'UNIQLO', amountCents: 5_000, date: '2026-09-14' }, order);
    expect(at?.orderId).toBe('o');
    expect(at?.score).toBeCloseTo(0.5, 5);
    expect(matchTransaction({ merchant: 'UNIQLO', amountCents: 5_010, date: '2026-09-14' }, order)).toBeNull();
  });

  it('accepts ±4 days but not 5', () => {
    for (const date of ['2026-09-10', '2026-09-18']) {
      expect(matchTransaction({ merchant: 'UNIQLO', amountCents: 5_000, date }, orders)?.orderId).toBe('o-uniqlo');
    }
    expect(matchTransaction({ merchant: 'UNIQLO', amountCents: 5_000, date: '2026-09-19' }, orders)).toBeNull();
  });

  it('requires the retailer to match even when amount and date line up', () => {
    expect(matchTransaction({ merchant: 'SHELL OIL', amountCents: 5_000, date: '2026-09-14' }, orders)).toBeNull();
  });

  it('prefers the closer amount, then the closer date', () => {
    const sameRetailer: OrderLike[] = [
      { id: 'far', retailer: 'Uniqlo', totalCents: 5_400, date: '2026-09-14' },
      { id: 'near', retailer: 'Uniqlo', totalCents: 5_010, date: '2026-09-16' },
    ];
    expect(matchTransaction({ merchant: 'UNIQLO', amountCents: 5_000, date: '2026-09-14' }, sameRetailer)?.orderId).toBe('near');

    const sameAmount: OrderLike[] = [
      { id: 'later', retailer: 'Uniqlo', totalCents: 5_000, date: '2026-09-17' },
      { id: 'sameday', retailer: 'Uniqlo', totalCents: 5_000, date: '2026-09-14' },
    ];
    expect(matchTransaction({ merchant: 'UNIQLO', amountCents: 5_000, date: '2026-09-14' }, sameAmount)?.orderId).toBe('sameday');
  });

  it('keeps the score inside 0..1', () => {
    const m = matchTransaction({ merchant: 'UNIQLO', amountCents: 5_500, date: '2026-09-18' }, orders);
    expect(m!.score).toBeGreaterThanOrEqual(0);
    expect(m!.score).toBeLessThanOrEqual(1);
  });

  it('returns null with no candidate orders', () => {
    expect(matchTransaction({ merchant: 'UNIQLO', amountCents: 5_000, date: '2026-09-14' }, [])).toBeNull();
  });
});
