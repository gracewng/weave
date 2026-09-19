/**
 * DEVIN-OWNED. Scaffold only — see /docs/devin-tasks.md task 1.
 * Must export `retailerData: RetailerData` built from retailers.ts + returnPolicies.ts.
 */
import type { RetailerData, RetailerInfo, ReturnPolicy } from '@worthit/shared/contracts';

const retailers: RetailerInfo[] = [];
const returnPolicies: ReturnPolicy[] = [];

export const retailerData: RetailerData = {
  retailers,
  returnPolicies,
  defaultReturnWindowDays: 30,
  bySenderDomain: (domain) => retailers.find((r) => r.senderDomains.some((d) => domain.toLowerCase().endsWith(d))),
  byMerchant: (merchant) => {
    const m = merchant.toUpperCase();
    return retailers.find((r) => r.merchantVariants.some((v) => m.includes(v.toUpperCase())));
  },
  returnWindowFor: (retailerId) => {
    const p = retailerId ? returnPolicies.find((x) => x.retailerId === retailerId) : undefined;
    return p ? p.windowDays : 30;
  },
};
