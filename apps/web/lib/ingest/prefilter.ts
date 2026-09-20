/** Cheap gates that run BEFORE any model call. Pure. */
import { retailerData } from '@weave/data';

export interface RetailerMatch { id: string; name: string; returnWindowDays: number | null; mixed: boolean }

/** Root domains for the Gmail `from:` pass (Devin's list when present, else the fallback). */
export function allowlistDomains(): string[] {
  const roots = new Set<string>();
  for (const r of retailerData.retailers) for (const d of r.senderDomains) { const parts = d.toLowerCase().split('.'); roots.add(parts.slice(-2).join('.')); }
  return [...roots];
}

export function senderDomain(from: string): string {
  const m = /<([^>]+)>/.exec(from);
  const addr = (m?.[1] ?? from).trim().toLowerCase();
  return addr.split('@')[1] ?? '';
}

export function resolveRetailer(domain: string): RetailerMatch | undefined {
  const r = retailerData.bySenderDomain(domain.toLowerCase());
  return r ? { id: r.id, name: r.name, returnWindowDays: retailerData.returnWindowFor(r.id), mixed: r.mixed } : undefined;
}

const ORDER_RE = /\b(order|receipt|purchase|invoice|confirmation|thank you for (your|shopping))\b/i;
const NOT_ORDER_RE = /(\b(shipped|shipping update|out for delivery|delivered|on its way|has arrived|tracking|return (started|received|label)|refund|cancel+ed|password|verify|newsletter|sale ends?|last chance|survey|review your|arriving|itinerary|e-?ticket|boarding pass|flight|reservation|pre-?order|promo|deal|hrs? left|hours left|ends (tonight|tomorrow|soon)|extended|daily digest|wishlist|back in stock|price drop)\b|% off|\$\d+ off|off your (next |entire )?order)/i;
/** Transactional signals: an order confirmation almost always has one of these in the body. Marketing rarely does. */
const ORDER_BODY_RE = /(order\s*(number|no\.?|#|id)|order\s*confirmation|order\s*total|subtotal|grand total|total\s*\$?\s*\d|thank you for (your )?(order|purchase|shopping)|payment (method|received)|billing address|shipping address|qty|quantity|items? ordered|your receipt|e-?receipt)/i;
/** Marketing subdomains: not a rejection on their own, but they must show order signals in the body. */
const MARKETING_SUB_RE = /^(mkt|em|e|news|promo|marketing|info|hello|s|t|go|mail|email|newsletter|offers?|deals?)\d*\./i;

/** A completed sale: goes to the model as direction=sale so the matching owned item is marked sold. Never a purchase. */
const SALE_PASS_RE = /\b(you.?ve made a sale|you made a sale|you sold|sale confirmation|sold!|your sale)\b/i;
/** Marketplace offer/shipping/marketing chatter: rejected before any model call. */
const OFFER_RE = /(\b(your buyer is waiting|ship (today|now|it|by)|time to ship|shipping label|made you an offer|sent you (a |an )?(special )?offer|counter ?offer|accepted your offer|didn.t accept your offer|declined your offer|payout|your earnings|your listing|new like|liked your|wants what you|what to list|buyers want|meet @)\b|^@)/i;

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
  if (SALE_PASS_RE.test(input.subject) || /^sold@/i.test((/<([^>]+)>/.exec(input.from)?.[1] ?? input.from).trim())) return { pass: true, reason: 'sale', retailer, domain };
  if (OFFER_RE.test(input.subject)) return { pass: false, reason: 'subject:offer-or-shipping', retailer, domain };
  if (retailer) {
    // Allowlisted sender: still needs to look transactional. Retailers send far more marketing than receipts.
    const subjectOrder = ORDER_RE.test(input.subject);
    const bodyOrder = ORDER_BODY_RE.test(input.text);
    if (subjectOrder || bodyOrder) return { pass: true, reason: subjectOrder ? 'allowlist:subject' : 'allowlist:body', retailer, domain };
    return { pass: false, reason: MARKETING_SUB_RE.test(domain) ? 'allowlist:marketing-subdomain' : 'allowlist:no-order-signals', retailer, domain };
  }
  if (!ORDER_RE.test(input.subject)) return { pass: false, reason: 'unknown-sender:subject', domain };
  if (!ORDER_BODY_RE.test(input.text)) return { pass: false, reason: 'unknown-sender:no-order-signals', domain };
  if (!CLOTHING_RE.test(input.text)) return { pass: false, reason: 'unknown-sender:no-clothing-words', domain };
  return { pass: true, reason: 'keyword', domain };
}
