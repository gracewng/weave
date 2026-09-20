/**
 * Return windows used to compute `items.return_by`.
 *
 * `windowDays = null` means final sale / no returns accepted (resale marketplaces).
 * Where a retailer states *no* time limit (Patagonia's Ironclad Guarantee, American Eagle),
 * the window is capped at 365 days so the return board still has a date to count down to —
 * the note says so. Where a retailer decides case by case (Nordstrom), the note says so and
 * the number is a reminder default, not a promise.
 *
 * Values are the published policy as of 2026-09; each `source` is the page they came from.
 * Windows are reminders, not guarantees — sale/final-sale items and holiday extensions differ.
 */
import type { ReturnPolicy } from '@weave/shared/contracts';

export const returnPolicies: ReturnPolicy[] = [
  { retailerId: 'uniqlo', windowDays: 30, source: 'https://www.uniqlo.com/us/en/customer-service/returns' },
  { retailerId: 'zara', windowDays: 30, source: 'https://www.zara.com/us/en/help-center/returns' },
  { retailerId: 'hm', windowDays: 30, notes: 'Free for members; sale items included.', source: 'https://www2.hm.com/en_us/customer-service/returns.html' },
  { retailerId: 'mango', windowDays: 30, source: 'https://shop.mango.com/us/en/returns' },
  { retailerId: 'shein', windowDays: 35, notes: 'First return per order free; bodysuits/intimates final sale.', source: 'https://us.shein.com/Return-Policy-a-281.html' },
  { retailerId: 'princess_polly', windowDays: 30, source: 'https://us.princesspolly.com/pages/returns' },
  { retailerId: 'edikted', windowDays: 14, notes: 'Store credit only.', source: 'https://edikted.com/pages/return-policy' },
  { retailerId: 'brandy_melville', windowDays: 30, notes: 'Online orders only; store credit.', source: 'https://us.brandymelville.com/pages/returns' },
  { retailerId: 'garage', windowDays: 30, source: 'https://www.garageclothing.com/us/return-policy.html' },
  { retailerId: 'pacsun', windowDays: 30, source: 'https://www.pacsun.com/customer-service/returns.html' },

  { retailerId: 'gap', windowDays: 30, source: 'https://www.gap.com/customerService/info.do?cid=81417' },
  { retailerId: 'old_navy', windowDays: 30, source: 'https://oldnavy.gap.com/customerService/info.do?cid=81417' },
  { retailerId: 'banana_republic', windowDays: 30, source: 'https://bananarepublic.gap.com/customerService/info.do?cid=81417' },
  { retailerId: 'athleta', windowDays: 60, notes: 'Give-It-A-Workout guarantee.', source: 'https://athleta.gap.com/customerService/info.do?cid=81417' },
  { retailerId: 'jcrew', windowDays: 30, source: 'https://www.jcrew.com/r/help-center/returns-exchanges' },
  { retailerId: 'madewell', windowDays: 30, source: 'https://www.madewell.com/help/returns.html' },
  { retailerId: 'abercrombie', windowDays: 30, notes: 'Free returns for members; final-sale items excluded.', source: 'https://www.abercrombie.com/shop/us/help/returns-exchanges' },
  { retailerId: 'hollister', windowDays: 30, source: 'https://www.hollisterco.com/shop/us/help/returns-exchanges' },
  { retailerId: 'american_eagle', windowDays: 365, notes: 'Policy states no time limit; capped at 365 days for the return board.', source: 'https://www.ae.com/us/en/content/help/returns' },
  { retailerId: 'urban_outfitters', windowDays: 30, notes: 'After 30 days: store credit.', source: 'https://www.urbanoutfitters.com/help/return-policy' },
  { retailerId: 'anthropologie', windowDays: 30, notes: 'After 30 days: store credit.', source: 'https://www.anthropologie.com/help/return-policy' },
  { retailerId: 'free_people', windowDays: 30, source: 'https://www.freepeople.com/help/return-policy/' },
  { retailerId: 'aritzia', windowDays: 14, notes: 'Online orders; in-store purchases have a shorter window.', source: 'https://www.aritzia.com/us/en/help/returns' },
  { retailerId: 'everlane', windowDays: 30, source: 'https://www.everlane.com/returns' },
  { retailerId: 'reformation', windowDays: 30, source: 'https://www.thereformation.com/pages/returns' },
  { retailerId: 'skims', windowDays: 30, notes: 'Intimates final sale.', source: 'https://skims.com/pages/returns' },
  { retailerId: 'lululemon', windowDays: 30, notes: 'Unworn with tags; "We Made Too Much" items are final sale.', source: 'https://shop.lululemon.com/help/returns' },
  { retailerId: 'alo_yoga', windowDays: 30, source: 'https://www.aloyoga.com/pages/returns' },
  { retailerId: 'gymshark', windowDays: 30, source: 'https://www.gymshark.com/pages/returns-policy' },

  { retailerId: 'levis', windowDays: 60, source: 'https://www.levi.com/US/en_US/help/returns' },
  { retailerId: 'nike', windowDays: 60, notes: 'Members; worn items may still qualify.', source: 'https://www.nike.com/help/a/returns-policy' },
  { retailerId: 'adidas', windowDays: 30, source: 'https://www.adidas.com/us/help/returns-refunds' },
  { retailerId: 'new_balance', windowDays: 45, source: 'https://www.newbalance.com/help-center/returns.html' },
  { retailerId: 'patagonia', windowDays: 365, notes: 'Ironclad Guarantee states no time limit; capped at 365 days for the return board.', source: 'https://www.patagonia.com/returns.html' },
  { retailerId: 'north_face', windowDays: 60, source: 'https://www.thenorthface.com/en-us/help/returns' },
  { retailerId: 'rei', windowDays: 365, notes: 'Members, one year; outlet items 30 days.', source: 'https://www.rei.com/help/returns' },
  { retailerId: 'foot_locker', windowDays: 45, source: 'https://www.footlocker.com/help/returns.html' },
  { retailerId: 'zappos', windowDays: 365, source: 'https://www.zappos.com/c/shipping-and-returns' },
  { retailerId: 'dr_martens', windowDays: 30, source: 'https://www.drmartens.com/us/en/returns-policy' },
  { retailerId: 'allbirds', windowDays: 30, notes: 'Wear them; still returnable within 30 days.', source: 'https://www.allbirds.com/pages/return-policy' },

  { retailerId: 'asos', windowDays: 28, notes: 'Free returns within 28 days; 29–45 days store credit.', source: 'https://www.asos.com/us/customer-care/returns/' },
  { retailerId: 'ssense', windowDays: 30, notes: 'Return authorization required within 14 days of delivery.', source: 'https://www.ssense.com/en-us/customer-service/returns' },
  { retailerId: 'farfetch', windowDays: 14, notes: 'Per-boutique; 14 days from delivery is the standard.', source: 'https://www.farfetch.com/us/customer-service/returns-and-refunds' },
  { retailerId: 'net_a_porter', windowDays: 28, source: 'https://www.net-a-porter.com/en-us/returns' },
  { retailerId: 'nordstrom', windowDays: 30, notes: 'No published limit — handled case by case; 30 days is our reminder default.', source: 'https://www.nordstrom.com/browse/customer-service/returns' },
  { retailerId: 'nordstrom_rack', windowDays: 30, source: 'https://www.nordstromrack.com/help/returns' },
  { retailerId: 'macys', windowDays: 30, notes: '90 days for most items with a Macy\'s card; 30 days standard for apparel.', source: 'https://www.macys.com/cst/returns.html' },
  { retailerId: 'amazon', windowDays: 30, notes: 'Most clothing sold by Amazon; third-party sellers set their own.', source: 'https://www.amazon.com/gp/help/customer/display.html?nodeId=GKM69DUUYKQWKWX7' },
  { retailerId: 'target', windowDays: 90, notes: '90 days for Target-owned apparel brands.', source: 'https://help.target.com/help/subcategoryarticle?childcat=Returns' },
  { retailerId: 'walmart', windowDays: 90, source: 'https://www.walmart.com/help/article/walmart-standard-return-policy' },

  // Resale marketplaces: sales are final; disputes go through buyer protection, not a return window.
  { retailerId: 'depop', windowDays: null, notes: 'Final sale; Buyer Protection disputes only.', source: 'https://depophelp.zendesk.com/hc/en-gb/articles/360001249508' },
  { retailerId: 'poshmark', windowDays: null, notes: 'Final sale; Posh Protect covers not-as-described within 3 days.', source: 'https://support.poshmark.com/s/article/What-is-Posh-Protect' },
  { retailerId: 'grailed', windowDays: null, notes: 'Final sale; Grailed Purchase Protection only.', source: 'https://www.grailed.com/help/returns' },
  { retailerId: 'vinted', windowDays: null, notes: 'Final sale; Buyer Protection window only.', source: 'https://www.vinted.com/help/79-buyer-protection' },
  { retailerId: 'thredup', windowDays: 14, notes: 'Only items marked returnable; final-sale items excluded.', source: 'https://support.thredup.com/hc/en-us/articles/218937077-Return-Policy' },
  { retailerId: 'the_realreal', windowDays: 21, notes: 'Only items marked returnable.', source: 'https://www.therealreal.com/returns' },
];
