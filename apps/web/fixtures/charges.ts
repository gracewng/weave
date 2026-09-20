/**
 * DEVIN-OWNED (task 3). 18 months of card charges.
 *
 * Every order email has a matching charge (messy statement string, tax added, occasionally a day late — the
 * matcher's ±4 days / 10% tolerances are exercised on purpose), plus:
 *   · 6 clothing charges with no email at all → Mystery Purchases
 *   · 2 clothing charges in the last 48 hours → the "keep / returning / not clothes" prompt
 *   · non-clothing noise so Closet Coverage has a denominator that means something.
 */
import type { FixtureCharge } from '@weave/shared/contracts';
import { ORDER_SPECS, isoDaysAgo, orderTotalCents } from './emails';

/** Statement strings as the bank actually writes them, per retailer. */
const STATEMENT: Record<string, string> = {
  Uniqlo: 'SQ *UNIQLO NEWBURY',
  Everlane: 'EVERLANE.COM',
  Aritzia: 'ARITZIA #0231 BOSTON',
  Madewell: 'TST* MADEWELL 1204',
  Zara: 'ZARA #2041 BOSTON',
  Amazon: 'AMZN Mktp US*2K4L9',
  Nike: 'NIKE.COM 8004536453',
  COS: 'COS USA NEW YORK',
  'H&M': 'H&M US 0384',
  Lululemon: 'LULULEMON BOSTON',
  Reformation: 'THE REFORMATION LLC',
  Nordstrom: 'NORDSTROM.COM',
  'J.Crew': 'J CREW #0441',
  Depop: 'DEPOP LTD',
  'Sézane': 'SEZANE US',
  Adidas: 'ADIDAS US ONLINE',
  Patagonia: 'PATAGONIA.COM',
  'Abercrombie & Fitch': 'ABERCROMBIE 0912',
  'Banana Republic': 'BANANA REPUBLIC #221',
  Gap: 'GAP US 4412',
  "Arc'teryx": 'ARCTERYX EQUIPMENT',
  Anthropologie: 'ANTHROPOLOGIE #331',
  ThredUp: 'THREDUP INC',
};

const TAX = 0.0625; // MA sales tax — the charge is a few percent above the email total, inside the matcher's 10%

/** Charges that reconcile to an order email. Shipping notifications are not purchases and get no charge. */
const matchedCharges: FixtureCharge[] = ORDER_SPECS.filter((s) => s.kind !== 'shipping').map((s, i) => ({
  externalId: `fx-charge-${s.id}`,
  merchant: STATEMENT[s.retailer] ?? s.retailer.toUpperCase(),
  amountCents: Math.round(orderTotalCents(s) * (1 + TAX)),
  // every third order settles a day after the email, like a real pending → posted transition
  date: isoDaysAgo(i % 3 === 0 ? s.daysAgo - 1 : s.daysAgo),
  isClothing: true,
}));

/** Clothing charges with no email whatsoever: in-store purchases → Mystery Purchases. */
const mysteryCharges: FixtureCharge[] = [
  { externalId: 'fx-charge-mystery-1', merchant: 'SQ *UNIQLO NEWBURY', amountCents: 5_512, date: isoDaysAgo(27), isClothing: true },
  { externalId: 'fx-charge-mystery-2', merchant: 'ZARA #2041 BOSTON', amountCents: 8_942, date: isoDaysAgo(64), isClothing: true },
  { externalId: 'fx-charge-mystery-3', merchant: 'BUFFALO EXCHANGE #12', amountCents: 3_400, date: isoDaysAgo(103), isClothing: true },
  { externalId: 'fx-charge-mystery-4', merchant: 'URBAN OUTFITTERS 0231', amountCents: 6_837, date: isoDaysAgo(147), isClothing: true },
  { externalId: 'fx-charge-mystery-5', merchant: 'TJ MAXX #0921', amountCents: 4_229, date: isoDaysAgo(215), isClothing: true },
  { externalId: 'fx-charge-mystery-6', merchant: 'GARMENT DISTRICT CAMBRIDGE', amountCents: 2_150, date: isoDaysAgo(332), isClothing: true },
];

/** Last 48 hours: these are what the purchase-confirmation prompt asks about during the demo. */
const recentCharges: FixtureCharge[] = [
  { externalId: 'fx-charge-recent-1', merchant: 'SQ *UNIQLO NEWBURY', amountCents: 3_180, date: isoDaysAgo(0), isClothing: true },
  { externalId: 'fx-charge-recent-2', merchant: 'MADEWELL 1204', amountCents: 9_855, date: isoDaysAgo(1), isClothing: true },
];

const NOISE: Array<[merchant: string, low: number, high: number]> = [
  ['TRADER JOE S #512', 2_100, 9_400],
  ['MBTA CHARLIE', 275, 1_500],
  ['SPOTIFY USA', 1_199, 1_199],
  ['BLUE BOTTLE COFFEE', 425, 980],
  ['CVS/PHARMACY #2201', 800, 4_200],
  ['SHELL OIL 4412', 3_200, 6_800],
  ['MGH PARKING', 1_200, 2_800],
  ['NETFLIX.COM', 1_549, 1_549],
];

/** Deterministic noise so the demo numbers are the same every run. */
const noiseCharges: FixtureCharge[] = Array.from({ length: 36 }, (_, i) => {
  const [merchant, low, high] = NOISE[i % NOISE.length]!;
  const spread = ((i * 7919) % 100) / 100;
  return {
    externalId: `fx-charge-noise-${i}`,
    merchant,
    amountCents: Math.round(low + spread * (high - low)),
    date: isoDaysAgo(Math.round((i / 36) * 540)),
    isClothing: false,
  };
});

export const fixtureCharges: FixtureCharge[] = [...matchedCharges, ...mysteryCharges, ...recentCharges, ...noiseCharges].sort(
  (a, b) => (a.date < b.date ? 1 : -1),
);
