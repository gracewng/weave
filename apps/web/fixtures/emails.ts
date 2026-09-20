/**
 * DEVIN-OWNED (task 3). Order-confirmation fixtures.
 *
 * Emails are generated from a compact spec table so the HTML, the expected `extract_email` result and the matching
 * card charge can never drift apart. Dates are relative to today, so the demo stays current: return windows are
 * still open, "last 48 hours" is still the last 48 hours, and the 18-month history keeps its shape.
 */
import type { FixtureEmail } from '@weave/shared/contracts';
import type { ExtractEmailResult } from '@weave/shared/prompts';

export interface FixtureLine {
  name: string;
  brand: string | null;
  size: string | null;
  color: string | null;
  priceCents: number;
  quantity?: number;
  /** false for the non-apparel lines in a mixed Amazon order — they get an image but no extracted item. */
  clothing?: boolean;
  identifier?: string | null;
  imageLabel?: string;
}

export interface OrderSpec {
  id: string;
  retailer: string;
  from: string;
  subject: string;
  /** Days before today. */
  daysAgo: number;
  lines: FixtureLine[];
  /** 'shipping' emails must be rejected: direction other, no items. */
  kind?: 'order' | 'shipping';
  orderRef?: string;
}

export const TODAY = new Date();

export function isoDaysAgo(daysAgo: number, today: Date = TODAY): string {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function isoStampDaysAgo(daysAgo: number, today: Date = TODAY): string {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(15, 7, 0, 0);
  return d.toISOString();
}

function humanDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** Stable placeholder images — no network dependency on a retailer CDN that may 404 mid-demo. */
export function placeholderImage(label: string, bg = 'f6f3ec'): string {
  return `https://placehold.co/400x520/${bg}/141414/png?text=${encodeURIComponent(label)}`;
}

export function orderTotalCents(spec: OrderSpec): number {
  return spec.lines.reduce((sum, l) => sum + l.priceCents * (l.quantity ?? 1), 0);
}

export function buildEmail(spec: OrderSpec): FixtureEmail {
  const date = isoDaysAgo(spec.daysAgo);
  const stamp = isoStampDaysAgo(spec.daysAgo);
  if (spec.kind === 'shipping') {
    const l = spec.lines[0]!;
    return {
      id: spec.id,
      from: spec.from,
      subject: spec.subject,
      date: stamp,
      html: `<html><body><p>Good news — your ${spec.retailer} order is on its way.</p>
<img src="${placeholderImage(l.imageLabel ?? l.name)}" width="200" alt="${l.name}">
<p>${l.name}</p><p>Estimated delivery ${humanDate(isoDaysAgo(spec.daysAgo - 4))}</p>
<p><a href="https://example.com/track">Track your package</a></p></body></html>`,
    };
  }
  const rows = spec.lines
    .map(
      (l) => `<tr><td><img src="${placeholderImage(l.imageLabel ?? l.name)}" width="120" alt="${l.name}"></td>
<td>${l.name}${l.brand && !l.name.toLowerCase().includes(l.brand.toLowerCase()) ? `<br>Brand: ${l.brand}` : ''}
${l.color ? `<br>Color: ${l.color}` : ''}${l.size ? ` · Size: ${l.size}` : ''}
${l.identifier ? `<br>Item #: ${l.identifier}` : ''}
<br>${money(l.priceCents)}${(l.quantity ?? 1) > 1 ? ` × ${l.quantity}` : ''}</td></tr>`,
    )
    .join('\n');
  return {
    id: spec.id,
    from: spec.from,
    subject: spec.subject,
    date: stamp,
    html: `<html><body><h1>Thanks for your order</h1>
<p>Order ${spec.orderRef ?? spec.id.toUpperCase()} · ${humanDate(date)}</p>
<table>${rows}</table>
<p>Total ${money(orderTotalCents(spec))}</p>
<p>Questions? Visit our help centre · Unsubscribe · Privacy Policy</p></body></html>`,
  };
}

export function buildExpected(spec: OrderSpec): ExtractEmailResult {
  const order_date = isoDaysAgo(spec.daysAgo);
  if (spec.kind === 'shipping') {
    return { direction: 'other', is_clothing_order: false, retailer: spec.retailer, order_date, items: [] };
  }
  return {
    direction: 'purchase',
    is_clothing_order: true,
    retailer: spec.retailer,
    order_date,
    items: spec.lines
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => l.clothing !== false)
      .map(({ l, i }) => ({
        name: l.name,
        brand: l.brand,
        size: l.size,
        color: l.color,
        price_cents: l.priceCents,
        quantity: l.quantity ?? 1,
        image_index: i,
        link_index: null,
        identifier: l.identifier ?? null,
      })),
  };
}

const line = (
  name: string,
  brand: string | null,
  size: string | null,
  color: string | null,
  priceCents: number,
  extra: Partial<FixtureLine> = {},
): FixtureLine => ({ name, brand, size, color, priceCents, ...extra });

/**
 * 30 emails over 18 months: single- and multi-item orders, 2 shipping notifications that must be rejected,
 * 2 Amazon orders that mix clothing with non-clothing.
 */
export const ORDER_SPECS: OrderSpec[] = [
  { id: 'fx-uniqlo-1', retailer: 'Uniqlo', from: 'UNIQLO <order@email.uniqlo.com>', subject: 'Your UNIQLO order confirmation #US2026-771', daysAgo: 12, orderRef: '#US2026-771',
    lines: [line('U Crew Neck Short-Sleeve T-Shirt', 'Uniqlo', 'M', 'Black', 1_490, { quantity: 2, imageLabel: 'Black crew tee' }), line('Pleated Wide Pants', 'Uniqlo', '30', 'Navy', 4_990)] },
  { id: 'fx-everlane-1', retailer: 'Everlane', from: 'Everlane <hello@email.everlane.com>', subject: 'Order confirmed: #EV-58213', daysAgo: 3, orderRef: '#EV-58213',
    lines: [line('The Linen Relaxed Shirt', 'Everlane', 'S', 'Bone', 7_800)] },
  { id: 'fx-aritzia-1', retailer: 'Aritzia', from: 'Aritzia <orders@email.aritzia.com>', subject: 'Order Confirmation – A0098231', daysAgo: 2, orderRef: 'A0098231',
    lines: [line('Wilfred Slip Midi Dress', 'Wilfred', '4', 'Black', 14_800, { imageLabel: 'Slip dress' })] },
  { id: 'fx-madewell-1', retailer: 'Madewell', from: 'Madewell <madewell@email.madewell.com>', subject: 'Your Madewell order #MW9921044', daysAgo: 21, orderRef: '#MW9921044',
    lines: [line('The Perfect Vintage Jean', 'Madewell', '27', 'Fiona Wash', 12_800), line('Whisper Cotton Crewneck Tee', 'Madewell', 'S', 'Stripe', 2_950)] },
  { id: 'fx-zara-1', retailer: 'Zara', from: 'ZARA <noreply@zara.com>', subject: 'Your order 3341 0927 4412 is confirmed', daysAgo: 34, orderRef: '3341 0927 4412',
    lines: [line('Oversized Wool Blend Overshirt', 'Zara', 'S', 'Ecru', 8_990, { identifier: '02753/303' })] },
  { id: 'fx-amazon-mixed-1', retailer: 'Amazon', from: 'Amazon.com <auto-confirm@amazon.com>', subject: 'Your Amazon.com order #112-4471120-2231455', daysAgo: 48, orderRef: '#112-4471120-2231455',
    lines: [
      line("Levi's Women's Original Trucker Jacket", "Levi's", 'M', 'Medium Wash', 6_950, { imageLabel: 'Denim jacket' }),
      line('Anker USB-C Cable 6ft (2-Pack)', 'Anker', null, null, 1_299, { clothing: false, imageLabel: 'USB-C cable' }),
      line('Bombas Ankle Socks 4-Pack', 'Bombas', 'M', 'White', 4_760),
    ] },
  { id: 'fx-nike-shipped', retailer: 'Nike', from: 'Nike <nike@notifications.nike.com>', subject: 'Your order has shipped!', daysAgo: 58, kind: 'shipping',
    lines: [line('Nike Air Force 1 07', 'Nike', '8', 'White', 11_500, { imageLabel: 'Sneaker' })] },
  { id: 'fx-nike-1', retailer: 'Nike', from: 'Nike <nike@notifications.nike.com>', subject: 'Order #C0079412 confirmed', daysAgo: 62, orderRef: '#C0079412',
    lines: [line('Nike Air Force 1 07', 'Nike', '8', 'White', 11_500, { identifier: 'DD8959-100', imageLabel: 'White sneakers' })] },
  { id: 'fx-cos-1', retailer: 'COS', from: 'COS <customerservice@cos.com>', subject: 'Order confirmation 8811023', daysAgo: 75, orderRef: '8811023',
    lines: [line('Clean Cut Merino Sweater', 'COS', 'S', 'Grey Melange', 9_900), line('Wide Leg Wool Trousers', 'COS', '4', 'Charcoal', 13_500)] },
  { id: 'fx-hm-1', retailer: 'H&M', from: 'H&M <noreply@news.hm.com>', subject: 'Order confirmation 0384-772210', daysAgo: 88, orderRef: '0384-772210',
    lines: [line('Ribbed Tank Top', 'H&M', 'S', 'Black', 1_299, { quantity: 2 }), line('Linen-blend Shorts', 'H&M', '4', 'Sand', 2_499)] },
  { id: 'fx-lululemon-1', retailer: 'Lululemon', from: 'lululemon <orders@e.lululemon.com>', subject: 'We got your order (#LL7741203)', daysAgo: 96, orderRef: '#LL7741203',
    lines: [line('Align High-Rise Pant 25"', 'Lululemon', '4', 'Black', 9_800)] },
  { id: 'fx-reformation-1', retailer: 'Reformation', from: 'Reformation <hello@email.thereformation.com>', subject: 'Order #REF-220391 confirmed', daysAgo: 110, orderRef: '#REF-220391',
    lines: [line('Kourtney Silk Slip Dress', 'Reformation', '4', 'Black', 24_800, { imageLabel: 'Silk slip dress' })] },
  { id: 'fx-nordstrom-1', retailer: 'Nordstrom', from: 'Nordstrom <customerservice@email.nordstrom.com>', subject: 'Your Nordstrom order NS88120397', daysAgo: 124, orderRef: 'NS88120397',
    lines: [line('Dr. Martens 1460 Leather Boot', 'Dr. Martens', '7', 'Black', 17_000, { imageLabel: 'Black boots' })] },
  { id: 'fx-jcrew-1', retailer: 'J.Crew', from: 'J.Crew <jcrew@e.jcrew.com>', subject: 'Thanks for your order #JC3320118', daysAgo: 139, orderRef: '#JC3320118',
    lines: [line('Cashmere Crewneck Sweater', 'J.Crew', 'S', 'Heather Oatmeal', 14_800), line('Cotton Poplin Shirt', 'J.Crew', 'XS', 'White', 7_950)] },
  { id: 'fx-uniqlo-2', retailer: 'Uniqlo', from: 'UNIQLO <order@email.uniqlo.com>', subject: 'Your UNIQLO order confirmation #US2025-2290', daysAgo: 152, orderRef: '#US2025-2290',
    lines: [line('Ultra Light Down Jacket', 'Uniqlo', 'S', 'Olive', 6_990), line('Heattech Crew Neck T-Shirt', 'Uniqlo', 'S', 'Black', 1_990, { quantity: 2 })] },
  { id: 'fx-depop-buy-1', retailer: 'Depop', from: 'Depop <noreply@depop.com>', subject: 'Your order is confirmed', daysAgo: 165, orderRef: 'DP-99120',
    lines: [line('Vintage Levi\'s 501 Jeans', "Levi's", '28', 'Mid Wash', 4_200, { imageLabel: 'Vintage jeans' })] },
  { id: 'fx-sezane-1', retailer: 'Sézane', from: 'Sézane <contact@email.sezane.com>', subject: 'Your Sézane order #SZ-771209', daysAgo: 178, orderRef: '#SZ-771209',
    lines: [line('Gaspard Jumper', 'Sézane', 'S', 'Cream', 14_500)] },
  { id: 'fx-amazon-mixed-2', retailer: 'Amazon', from: 'Amazon.com <auto-confirm@amazon.com>', subject: 'Your Amazon.com order #114-9982213-7741002', daysAgo: 190, orderRef: '#114-9982213-7741002',
    lines: [
      line('Hanes Cotton Crew Socks 6-Pack', 'Hanes', 'M', 'White', 1_499),
      line('Brita Water Filter Pitcher', 'Brita', null, null, 3_299, { clothing: false, imageLabel: 'Water pitcher' }),
      line('Champion Reverse Weave Hoodie', 'Champion', 'S', 'Grey', 4_500),
      line('AA Batteries 16-Pack', 'Amazon Basics', null, null, 1_199, { clothing: false, imageLabel: 'Batteries' }),
    ] },
  { id: 'fx-adidas-shipped', retailer: 'Adidas', from: 'adidas <noreply@news.adidas.com>', subject: 'Your adidas order is on the way', daysAgo: 203, kind: 'shipping',
    lines: [line('Samba OG Shoes', 'Adidas', '7.5', 'White/Black', 10_000, { imageLabel: 'Samba sneakers' })] },
  { id: 'fx-adidas-1', retailer: 'Adidas', from: 'adidas <noreply@news.adidas.com>', subject: 'Order confirmation AD-4410238', daysAgo: 208, orderRef: 'AD-4410238',
    lines: [line('Samba OG Shoes', 'Adidas', '7.5', 'White/Black', 10_000, { identifier: 'B75806' })] },
  { id: 'fx-patagonia-1', retailer: 'Patagonia', from: 'Patagonia <patagonia@email.patagonia.com>', subject: 'Your Patagonia order #PT2291043', daysAgo: 221, orderRef: '#PT2291043',
    lines: [line('Better Sweater Fleece Jacket', 'Patagonia', 'S', 'Stonewash', 13_900)] },
  { id: 'fx-abercrombie-1', retailer: 'Abercrombie & Fitch', from: 'Abercrombie <news@email.abercrombie.com>', subject: 'Order #AF9920331 confirmed', daysAgo: 239, orderRef: '#AF9920331',
    lines: [line('Curve Love 90s Straight Jean', 'Abercrombie & Fitch', '27', 'Dark Wash', 8_900), line('Essential Cropped Tee', 'Abercrombie & Fitch', 'S', 'White', 2_400, { quantity: 2 })] },
  { id: 'fx-bananarepublic-1', retailer: 'Banana Republic', from: 'Banana Republic <bananarepublic@email.bananarepublic.com>', subject: 'Order BR-773310 confirmed', daysAgo: 256, orderRef: 'BR-773310',
    lines: [line('Italian Wool Blazer', 'Banana Republic', '4', 'Camel', 24_900, { imageLabel: 'Camel blazer' })] },
  { id: 'fx-uniqlo-3', retailer: 'Uniqlo', from: 'UNIQLO <order@email.uniqlo.com>', subject: 'Your UNIQLO order confirmation #US2025-1188', daysAgo: 274, orderRef: '#US2025-1188',
    lines: [line('Supima Cotton Crew Neck T-Shirt', 'Uniqlo', 'M', 'White', 1_490, { quantity: 3 })] },
  { id: 'fx-gap-1', retailer: 'Gap', from: 'Gap <gap@email.gap.com>', subject: 'Your Gap order #GP4412209', daysAgo: 291, orderRef: '#GP4412209',
    lines: [line('Vintage Soft Crewneck Sweatshirt', 'Gap', 'S', 'Navy', 4_495), line('Organic Cotton Chinos', 'Gap', '4', 'Khaki', 5_995)] },
  { id: 'fx-arcteryx-1', retailer: 'Arc\'teryx', from: "Arc'teryx <orders@arcteryx.com>", subject: 'Order AR-2213908 confirmed', daysAgo: 312, orderRef: 'AR-2213908',
    lines: [line('Atom Insulated Hoody', "Arc'teryx", 'S', 'Black', 30_000, { imageLabel: 'Insulated hoody' })] },
  { id: 'fx-anthropologie-1', retailer: 'Anthropologie', from: 'Anthropologie <anthropologie@email.anthropologie.com>', subject: 'Order #AN7712034 confirmed', daysAgo: 338, orderRef: '#AN7712034',
    lines: [line('Somerset Maxi Dress', 'Anthropologie', 'S', 'Green Floral', 15_800), line('Pilcro Wide Leg Jean', 'Pilcro', '27', 'Light Wash', 12_800)] },
  { id: 'fx-uniqlo-4', retailer: 'Uniqlo', from: 'UNIQLO <order@email.uniqlo.com>', subject: 'Your UNIQLO order confirmation #US2025-0417', daysAgo: 372, orderRef: '#US2025-0417',
    lines: [line('Smart Ankle Pants', 'Uniqlo', '4', 'Black', 4_990), line('Rayon Long-Sleeve Blouse', 'Uniqlo', 'S', 'White', 2_990)] },
  { id: 'fx-thredup-1', retailer: 'ThredUp', from: 'ThredUp <orders@thredup.com>', subject: 'Your ThredUp order TU-882103', daysAgo: 401, orderRef: 'TU-882103',
    lines: [line('Theory Wool Blend Coat (pre-owned)', 'Theory', 'S', 'Camel', 8_900, { imageLabel: 'Wool coat' })] },
  { id: 'fx-zara-2', retailer: 'Zara', from: 'ZARA <noreply@zara.com>', subject: 'Your order 5521 0083 1190 is confirmed', daysAgo: 452, orderRef: '5521 0083 1190',
    lines: [line('Satin Effect Slip Skirt', 'Zara', 'S', 'Black', 3_990), line('Knit Crop Cardigan', 'Zara', 'S', 'Cream', 4_590), line('Faux Leather Tote', 'Zara', null, 'Black', 5_990)] },
];

export const fixtureEmails: FixtureEmail[] = ORDER_SPECS.map(buildEmail);

export const fixtureExtractEmail: Record<string, ExtractEmailResult> = Object.fromEntries(
  ORDER_SPECS.map((s) => [s.id, buildExpected(s)]),
);
