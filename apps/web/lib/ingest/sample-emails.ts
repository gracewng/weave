/**
 * Stopgap DEMO_MODE emails so ingestion works before Devin's fixtures land (task 3).
 * When `apps/web/fixtures/index.ts` exports `fixtures.emails`, pipeline.ts prefers those.
 */
import type { ExtractEmailResult } from '@weave/shared/prompts';

export interface SampleEmail { id: string; from: string; subject: string; date: string; html: string; expected: ExtractEmailResult }

const img = (label: string, bg = 'f6f3ec') => `https://placehold.co/400x520/${bg}/141414/png?text=${encodeURIComponent(label)}`;

export const SAMPLE_EMAILS: SampleEmail[] = [
  {
    id: 'sample-uniqlo-1', from: 'UNIQLO <order@email.uniqlo.com>', subject: 'Your UNIQLO order confirmation #US2026-771', date: '2026-08-14T15:02:00Z',
    html: `<html><body><h1>Thanks for your order, Grace</h1><p>Order #US2026-771 · Aug 14, 2026</p>
<table><tr><td><img src="${img('Black crew tee')}" width="120"></td><td>U Crew Neck Short-Sleeve T-Shirt<br>Color: 09 BLACK · Size: M<br>$14.90 × 2</td></tr>
<tr><td><img src="${img('Wide pants')}" width="120"></td><td>Pleated Wide Pants<br>Color: 69 NAVY · Size: 30<br>$49.90 × 1</td></tr></table>
<p>Subtotal $79.70 · Tax $5.18 · Shipping FREE · Total $84.88</p><p>Unsubscribe · Privacy Policy</p></body></html>`,
    expected: { direction: 'purchase', is_clothing_order: true, retailer: 'Uniqlo', order_date: '2026-08-14', items: [
      { name: 'U Crew Neck Short-Sleeve T-Shirt', brand: 'Uniqlo', size: 'M', color: 'Black', price_cents: 1490, quantity: 2, image_index: 0, link_index: null, identifier: null },
      { name: 'Pleated Wide Pants', brand: 'Uniqlo', size: '30', color: 'Navy', price_cents: 4990, quantity: 1, image_index: 1, link_index: null, identifier: null } ] },
  },
  {
    id: 'sample-everlane-1', from: 'Everlane <hello@email.everlane.com>', subject: 'Order confirmed: #EV-58213', date: '2026-07-02T18:40:00Z',
    html: `<html><body><p>We got your order.</p><img src="${img('Linen shirt','e9e4d8')}" width="200"><p>The Linen Relaxed Shirt — Bone — S — $78.00</p><p>Order total $84.24</p><p>View in browser · Manage preferences</p></body></html>`,
    expected: { direction: 'purchase', is_clothing_order: true, retailer: 'Everlane', order_date: '2026-07-02', items: [
      { name: 'The Linen Relaxed Shirt', brand: 'Everlane', size: 'S', color: 'Bone', price_cents: 7800, quantity: 1, image_index: 0, link_index: null, identifier: null } ] },
  },
  {
    id: 'sample-nike-shipped', from: 'Nike <nike@notifications.nike.com>', subject: 'Your order has shipped!', date: '2026-06-20T12:00:00Z',
    html: `<html><body><p>Good news — your Nike order is on its way.</p><img src="${img('Sneaker')}" width="200"><p>Track your package</p></body></html>`,
    expected: { direction: 'other', is_clothing_order: false, retailer: 'Nike', order_date: '2026-06-20', items: [] },
  },
  {
    id: 'sample-amazon-mixed', from: 'Amazon.com <auto-confirm@amazon.com>', subject: 'Your Amazon.com order #112-4471120-2231455', date: '2026-05-11T09:15:00Z',
    html: `<html><body><p>Order Confirmation</p><p>Order #112-4471120-2231455 · May 11, 2026</p>
<table><tr><td><img src="${img('Denim jacket','e4dfd3')}" width="100"></td><td>Levi's Women's Original Trucker Jacket, Medium Wash, Size M<br>$69.50</td></tr>
<tr><td><img src="${img('USB-C cable','dddddd')}" width="100"></td><td>Anker USB-C Cable 6ft (2-Pack)<br>$12.99</td></tr>
<tr><td><img src="${img('Socks')}" width="100"></td><td>Bombas Ankle Socks 4-Pack, Size M<br>$47.60</td></tr></table>
<p>Order Total: $130.09</p></body></html>`,
    expected: { direction: 'purchase', is_clothing_order: true, retailer: 'Amazon', order_date: '2026-05-11', items: [
      { name: "Levi's Original Trucker Jacket", brand: "Levi's", size: 'M', color: 'Medium Wash', price_cents: 6950, quantity: 1, image_index: 0, link_index: null, identifier: null },
      { name: 'Bombas Ankle Socks 4-Pack', brand: 'Bombas', size: 'M', color: null, price_cents: 4760, quantity: 1, image_index: 2, link_index: null, identifier: null } ] },
  },
  {
    id: 'sample-aritzia-1', from: 'Aritzia <orders@email.aritzia.com>', subject: 'Order Confirmation – A0098231', date: '2026-09-03T21:11:00Z',
    html: `<html><body><p>Thank you for shopping with Aritzia.</p><img src="${img('Slip dress','1a1a1a')}" width="180"><p>Wilfred Slip Midi Dress · Black · Size 4 · $148.00</p><p>Total $160.58</p></body></html>`,
    expected: { direction: 'purchase', is_clothing_order: true, retailer: 'Aritzia', order_date: '2026-09-03', items: [
      { name: 'Wilfred Slip Midi Dress', brand: 'Wilfred', size: '4', color: 'Black', price_cents: 14800, quantity: 1, image_index: 0, link_index: null, identifier: null } ] },
  },
];
