/**
 * DEVIN-OWNED. Retailer allowlist, return windows, and pure lookup helpers.
 * See /docs/devin-tasks.md task 1.
 */
import type { RetailerData, RetailerInfo } from '@weave/shared/contracts';
import { retailers } from './retailers';
import { returnPolicies } from './returnPolicies';

export { retailers } from './retailers';
export { returnPolicies } from './returnPolicies';

const DEFAULT_RETURN_WINDOW_DAYS = 30;

/** Uppercase, punctuation → space, collapse whitespace: `SQ *UNIQLO #123` → `SQ UNIQLO 123`. */
export function normalizeMerchant(merchant: string): string {
  return merchant
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const byId = new Map(retailers.map((r) => [r.id, r]));

/** Variants longest-first so `NORDSTROM RACK` wins over `NORDSTROM`. */
const variantIndex: Array<{ variant: string; retailer: RetailerInfo }> = retailers
  .flatMap((retailer) => retailer.merchantVariants.map((v) => ({ variant: normalizeMerchant(v), retailer })))
  .filter((entry) => entry.variant.length > 0)
  .sort((a, b) => b.variant.length - a.variant.length);

const domainIndex: Array<{ domain: string; retailer: RetailerInfo }> = retailers
  .flatMap((retailer) => retailer.senderDomains.map((d) => ({ domain: d.toLowerCase(), retailer })))
  .sort((a, b) => b.domain.length - a.domain.length);

/** Sender domain or full address; suffix match on the domain part, so `email.uniqlo.com` hits `uniqlo.com`. */
export function bySenderDomain(domain: string): RetailerInfo | undefined {
  const host = domain.toLowerCase().trim().split('@').pop()?.replace(/^<|>$/g, '').trim();
  if (!host) return undefined;
  return domainIndex.find(({ domain: d }) => host === d || host.endsWith(`.${d}`))?.retailer;
}

/** Card-statement string → retailer. Whole-token match first, then substring; longest variant wins. */
export function byMerchant(merchantString: string): RetailerInfo | undefined {
  const m = normalizeMerchant(merchantString);
  if (!m) return undefined;
  const tokens = new Set<string>();
  const words = m.split(' ');
  for (let i = 0; i < words.length; i++) {
    for (let j = i; j < words.length; j++) tokens.add(words.slice(i, j + 1).join(' '));
  }
  return (
    variantIndex.find(({ variant }) => tokens.has(variant))?.retailer ??
    variantIndex.find(({ variant }) => m.includes(variant))?.retailer
  );
}

/** Days from purchase; null = final sale. Unknown retailer → the 30-day default. */
export function returnWindowFor(retailerId: string | undefined | null): number | null {
  if (!retailerId) return DEFAULT_RETURN_WINDOW_DAYS;
  const policy = returnPolicies.find((p) => p.retailerId === retailerId);
  if (!policy) return DEFAULT_RETURN_WINDOW_DAYS;
  return policy.windowDays;
}

/** Slug or display name → retailer, for rows that stored the retailer's name. */
export function byIdOrName(value: string | null | undefined): RetailerInfo | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  return byId.get(v) ?? retailers.find((r) => r.name.toLowerCase() === v);
}

export const retailerData: RetailerData = {
  retailers,
  returnPolicies,
  defaultReturnWindowDays: DEFAULT_RETURN_WINDOW_DAYS,
  bySenderDomain,
  byMerchant,
  returnWindowFor,
};
