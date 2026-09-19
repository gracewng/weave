/** Cheap gates that run BEFORE any model call. Pure. */
import { retailerData } from '@weave/data';
import { FALLBACK_RETAILERS } from './retailers-fallback';

export interface RetailerMatch { id: string; name: string; returnWindowDays: number | null; mixed: boolean }

/** Root domains for the Gmail `from:` pass (Devin's list when present, else the fallback). */
export function allowlistDomains(): string[] {
  const src = retailerData.retailers.length > 0 ? retailerData.retailers.map((r) => r.senderDomains) : FALLBACK_RETAILERS.map((r) => r.domains);
  const roots = new Set<string>();
  for (const list of src) for (const d of list) { const parts = d.toLowerCase().split('.'); roots.add(parts.slice(-2).join('.')); }
  return [...roots];
}

export function senderDomain(from: string): string {
  const m = /<([^>]+)>/.exec(from);
  const addr = (m?.[1] ?? from).trim().toLowerCase();
  return addr.split('@')[1] ?? '';
}

export function resolveRetailer(domain: string): RetailerMatch | undefined {
  const d = domain.toLowerCase();
  if (retailerData.retailers.length > 0) {
    const r = retailerData.bySenderDomain(d);
    return r ? { id: r.id, name: r.name, returnWindowDays: retailerData.returnWindowFor(r.id), mixed: r.mixed } : undefined;
  }
  const f = FALLBACK_RETAILERS.find((r) => r.domains.some((x) => d === x || d.endsWith('.' + x)));
  return f ? { id: f.id, name: f.name, returnWindowDays: f.returnDays, mixed: !!f.mixed } : undefined;
}

const ORDER_RE = /\b(order|receipt|purchase|invoice|confirmation|thank you for (your|shopping))\b/i;
const NOT_ORDER_RE = /(\b(shipped|shipping update|out for delivery|delivered|on its way|has arrived|tracking|return (started|received|label)|refund|cancel+ed|password|verify|newsletter|sale ends?|last chance|survey|review your|pre-?order|promo|deal|hrs? left|hours left|ends (tonight|tomorrow|soon)|extended|daily digest|wishlist|back in stock|price drop)\b|% off|\$\d+ off|off your (next |entire )?order)/i;
const CLOTHING_RE = /\b(shirt|t-?shirt|tee|top|blouse|sweater|hoodie|sweatshirt|cardigan|jacket|coat|blazer|dress|skirt|pants|trousers|jeans|denim|shorts|leggings|joggers|sneakers?|shoes?|boots?|sandals?|heels|loafers|bra|underwear|socks|scarf|hat|cap|beanie|bag|tote|belt|size\s*[:\-]?\s*(xs|s|m|l|xl|xxl|\d{1,2}))\b/i;

export interface PrefilterInput { from: string; subject: string; text: string }
export interface PrefilterResult { pass: boolean; reason: string; retailer?: RetailerMatch; domain: string }

/**
 * Allowlisted sender → pass (mixed retailers like Amazon/Target pass; the model drops non-clothing lines).
 * Unknown sender → pass only if the subject reads like an order AND the body mentions clothing.
 * Shipping/delivery/marketing subjects never pass.
 */
export function prefilter(input: PrefilterInput): PrefilterResult {
  const domain = senderDomain(input.from);
  const retailer = resolveRetailer(domain);
  if (NOT_ORDER_RE.test(input.subject)) return { pass: false, reason: 'subject:not-order', retailer, domain };
  if (retailer) return { pass: true, reason: 'allowlist', retailer, domain };
  if (!ORDER_RE.test(input.subject)) return { pass: false, reason: 'unknown-sender:subject', domain };
  if (!CLOTHING_RE.test(input.text)) return { pass: false, reason: 'unknown-sender:no-clothing-words', domain };
  return { pass: true, reason: 'keyword', domain };
}
