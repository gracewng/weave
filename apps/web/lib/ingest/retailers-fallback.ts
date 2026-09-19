/**
 * TEMPORARY allowlist used only while `@weave/data` (Devin task 1) is a stub.
 * Once `retailerData.retailers.length > 0`, prefilter.ts uses Devin's data and ignores this file.
 * Return windows from each retailer's policy page as of 2026-09; null = final sale / varies.
 */
export interface FallbackRetailer { id: string; name: string; domains: string[]; returnDays: number | null; mixed?: boolean }

export const FALLBACK_RETAILERS: FallbackRetailer[] = [
  { id: 'uniqlo', name: 'Uniqlo', domains: ['uniqlo.com', 'email.uniqlo.com', 'mail.uniqlo.com'], returnDays: 30 },
  { id: 'zara', name: 'Zara', domains: ['zara.com', 'email.zara.com'], returnDays: 30 },
  { id: 'hm', name: 'H&M', domains: ['hm.com', 'email.hm.com', 'delivery.hm.com'], returnDays: 30 },
  { id: 'nike', name: 'Nike', domains: ['nike.com', 'official.nike.com', 'notifications.nike.com'], returnDays: 60 },
  { id: 'adidas', name: 'adidas', domains: ['adidas.com', 'email.adidas.com', 'news.adidas.com'], returnDays: 30 },
  { id: 'aritzia', name: 'Aritzia', domains: ['aritzia.com', 'email.aritzia.com'], returnDays: 14 },
  { id: 'everlane', name: 'Everlane', domains: ['everlane.com', 'email.everlane.com'], returnDays: 30 },
  { id: 'madewell', name: 'Madewell', domains: ['madewell.com', 'email.madewell.com'], returnDays: 30 },
  { id: 'jcrew', name: 'J.Crew', domains: ['jcrew.com', 'email.jcrew.com', 'jcrewfactory.com'], returnDays: 30 },
  { id: 'gap', name: 'Gap', domains: ['gap.com', 'email.gap.com', 'oldnavy.com', 'email.oldnavy.com', 'bananarepublic.com', 'email.bananarepublic.com', 'athleta.com'], returnDays: 30 },
  { id: 'abercrombie', name: 'Abercrombie & Fitch', domains: ['abercrombie.com', 'email.abercrombie.com', 'hollisterco.com', 'email.hollisterco.com'], returnDays: 30 },
  { id: 'lululemon', name: 'lululemon', domains: ['lululemon.com', 'email.lululemon.com', 'info.lululemon.com'], returnDays: 30 },
  { id: 'nordstrom', name: 'Nordstrom', domains: ['nordstrom.com', 'eml.nordstrom.com', 'nordstromrack.com'], returnDays: null, mixed: true },
  { id: 'urban', name: 'Urban Outfitters', domains: ['urbanoutfitters.com', 'email.urbanoutfitters.com', 'anthropologie.com', 'email.anthropologie.com', 'freepeople.com', 'email.freepeople.com'], returnDays: 30 },
  { id: 'asos', name: 'ASOS', domains: ['asos.com', 'email.asos.com'], returnDays: 28 },
  { id: 'shein', name: 'SHEIN', domains: ['shein.com', 'email.shein.com', 'sheinemail.com'], returnDays: 35 },
  { id: 'levis', name: "Levi's", domains: ['levi.com', 'email.levi.com', 'levis.com'], returnDays: 60 },
  { id: 'patagonia', name: 'Patagonia', domains: ['patagonia.com', 'email.patagonia.com'], returnDays: null },
  { id: 'northface', name: 'The North Face', domains: ['thenorthface.com', 'email.thenorthface.com'], returnDays: 60 },
  { id: 'reformation', name: 'Reformation', domains: ['thereformation.com', 'email.thereformation.com'], returnDays: 30 },
  { id: 'ssense', name: 'SSENSE', domains: ['ssense.com', 'email.ssense.com'], returnDays: 30 },
  { id: 'zappos', name: 'Zappos', domains: ['zappos.com', 'email.zappos.com'], returnDays: 365 },
  { id: 'footlocker', name: 'Foot Locker', domains: ['footlocker.com', 'email.footlocker.com'], returnDays: 45 },
  { id: 'target', name: 'Target', domains: ['target.com', 'em.target.com', 'oe.target.com'], returnDays: 90, mixed: true },
  { id: 'amazon', name: 'Amazon', domains: ['amazon.com', 'marketplace.amazon.com', 'orders.amazon.com'], returnDays: 30, mixed: true },
  { id: 'depop', name: 'Depop', domains: ['depop.com', 'mail.depop.com'], returnDays: null },
  { id: 'poshmark', name: 'Poshmark', domains: ['poshmark.com', 'email.poshmark.com'], returnDays: null },
  { id: 'thredup', name: 'ThredUp', domains: ['thredup.com', 'email.thredup.com'], returnDays: 14 },
  { id: 'brandy', name: 'Brandy Melville', domains: ['brandymelvilleusa.com', 'brandymelville.com'], returnDays: 30 },
  { id: 'pacsun', name: 'PacSun', domains: ['pacsun.com', 'email.pacsun.com'], returnDays: 30 },
  { id: 'americaneagle', name: 'American Eagle', domains: ['ae.com', 'email.ae.com', 'aerie.com'], returnDays: null },
  { id: 'skims', name: 'SKIMS', domains: ['skims.com', 'email.skims.com'], returnDays: 30 },
  { id: 'garage', name: 'Garage', domains: ['garageclothing.com', 'email.garageclothing.com', 'dynamiteclothing.com'], returnDays: 30 },
  { id: 'edikted', name: 'Edikted', domains: ['edikted.com', 'email.edikted.com'], returnDays: 14 },
  { id: 'princesspolly', name: 'Princess Polly', domains: ['princesspolly.com', 'email.princesspolly.com'], returnDays: 30 },
];
