import { describe, expect, it } from 'vitest';
import { ExtractEmailSchema, ParseQuerySchema, VERDICTS } from '@weave/shared/prompts';
import { fixtures, fixtureShoppingFor, fixtureUsedFor } from './index';
import { ORDER_SPECS } from './emails';

const daysAgo = (iso: string) => Math.round((Date.now() - new Date(`${iso}T12:00:00Z`).getTime()) / 86_400_000);

describe('fixture emails', () => {
  it('has 30 emails, all with an id, sender, subject and HTML body', () => {
    expect(fixtures.emails).toHaveLength(30);
    for (const e of fixtures.emails) {
      expect(e.id).toBeTruthy();
      expect(e.from).toMatch(/@/);
      expect(e.subject).toBeTruthy();
      expect(e.html).toContain('<img');
      expect(new Date(e.date).toString()).not.toBe('Invalid Date');
    }
  });

  it('spans 18 months, newest within the last week', () => {
    const ages = fixtures.emails.map((e) => daysAgo(e.date.slice(0, 10)));
    expect(Math.min(...ages)).toBeLessThanOrEqual(7);
    expect(Math.max(...ages)).toBeGreaterThan(400);
  });

  it('every extract_email fixture validates against the schema', () => {
    for (const [id, value] of Object.entries(fixtures.llm.extract_email)) {
      const parsed = ExtractEmailSchema.safeParse(value);
      expect(parsed.success, `${id}: ${parsed.error?.message}`).toBe(true);
    }
  });

  it('covers every email id, and no extras', () => {
    expect(Object.keys(fixtures.llm.extract_email).sort()).toEqual(fixtures.emails.map((e) => e.id).sort());
  });

  it('rejects the two shipping notifications — no items, not a clothing order', () => {
    const shipping = ORDER_SPECS.filter((s) => s.kind === 'shipping');
    expect(shipping).toHaveLength(2);
    for (const s of shipping) {
      const r = ExtractEmailSchema.parse(fixtures.llm.extract_email[s.id]);
      expect(r).toMatchObject({ direction: 'other', is_clothing_order: false, items: [] });
    }
  });

  it('drops the non-clothing lines from the two mixed Amazon orders but keeps image indexes aligned', () => {
    const mixed = ORDER_SPECS.filter((s) => s.retailer === 'Amazon');
    expect(mixed).toHaveLength(2);
    for (const s of mixed) {
      const r = ExtractEmailSchema.parse(fixtures.llm.extract_email[s.id]);
      expect(r.items.length).toBeLessThan(s.lines.length);
      for (const item of r.items) {
        const line = s.lines[item.image_index!]!;
        expect(line.name).toBe(item.name);
        expect(line.clothing).not.toBe(false);
      }
    }
  });

  it('has both single- and multi-item orders', () => {
    const counts = Object.values(fixtures.llm.extract_email).map((v) => ExtractEmailSchema.parse(v).items.length);
    expect(counts.filter((n) => n === 1).length).toBeGreaterThan(5);
    expect(counts.filter((n) => n > 1).length).toBeGreaterThan(5);
  });
});

describe('fixture charges', () => {
  it('covers 18 months with clothing and non-clothing', () => {
    const ages = fixtures.charges.map((c) => daysAgo(c.date));
    expect(Math.max(...ages)).toBeGreaterThan(500);
    expect(fixtures.charges.some((c) => c.isClothing)).toBe(true);
    expect(fixtures.charges.some((c) => !c.isClothing)).toBe(true);
  });

  it('has 2 clothing charges in the last 48 hours', () => {
    const recent = fixtures.charges.filter((c) => c.isClothing && daysAgo(c.date) <= 2);
    expect(recent.length).toBeGreaterThanOrEqual(2);
  });

  it('has at least 6 clothing charges with no order email behind them', () => {
    const mystery = fixtures.charges.filter((c) => c.externalId.startsWith('fx-charge-mystery-'));
    expect(mystery).toHaveLength(6);
    expect(mystery.every((c) => c.isClothing)).toBe(true);
  });

  it('gives every purchase email a matching charge, within the matcher tolerances', () => {
    for (const spec of ORDER_SPECS.filter((s) => s.kind !== 'shipping')) {
      const charge = fixtures.charges.find((c) => c.externalId === `fx-charge-${spec.id}`);
      expect(charge, spec.id).toBeTruthy();
      const emailTotal = spec.lines.reduce((s, l) => s + l.priceCents * (l.quantity ?? 1), 0);
      const diff = Math.abs(charge!.amountCents - emailTotal) / Math.max(charge!.amountCents, emailTotal);
      expect(diff, spec.id).toBeLessThanOrEqual(0.1);
    }
  });

  it('has unique external ids', () => {
    const ids = fixtures.charges.map((c) => c.externalId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('fixture search tiers', () => {
  it('has at least 5 keyed queries for used listings and shopping results', () => {
    expect(Object.keys(fixtures.usedListings).length).toBeGreaterThanOrEqual(5);
    expect(Object.keys(fixtures.shoppingResults).length).toBeGreaterThanOrEqual(5);
  });

  it('resolves a natural query to its bucket by prefix', () => {
    expect(fixtureUsedFor('black slip dress for a wedding')?.[0]!.title).toContain('Slip Dress');
    expect(fixtureShoppingFor('plain black tee')?.[0]!.merchant).toBe('Uniqlo');
    expect(fixtureUsedFor('a llama costume')).toBeNull();
  });

  it('has 6 retail product pages with prices and descriptions', () => {
    expect(fixtures.productPages).toHaveLength(6);
    for (const p of fixtures.productPages) {
      expect(p.priceCents).toBeGreaterThan(0);
      expect(p.description).toMatch(/,\s/); // "<color> <material> <garment>, <formality>"
      expect(p.imageUrl).toMatch(/^https:\/\//);
    }
  });
});

describe('fixture llm outputs', () => {
  it('parse_query fixtures validate and cover the three named queries', () => {
    expect(Object.keys(fixtures.llm.parse_query).length).toBeGreaterThanOrEqual(8);
    for (const [q, value] of Object.entries(fixtures.llm.parse_query)) {
      const parsed = ParseQuerySchema.safeParse(value);
      expect(parsed.success, `${q}: ${parsed.error?.message}`).toBe(true);
    }
    for (const q of ['black slip dress for a wedding', 'plain black tee', 'white sneakers under $80']) {
      expect(fixtures.llm.parse_query[q]).toBeTruthy();
    }
  });

  it('flags one-time needs and reads the stated price', () => {
    expect(ParseQuerySchema.parse(fixtures.llm.parse_query['black slip dress for a wedding'])).toMatchObject({
      occasion: 'wedding',
      one_time_need: true,
    });
    expect(ParseQuerySchema.parse(fixtures.llm.parse_query['white sneakers under $80']).max_price_cents).toBe(8_000);
    expect(ParseQuerySchema.parse(fixtures.llm.parse_query['plain black tee']).one_time_need).toBe(false);
  });

  it('has a note for every verdict', () => {
    for (const v of VERDICTS) {
      expect(fixtures.llm.search_note[v]).toBeTruthy();
    }
    expect(fixtures.llm.borrow_message.split(/\s+/).length).toBeLessThan(41);
  });
});
