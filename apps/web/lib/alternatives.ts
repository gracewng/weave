/**
 * "What this money could be instead." Stopgap until @weave/data (Devin task 5) ships `alternatives`.
 * US averages, rounded, with sources in comments. Opportunity cost, never a nudge to spend.
 */
export interface Alt { id: string; unitCents: number; singular: string; plural: string; source: string }
export const ALTERNATIVES: Alt[] = [
  { id: 'spotify', unitCents: 1199, singular: 'month of Spotify', plural: 'months of Spotify', source: 'Spotify Premium individual, US, 2025: $11.99/mo' },
  { id: 'groceries', unitCents: 7500, singular: 'week of groceries (one person)', plural: 'weeks of groceries (one person)', source: 'USDA Thrifty–Moderate food plans, single adult, 2025: ~$70–80/wk' },
  { id: 'coffee', unitCents: 550, singular: 'coffee', plural: 'coffees', source: 'US average café latte, 2025: ~$5.50' },
  { id: 'transit', unitCents: 9000, singular: 'monthly transit pass', plural: 'monthly transit passes', source: 'MBTA LinkPass 2025: $90/mo' },
  { id: 'textbook', unitCents: 10500, singular: 'textbook', plural: 'textbooks', source: 'College Board avg new textbook: ~$105' },
  { id: 'concert', unitCents: 13500, singular: 'concert ticket', plural: 'concert tickets', source: 'Pollstar avg ticket 2024: ~$135' },
  { id: 'flight', unitCents: 12000, singular: 'BOS→NYC round trip', plural: 'BOS→NYC round trips', source: 'Typical economy fare 2025: ~$120' },
];

/** Invested for 10 years at 7% nominal, compounded annually. Labeled as a scenario, not a promise. */
export function investedTenYears(cents: number): number { return Math.round(cents * Math.pow(1.07, 10)); }

/** Up to n readable phrases (count between 0.5 and 60). */
export function describe(cents: number, n = 3): string[] {
  const out: string[] = [];
  for (const a of ALTERNATIVES) {
    const k = cents / a.unitCents;
    if (k < 0.5 || k > 60) continue;
    const r = k >= 10 ? Math.round(k) : Math.round(k * 10) / 10;
    out.push(`${r} ${r === 1 ? a.singular : a.plural}`);
    if (out.length >= n) break;
  }
  return out;
}
