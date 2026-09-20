/**
 * "What this money could be instead" — the opportunity-cost line on the budget page.
 *
 * Every figure is a US average or published price as of 2026-09, rounded to something a person
 * recognizes; the `source` is where it comes from. They are comparisons, not advice, and never
 * appear next to a buy action (CLAUDE.md: "Never followed by a buy button").
 */
import type { MoneyAlternative } from '@weave/shared/contracts';

interface Alternative extends MoneyAlternative {
  /** Cents per unit; 0 for the invested-growth comparison, which has no unit count. */
  unitCents: number;
  /** How many units `cents` buys; null when the alternative isn't a count. */
  count(cents: number): number | null;
  /** Readable at this amount? Counts stay between 0.5 and 50. */
  fits(cents: number): boolean;
}

/** One decimal at most, no trailing `.0`. */
function fmt(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function counted(
  id: string,
  unitCents: number,
  singular: string,
  plural: string,
  source: string,
): Alternative {
  const count = (cents: number) => cents / unitCents;
  return {
    id,
    label: plural,
    unitCents,
    source,
    count,
    fits: (cents) => count(cents) >= 0.5 && count(cents) <= 50,
    describe: (cents) => {
      const n = count(cents);
      return `${fmt(n)} ${Math.round(n * 10) / 10 === 1 ? singular : plural}`;
    },
  };
}

const INVESTMENT_YEARS = 10;
const INVESTMENT_RATE_PCT = 7;
const INVESTMENT_RATE = INVESTMENT_RATE_PCT / 100;

export const alternatives: Alternative[] = [
  // Spotify Premium Individual, $11.99/mo. https://www.spotify.com/us/premium/
  counted('spotify', 1199, 'month of Spotify', 'months of Spotify', 'https://www.spotify.com/us/premium/'),
  // Netflix Standard (no ads), $17.99/mo. https://help.netflix.com/en/node/24926
  counted('netflix', 1799, 'month of Netflix', 'months of Netflix', 'https://help.netflix.com/en/node/24926'),
  // Coffee-shop latte, ~$5.50 in a US metro. BLS average price data, coffee away from home.
  counted('coffee', 550, 'coffee', 'coffees', 'https://www.bls.gov/cpi/factsheets/average-prices.htm'),
  // Groceries for one adult, one week: USDA Food Plans, moderate-cost plan (~$95/week).
  counted('groceries', 9500, 'week of groceries', 'weeks of groceries', 'https://www.fns.usda.gov/cnpp/usda-food-plans-cost-food-reports-monthly-reports'),
  // MBTA monthly LinkPass, $90. https://www.mbta.com/fares/reduced/passes
  counted('transit', 9000, 'month of transit', 'months of transit', 'https://www.mbta.com/fares'),
  // New college textbook, ~$105 average. https://educationdata.org/average-cost-of-college-textbooks
  counted('textbook', 10500, 'textbook', 'textbooks', 'https://educationdata.org/average-cost-of-college-textbooks'),
  // Average concert ticket, ~$130 (Pollstar year-end average ticket price).
  counted('concert', 13000, 'concert ticket', 'concert tickets', 'https://news.pollstar.com/category/year-end-business-analysis/'),
  // Roundtrip BOS→NYC, ~$140 typical published fare; BTS average domestic itinerary is higher.
  counted('flight_bos_nyc', 14000, 'roundtrip BOS→NYC', 'roundtrip BOS→NYC flights', 'https://www.transtats.bts.gov/AverageFare/'),
  // Month of a mid-tier US gym membership, ~$50.
  counted('gym', 5000, 'month at the gym', 'months at the gym', 'https://www.ihrsa.org/improve-your-club/industry-news/'),
  // Doctor-visit copay for an employer plan, ~$30 (KFF Employer Health Benefits Survey).
  counted('copay', 3000, 'doctor visit copay', 'doctor visit copays', 'https://www.kff.org/health-costs/report/employer-health-benefits-survey/'),
  {
    id: 'invested_10y',
    label: `invested for ${INVESTMENT_YEARS} years at ${INVESTMENT_RATE_PCT}%`,
    unitCents: 0,
    // 7% nominal is the long-run US large-cap average; not a projection of any actual account.
    source: 'https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator',
    count: () => null,
    fits: (cents) => cents >= 2000,
    describe: (cents) => {
      const grown = (cents * (1 + INVESTMENT_RATE) ** INVESTMENT_YEARS) / 100;
      return `$${grown.toFixed(0)} in ${INVESTMENT_YEARS} years at ${INVESTMENT_RATE_PCT}%`;
    },
  },
];

/**
 * The `n` comparisons that read best at this amount: readable counts only, closest to a
 * count of ~3 first, so "$45" prints "3.8 months of Spotify" rather than "0.5 textbooks".
 */
export function bestAlternatives(cents: number, n = 3): Alternative[] {
  if (!Number.isFinite(cents) || cents <= 0) return [];
  const ranked = alternatives
    .filter((a) => a.fits(cents))
    .sort((a, b) => score(a, cents) - score(b, cents));
  return ranked.slice(0, n);
}

function score(a: Alternative, cents: number): number {
  const count = a.count(cents);
  if (count === null) return 2; // the invested comparison is a tiebreaker, never the headline
  return Math.abs(Math.log10(count) - Math.log10(3));
}

/** Convenience for copy: "4.5 months of Spotify · 2 concert tickets · $96 in 10 years at 7%". */
export function describeAlternatives(cents: number, n = 3): string[] {
  return bestAlternatives(cents, n).map((a) => a.describe(cents));
}

export type { Alternative };
