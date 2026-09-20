/**
 * Deep links for the secondhand and new-retail tiers of search (no API needed).
 * Secondhand first, retail last — the section order is the recommendation.
 *
 * Each `searchUrl` shape was checked on 2026-09-20 by requesting a built URL: eBay, Poshmark,
 * ThredUp, Grailed, Vinted and Google Shopping answered 200. Depop, Mercari and The RealReal
 * answer 403 to any scripted request (bot protection), so their shapes are the documented public
 * search format and are unverified here — worth one click each before the demo.
 */
import type { MarketplaceLink } from '@weave/shared/contracts';

const enc = (q: string) => encodeURIComponent(q.trim());

export const marketplaces: MarketplaceLink[] = [
  {
    id: 'ebay',
    name: 'eBay',
    kind: 'secondhand',
    logoEmoji: '🛒',
    // LH_ItemCondition=3000 is eBay's "Pre-owned" filter.
    searchUrl: (q) => `https://www.ebay.com/sch/i.html?_nkw=${enc(q)}&LH_ItemCondition=3000`,
  },
  {
    id: 'depop',
    name: 'Depop',
    kind: 'secondhand',
    logoEmoji: '👖',
    searchUrl: (q) => `https://www.depop.com/search/?q=${enc(q)}`,
  },
  {
    id: 'poshmark',
    name: 'Poshmark',
    kind: 'secondhand',
    logoEmoji: '👗',
    searchUrl: (q) => `https://poshmark.com/search?query=${enc(q)}&type=listings&src=dir`,
  },
  {
    id: 'thredup',
    name: 'ThredUp',
    kind: 'secondhand',
    logoEmoji: '♻️',
    searchUrl: (q) => `https://www.thredup.com/search?search_text=${enc(q)}`,
  },
  {
    id: 'vinted',
    name: 'Vinted',
    kind: 'secondhand',
    logoEmoji: '🧵',
    searchUrl: (q) => `https://www.vinted.com/catalog?search_text=${enc(q)}`,
  },
  {
    id: 'grailed',
    name: 'Grailed',
    kind: 'secondhand',
    logoEmoji: '🧥',
    searchUrl: (q) => `https://www.grailed.com/shop?query=${enc(q)}`,
  },
  {
    id: 'the_realreal',
    name: 'The RealReal',
    kind: 'secondhand',
    logoEmoji: '💼',
    searchUrl: (q) => `https://www.therealreal.com/search?keywords=${enc(q)}`,
  },
  {
    id: 'mercari',
    name: 'Mercari',
    kind: 'secondhand',
    logoEmoji: '📦',
    searchUrl: (q) => `https://www.mercari.com/search/?keyword=${enc(q)}`,
  },
  {
    id: 'google_shopping',
    name: 'Google Shopping',
    kind: 'retail',
    logoEmoji: '🔎',
    searchUrl: (q) => `https://www.google.com/search?tbm=shop&q=${enc(q)}`,
  },
];

export function secondhandLinks(query: string): Array<MarketplaceLink & { url: string }> {
  return marketplaces.filter((m) => m.kind === 'secondhand').map((m) => ({ ...m, url: m.searchUrl(query) }));
}

export function retailLinks(query: string): Array<MarketplaceLink & { url: string }> {
  return marketplaces.filter((m) => m.kind === 'retail').map((m) => ({ ...m, url: m.searchUrl(query) }));
}
