/**
 * DEVIN-OWNED (task 3). The search tiers under DEMO_MODE: secondhand listings, shopping results, retail pages.
 * Keys are lowercased query prefixes; `fixtures.ts` does the prefix lookup so "black slip dress for a wedding"
 * still finds the "black slip dress" bucket.
 */
import type { FixtureProductPage, ShoppingResult, UsedListing } from '@weave/shared/contracts';
import { placeholderImage } from './emails';

const used = (title: string, priceCents: number, condition: string, slug: string): UsedListing => ({
  title,
  priceCents,
  url: `https://www.ebay.com/itm/fixture-${slug}`,
  imageUrl: placeholderImage(title.slice(0, 24), 'ece7dd'),
  condition,
  source: 'fixture',
});

export const fixtureUsedListings: Record<string, UsedListing[]> = {
  'black slip dress': [
    used('Black Satin Slip Dress Size S', 2_200, 'Pre-owned', 'slip-1'),
    used('Reformation Kourtney Silk Slip Dress 4', 8_900, 'Like new', 'slip-2'),
    used('Bias Cut Midi Slip Dress Black 6', 4_200, 'Very good', 'slip-3'),
  ],
  'plain black tee': [
    used('Uniqlo U Crew Neck T-Shirt Black M', 900, 'Pre-owned', 'tee-1'),
    used('Everlane Cotton Box-Cut Tee Black S', 1_400, 'Like new', 'tee-2'),
    used('Madewell Whisper Crewneck Tee Black S', 1_650, 'Pre-owned', 'tee-3'),
  ],
  'white sneakers': [
    used('Nike Air Force 1 07 White W8', 5_800, 'Pre-owned', 'af1-1'),
    used('Adidas Stan Smith White 7.5', 3_400, 'Very good', 'stan-1'),
    used('Veja Esplar White Leather 38', 6_200, 'Like new', 'veja-1'),
  ],
  'levis 501 jeans': [
    used("Levi's 501 Original Jeans W28 L30", 2_600, 'Pre-owned', '501-1'),
    used("Vintage Levi's 501 Dark Wash 28x30", 5_200, 'Very good', '501-2'),
  ],
  'trench coat': [
    used('Everlane Trench Coat Khaki 4', 6_500, 'Pre-owned', 'trench-1'),
    used('Theory Wool Blend Coat Camel S', 8_900, 'Very good', 'coat-1'),
  ],
  'statement jacket': [
    used('Vintage Sequin Bomber Jacket S', 4_800, 'Pre-owned', 'bomber-1'),
    used('Cropped Faux Leather Moto Jacket S', 3_900, 'Very good', 'moto-1'),
  ],
};

const shop = (title: string, merchant: string, priceCents: number, slug: string, productOnly: boolean | null = true): ShoppingResult => ({
  title,
  imageUrl: placeholderImage(title.slice(0, 24)),
  priceCents,
  merchant,
  url: `https://www.google.com/shopping/product/fixture-${slug}`,
  productOnly,
});

export const fixtureShoppingResults: Record<string, ShoppingResult[]> = {
  'black slip dress': [
    shop('Kourtney Silk Slip Dress, Black', 'Reformation', 24_800, 'ref-slip'),
    shop('Wilfred Slip Midi Dress, Black', 'Aritzia', 14_800, 'aritzia-slip'),
    shop('Satin Effect Slip Dress', 'Zara', 4_990, 'zara-slip', false),
  ],
  'plain black tee': [
    shop('U Crew Neck Short-Sleeve T-Shirt, Black', 'Uniqlo', 1_490, 'uniqlo-tee'),
    shop('The Cotton Box-Cut Tee, Black', 'Everlane', 3_000, 'everlane-tee'),
    shop('Whisper Cotton Crewneck Tee, True Black', 'Madewell', 2_950, 'madewell-tee'),
  ],
  'white sneakers': [
    shop('Air Force 1 07, White', 'Nike', 11_500, 'af1'),
    shop('Stan Smith Shoes, Cloud White', 'Adidas', 10_000, 'stan'),
    shop('Esplar Leather Sneaker, Extra White', 'Veja', 15_000, 'veja'),
  ],
  'levis 501 jeans': [
    shop("501 Original Fit Jeans", "Levi's", 6_950, 'levis-501'),
    shop("501 '93 Straight Fit Jeans", "Levi's", 9_800, 'levis-501-93'),
  ],
  'trench coat': [
    shop('The Trench Coat, Khaki', 'Everlane', 29_800, 'everlane-trench'),
    shop('Belted Cotton Trench', 'J.Crew', 24_800, 'jcrew-trench'),
  ],
  'neutral overshirt': [
    shop('Oversized Wool Blend Overshirt, Ecru', 'Zara', 8_990, 'zara-overshirt'),
    shop('Flannel Overshirt, Oat', 'Everlane', 9_800, 'everlane-overshirt'),
  ],
};

/** The "new retail" tier of search — one near-duplicate of something the demo user owns, on purpose. */
export const fixtureProductPages: FixtureProductPage[] = [
  {
    url: 'https://www.everlane.com/products/womens-cotton-box-cut-tee-black',
    title: 'The Cotton Box-Cut Tee — Black',
    priceCents: 3_000,
    imageUrl: placeholderImage('Black box-cut tee'),
    description: 'black cotton t-shirt, casual',
  },
  {
    url: 'https://www.thereformation.com/products/kourtney-silk-dress',
    title: 'Kourtney Silk Slip Dress — Black',
    priceCents: 24_800,
    imageUrl: placeholderImage('Black slip dress', '1a1a1a'),
    description: 'black silk slip dress, cocktail',
  },
  {
    url: 'https://www.zara.com/us/en/oversized-wool-blend-overshirt-p02753303.html',
    title: 'Oversized Wool Blend Overshirt — Ecru',
    priceCents: 8_990,
    imageUrl: placeholderImage('Ecru overshirt', 'e9e4d8'),
    description: 'ecru wool overshirt, smart casual',
  },
  {
    url: 'https://www.ssense.com/en-us/women/product/fixture/sequin-bomber-jacket',
    title: 'Sequin Bomber Jacket — Fuchsia',
    priceCents: 42_000,
    imageUrl: placeholderImage('Sequin bomber', 'd94f9c'),
    description: 'fuchsia sequin bomber jacket, cocktail',
  },
  {
    url: 'https://www.nike.com/t/air-force-1-07-womens-shoes-fixture',
    title: 'Nike Air Force 1 07 — White',
    priceCents: 11_500,
    imageUrl: placeholderImage('White sneakers', 'ffffff'),
    description: 'white leather sneakers, casual',
  },
  {
    url: 'https://www.levi.com/US/en_US/clothing/women/jeans/501-original-fit-womens-jeans/p/fixture',
    title: "Levi's 501 Original Fit Jeans — Medium Wash",
    priceCents: 9_800,
    imageUrl: placeholderImage('Blue jeans', 'aab4c8'),
    description: 'medium wash denim jeans, casual',
  },
];
