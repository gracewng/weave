/** Stopgap deep links until @weave/data (Devin task 5) ships `marketplaces`. Secondhand first; retail last. */
export interface Link { id: string; name: string; kind: 'secondhand' | 'retail'; url: string }
const enc = encodeURIComponent;
export function secondhandLinks(q: string): Link[] {
  return [
    { id: 'depop', name: 'Depop', kind: 'secondhand', url: `https://www.depop.com/search/?q=${enc(q)}` },
    { id: 'poshmark', name: 'Poshmark', kind: 'secondhand', url: `https://poshmark.com/search?query=${enc(q)}&type=listings&src=dir` },
    { id: 'thredup', name: 'ThredUp', kind: 'secondhand', url: `https://www.thredup.com/search?text=${enc(q)}` },
    { id: 'ebay', name: 'eBay (used)', kind: 'secondhand', url: `https://www.ebay.com/sch/i.html?_nkw=${enc(q)}&LH_ItemCondition=3000` },
    { id: 'vinted', name: 'Vinted', kind: 'secondhand', url: `https://www.vinted.com/catalog?search_text=${enc(q)}` },
  ];
}
export function retailLinks(q: string): Link[] {
  return [{ id: 'google_shopping', name: 'Google Shopping', kind: 'retail', url: `https://www.google.com/search?tbm=shop&q=${enc(q)}` }];
}
