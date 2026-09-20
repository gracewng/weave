/**
 * DEVIN-OWNED (task 3). Seed a demo-ready Supabase project: one demo user with a 45-item closet, three friends,
 * 18 months of transactions, a budget, the full Ghost Rack lifecycle, one loan, one pending return and one
 * confirmed refund. (Wear tracking was removed from the schema in migration 0012, so no wear logs.)
 *
 *   pnpm tsx scripts/seed-demo.ts [--reset]
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. With --reset the demo users are deleted first
 * (cascades wipe their rows), so re-running is idempotent. Embeddings are left null unless OPENAI_API_KEY is set.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { fixtures } from '../apps/web/fixtures/index';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESET = process.argv.includes('--reset');

if (!URL || !SERVICE_KEY) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see scripts/README.md).');
  process.exit(1);
}

const db = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

const DEMO_PASSWORD = 'weave-demo-2026';
const today = new Date();
const iso = (daysAgo: number): string => {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};
const stamp = (daysAgo: number): string => {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
};
const img = (label: string, bg = 'f6f3ec') =>
  `https://placehold.co/400x520/${bg}/141414/png?text=${encodeURIComponent(label)}`;

/** Deterministic PRNG so every seeded database looks identical. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Category = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'accessory' | 'intimates' | 'other';
type Slot = 'top' | 'bottom' | 'one_piece' | 'outer' | 'shoes' | 'accessory';

interface Blueprint {
  name: string;
  brand: string;
  category: Category;
  slot: Slot;
  color: string;
  formality: number;
  priceCents: number;
  retailer: string;
  material: string;
}

const SLOT_BY_CATEGORY: Record<Category, Slot> = {
  top: 'top',
  bottom: 'bottom',
  dress: 'one_piece',
  outerwear: 'outer',
  shoes: 'shoes',
  accessory: 'accessory',
  intimates: 'top',
  other: 'accessory',
};

const b = (
  name: string,
  brand: string,
  category: Category,
  color: string,
  formality: number,
  priceCents: number,
  retailer: string,
  material: string,
): Blueprint => ({ name, brand, category, slot: SLOT_BY_CATEGORY[category], color, formality, priceCents, retailer, material });

/** A believable closet: enough near-duplicates for the "you already own this" moment to land. */
const CLOSET: Blueprint[] = [
  b('U Crew Neck T-Shirt', 'Uniqlo', 'top', 'black', 2, 1_490, 'Uniqlo', 'cotton'),
  b('U Crew Neck T-Shirt', 'Uniqlo', 'top', 'white', 2, 1_490, 'Uniqlo', 'cotton'),
  b('Supima Cotton Crew Neck T-Shirt', 'Uniqlo', 'top', 'navy', 2, 1_490, 'Uniqlo', 'cotton'),
  b('Whisper Cotton Crewneck Tee', 'Madewell', 'top', 'stripe', 2, 2_950, 'Madewell', 'cotton'),
  b('The Cotton Box-Cut Tee', 'Everlane', 'top', 'black', 2, 3_000, 'Everlane', 'cotton'),
  b('Ribbed Tank Top', 'H&M', 'top', 'black', 2, 1_299, 'H&M', 'cotton'),
  b('The Linen Relaxed Shirt', 'Everlane', 'top', 'bone', 3, 7_800, 'Everlane', 'linen'),
  b('Cotton Poplin Shirt', 'J.Crew', 'top', 'white', 3, 7_950, 'J.Crew', 'cotton'),
  b('Rayon Long-Sleeve Blouse', 'Uniqlo', 'top', 'white', 3, 2_990, 'Uniqlo', 'rayon'),
  b('Clean Cut Merino Sweater', 'COS', 'top', 'grey', 3, 9_900, 'COS', 'merino'),
  b('Cashmere Crewneck Sweater', 'J.Crew', 'top', 'oatmeal', 3, 14_800, 'J.Crew', 'cashmere'),
  b('Gaspard Jumper', 'Sézane', 'top', 'cream', 3, 14_500, 'Sézane', 'wool'),
  b('Vintage Soft Crewneck Sweatshirt', 'Gap', 'top', 'navy', 2, 4_495, 'Gap', 'cotton'),
  b('Reverse Weave Hoodie', 'Champion', 'top', 'grey', 1, 4_500, 'Amazon', 'cotton'),
  b('Heattech Crew Neck T-Shirt', 'Uniqlo', 'top', 'black', 1, 1_990, 'Uniqlo', 'synthetic'),
  b('Knit Crop Cardigan', 'Zara', 'top', 'cream', 3, 4_590, 'Zara', 'knit'),
  b('Essential Cropped Tee', 'Abercrombie & Fitch', 'top', 'white', 2, 2_400, 'Abercrombie & Fitch', 'cotton'),
  b('The Perfect Vintage Jean', 'Madewell', 'bottom', 'indigo', 2, 12_800, 'Madewell', 'denim'),
  b('Curve Love 90s Straight Jean', 'Abercrombie & Fitch', 'bottom', 'dark wash', 2, 8_900, 'Abercrombie & Fitch', 'denim'),
  b("501 Original Fit Jeans", "Levi's", 'bottom', 'mid wash', 2, 4_200, 'Depop', 'denim'),
  b('Pleated Wide Pants', 'Uniqlo', 'bottom', 'navy', 3, 4_990, 'Uniqlo', 'polyester'),
  b('Smart Ankle Pants', 'Uniqlo', 'bottom', 'black', 3, 4_990, 'Uniqlo', 'polyester'),
  b('Wide Leg Wool Trousers', 'COS', 'bottom', 'charcoal', 4, 13_500, 'COS', 'wool'),
  b('Organic Cotton Chinos', 'Gap', 'bottom', 'khaki', 2, 5_995, 'Gap', 'cotton'),
  b('Align High-Rise Pant 25"', 'Lululemon', 'bottom', 'black', 1, 9_800, 'Lululemon', 'nylon'),
  b('Linen-blend Shorts', 'H&M', 'bottom', 'sand', 2, 2_499, 'H&M', 'linen'),
  b('Satin Effect Slip Skirt', 'Zara', 'bottom', 'black', 3, 3_990, 'Zara', 'satin'),
  b('Pilcro Wide Leg Jean', 'Pilcro', 'bottom', 'light wash', 2, 12_800, 'Anthropologie', 'denim'),
  b('Wilfred Slip Midi Dress', 'Wilfred', 'dress', 'black', 4, 14_800, 'Aritzia', 'satin'),
  b('Kourtney Silk Slip Dress', 'Reformation', 'dress', 'black', 4, 24_800, 'Reformation', 'silk'),
  b('Somerset Maxi Dress', 'Anthropologie', 'dress', 'green floral', 3, 15_800, 'Anthropologie', 'cotton'),
  b('Ultra Light Down Jacket', 'Uniqlo', 'outerwear', 'olive', 2, 6_990, 'Uniqlo', 'nylon'),
  b('Better Sweater Fleece Jacket', 'Patagonia', 'outerwear', 'stonewash', 2, 13_900, 'Patagonia', 'fleece'),
  b('Atom Insulated Hoody', "Arc'teryx", 'outerwear', 'black', 2, 30_000, "Arc'teryx", 'nylon'),
  b('Italian Wool Blazer', 'Banana Republic', 'outerwear', 'camel', 4, 24_900, 'Banana Republic', 'wool'),
  b('Oversized Wool Blend Overshirt', 'Zara', 'outerwear', 'ecru', 3, 8_990, 'Zara', 'wool'),
  b('Theory Wool Blend Coat', 'Theory', 'outerwear', 'camel', 4, 8_900, 'ThredUp', 'wool'),
  b('Original Trucker Jacket', "Levi's", 'outerwear', 'medium wash', 2, 6_950, 'Amazon', 'denim'),
  b('Air Force 1 07', 'Nike', 'shoes', 'white', 2, 11_500, 'Nike', 'leather'),
  b('Samba OG Shoes', 'Adidas', 'shoes', 'white', 2, 10_000, 'Adidas', 'leather'),
  b('1460 Leather Boot', 'Dr. Martens', 'shoes', 'black', 3, 17_000, 'Nordstrom', 'leather'),
  b('Faux Leather Tote', 'Zara', 'accessory', 'black', 3, 5_990, 'Zara', 'faux leather'),
  b('Ankle Socks 4-Pack', 'Bombas', 'intimates', 'white', 1, 4_760, 'Amazon', 'cotton'),
  b('Cotton Crew Socks 6-Pack', 'Hanes', 'intimates', 'white', 1, 1_499, 'Amazon', 'cotton'),
  b('Wool Scarf', 'COS', 'accessory', 'oatmeal', 3, 4_500, 'COS', 'wool'),
];

const FORMALITY_WORD = ['gym/loungewear', 'gym/loungewear', 'casual', 'smart casual', 'cocktail', 'black tie'];

const SIZES: Record<Slot, string> = { top: 'S', bottom: '27', one_piece: '4', outer: 'S', shoes: '8', accessory: 'OS' };

interface ItemRow {
  user_id: string;
  name: string;
  brand: string;
  category: Category;
  slot: Slot;
  color: string;
  formality: number;
  size: string;
  price_cents: number;
  purchase_date: string;
  retailer: string;
  image_url: string;
  image_source: 'email' | 'shopping' | 'user_photo';
  source: 'email' | 'receipt' | 'mystery' | 'quick_add';
  return_by: string | null;
  status?: 'owned' | 'returning' | 'returned';
  return_initiated_at?: string | null;
  refund_cents?: number | null;
  refunded_at?: string | null;
  shareable: boolean;
  lendable: boolean;
  description: string;
  est_resale_cents: number;
}

function buildItem(userId: string, bp: Blueprint, daysAgo: number, sizeOverride?: string): ItemRow {
  return {
    user_id: userId,
    name: bp.name,
    brand: bp.brand,
    category: bp.category,
    slot: bp.slot,
    color: bp.color,
    formality: bp.formality,
    size: sizeOverride ?? SIZES[bp.slot],
    price_cents: bp.priceCents,
    purchase_date: iso(daysAgo),
    retailer: bp.retailer,
    image_url: img(`${bp.color} ${bp.name}`.slice(0, 28)),
    image_source: 'email',
    source: 'email',
    return_by: null,
    shareable: true,
    lendable: bp.category !== 'intimates',
    description: `${bp.color} ${bp.material} ${bp.name.toLowerCase()}, ${FORMALITY_WORD[bp.formality]}`,
    est_resale_cents: Math.round(bp.priceCents * 0.35),
  };
}

async function createUser(
  email: string,
  displayName: string,
  sizes: Record<string, string>,
  shopsDepartment: 'womens' | 'mens' | 'both' | 'kids' = 'womens',
): Promise<string> {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
  const { error: pErr } = await db
    .from('profiles')
    .upsert({
      id: data.user.id,
      display_name: displayName,
      sizes,
      invite_code: displayName.toLowerCase().slice(0, 8),
      shops_department: shopsDepartment,
      // Set so the app layout does not bounce the demo accounts into /welcome.
      onboarded_at: stamp(30),
    });
  if (pErr) throw new Error(`profile ${email}: ${pErr.message}`);
  return data.user.id;
}

async function deleteUserByEmail(email: string): Promise<void> {
  // listUsers is paginated; the demo project is small, so one page of 200 is plenty.
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw new Error(`listUsers: ${error.message}`);
  const user = data.users.find((u) => u.email === email);
  if (user) {
    const { error: dErr } = await db.auth.admin.deleteUser(user.id);
    if (dErr) throw new Error(`deleteUser ${email}: ${dErr.message}`);
  }
}

/** Untyped project (no generated Database types yet), so the row shape is checked by the callers' own types. */
async function insert<Row extends object>(table: string, rows: Row[]): Promise<Array<{ id: string }>> {
  if (!rows.length) return [];
  const { data, error } = await db.from(table).insert(rows as never).select('id');
  if (error) throw new Error(`insert ${table}: ${error.message}`);
  return (data ?? []) as Array<{ id: string }>;
}

async function friendship(a: string, b2: string): Promise<void> {
  const [user_a, user_b] = a < b2 ? [a, b2] : [b2, a];
  const { error } = await db
    .from('friendships')
    .upsert({ user_a, user_b, status: 'accepted', requested_by: user_a });
  if (error) throw new Error(`friendship: ${error.message}`);
}

/** Optional: embed item descriptions when a key is present; Phase 3 backfills otherwise. */
async function embedDescriptions(rows: Array<{ id: string; description: string }>): Promise<void> {
  if (!process.env.OPENAI_API_KEY || !rows.length) return;
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI();
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input: batch.map((r) => r.description) });
    for (const [j, e] of res.data.entries()) {
      const { error } = await db.from('items').update({ embedding: e.embedding }).eq('id', batch[j]!.id);
      if (error) throw new Error(`embedding: ${error.message}`);
    }
  }
  console.log(`  embedded ${rows.length} descriptions`);
}

interface FriendSpec {
  email: string;
  name: string;
  sizes: Record<string, string>;
  itemCount: number;
  seed: number;
  shopsDepartment: 'womens' | 'mens' | 'both' | 'kids';
}

const FRIENDS: FriendSpec[] = [
  { email: 'maya@weave.app', name: 'Maya', sizes: { top: 'S', bottom: '27', shoes: '8' }, itemCount: 34, seed: 11, shopsDepartment: 'womens' },
  { email: 'jordan@weave.app', name: 'Jordan', sizes: { top: 'M', bottom: '31', shoes: '10' }, itemCount: 28, seed: 22, shopsDepartment: 'both' },
  { email: 'priya@weave.app', name: 'Priya', sizes: { top: 'XS', bottom: '25', shoes: '7' }, itemCount: 38, seed: 33, shopsDepartment: 'womens' },
];

const DEMO_EMAIL = 'demo@weave.app';

async function main(): Promise<void> {
  if (RESET) {
    console.log('resetting demo users…');
    for (const email of [DEMO_EMAIL, ...FRIENDS.map((f) => f.email)]) await deleteUserByEmail(email);
  }

  console.log('creating users…');
  const demoId = await createUser(DEMO_EMAIL, 'Demo', { top: 'S', bottom: '27', shoes: '8' });
  const friendIds: Record<string, string> = {};
  for (const f of FRIENDS) friendIds[f.name] = await createUser(f.email, f.name, f.sizes, f.shopsDepartment);

  // ── demo closet: 45 items, spread over 18 months ───────────────────────────
  const closet = CLOSET.map((bp, i) => buildItem(demoId, bp, Math.round(20 + (i / CLOSET.length) * 500)));

  // two items still inside a return window that closes within 4 days
  closet[4]!.purchase_date = iso(26);
  closet[4]!.return_by = iso(-3);
  closet[28]!.purchase_date = iso(2);
  closet[28]!.return_by = iso(-4);

  // one pending return (Return Pending) and one confirmed refund (Money Recovered)
  closet[22]!.status = 'returning';
  closet[22]!.return_initiated_at = stamp(3);
  closet[35]!.status = 'returned';
  closet[35]!.refund_cents = 7_900;
  closet[35]!.refunded_at = stamp(11);

  // a couple of in-store purchases so not everything traces back to an email
  closet[40]!.source = 'receipt';
  closet[40]!.image_source = 'user_photo';
  closet[41]!.source = 'mystery';

  const items = await insert('items', closet);
  console.log(`  ${items.length} items for demo@weave.app`);

  // ── friends' closets ───────────────────────────────────────────────────────
  const friendItems: Record<string, Array<{ id: string }>> = {};
  for (const f of FRIENDS) {
    const rand = rng(f.seed);
    const rows = Array.from({ length: f.itemCount }, (_, i) => {
      const bp = CLOSET[Math.floor(rand() * CLOSET.length)]!;
      return buildItem(friendIds[f.name]!, bp, Math.round(10 + rand() * 520), f.sizes[bp.slot === 'one_piece' ? 'top' : bp.slot] ?? SIZES[bp.slot]);
    });
    // Maya owns the black slip dress in the demo user's size — the borrow beat of the demo depends on it
    if (f.name === 'Maya') {
      rows[0] = buildItem(friendIds.Maya!, CLOSET.find((c) => c.name === 'Kourtney Silk Slip Dress')!, 140, '4');
    }
    friendItems[f.name] = await insert('items', rows);
    console.log(`  ${rows.length} items for ${f.email}`);
  }

  // ── friendships: demo ↔ each friend, and the friends with each other ───────
  for (const f of FRIENDS) await friendship(demoId, friendIds[f.name]!);
  await friendship(friendIds.Maya!, friendIds.Jordan!);
  await friendship(friendIds.Maya!, friendIds.Priya!);
  await friendship(friendIds.Jordan!, friendIds.Priya!);

  // ── one past loan: Maya's slip dress, borrowed and returned ────────────────
  const mayaSlipDressId = friendItems.Maya![0]!.id;
  const [loan] = await insert('loans', [
    {
      item_id: mayaSlipDressId,
      owner_id: friendIds.Maya!,
      borrower_id: demoId,
      status: 'returned',
      event_name: "Sam and Al's wedding",
      needed_on: iso(24),
      due_back: iso(18),
      message: 'Any chance I could borrow the black slip dress for the wedding?',
      saved_cents: 16_800,
    },
  ]);

  // ── transactions: the fixture charges, classified ──────────────────────────
  const emailOrderDates = new Set(fixtures.emails.map((e) => e.date.slice(0, 10)));
  const txRows = fixtures.charges.map((c) => {
    const mystery = c.externalId.startsWith('fx-charge-mystery-');
    const recent = c.externalId.startsWith('fx-charge-recent-');
    const matched = c.isClothing && !mystery && !recent && emailOrderDates.has(c.date);
    return {
      user_id: demoId,
      external_id: c.externalId,
      merchant: c.merchant,
      amount_cents: c.amountCents,
      date: c.date,
      is_clothing: c.isClothing,
      match_status: !c.isClothing ? 'skipped' : mystery ? 'mystery' : matched ? 'matched' : 'unmatched',
      decision: c.isClothing && matched ? 'keep' : null,
      decided_at: c.isClothing && matched ? stamp(1) : null,
    };
  });
  const txs = await insert('transactions', txRows);
  console.log(`  ${txs.length} transactions (${txRows.filter((t) => t.match_status === 'mystery').length} mystery)`);

  // ── budget: $4,200 take-home, 5% on clothes ────────────────────────────────
  const { error: budgetErr } = await db
    .from('budgets')
    .upsert({ user_id: demoId, monthly_income_cents: 420_000, clothing_pct: 5 });
  if (budgetErr) throw new Error(`budget: ${budgetErr.message}`);

  // ── Ghost Rack: the whole lifecycle, so the Statement has something to show ─
  await insert('holds', [
    {
      user_id: demoId, title: 'Sequin Bomber Jacket', url: fixtures.productPages[3]!.url, image_url: fixtures.productPages[3]!.imageUrl,
      price_cents: 42_000, intended_source: 'SSENSE', query: 'something loud for a halloween party', verdict: 'wait',
      status: 'held', release_at: stamp(1), kept_cents: 0,
    },
    {
      user_id: demoId, title: 'The Trench Coat', url: 'https://www.everlane.com/products/womens-trench-coat', image_url: img('Trench coat', 'e9e4d8'),
      price_cents: 29_800, intended_source: 'Everlane', query: 'trench coat for fall', verdict: 'wait',
      status: 'held', release_at: stamp(2), kept_cents: 0,
    },
    {
      user_id: demoId, title: 'The Cotton Box-Cut Tee', url: fixtures.productPages[0]!.url, image_url: fixtures.productPages[0]!.imageUrl,
      price_cents: 3_000, intended_source: 'Everlane', query: 'plain black tee', verdict: 'skip',
      status: 'skipped', outcome_confirmed_at: stamp(9), owned_item_id: items[0]!.id, kept_cents: 3_000,
    },
    {
      user_id: demoId, title: 'Kourtney Silk Slip Dress', url: fixtures.productPages[1]!.url, image_url: fixtures.productPages[1]!.imageUrl,
      price_cents: 16_800, intended_source: 'Reformation', query: 'black slip dress for a wedding', verdict: 'borrow',
      status: 'borrowed', outcome_confirmed_at: stamp(18), loan_id: loan!.id, actual_paid_cents: 0, kept_cents: 16_800,
    },
    {
      user_id: demoId, title: "Levi's 501 Original Fit Jeans", url: fixtures.productPages[5]!.url, image_url: fixtures.productPages[5]!.imageUrl,
      price_cents: 9_800, intended_source: "Levi's", query: 'levis 501 jeans size 28', verdict: 'secondhand',
      status: 'bought_used', outcome_confirmed_at: stamp(31), actual_paid_cents: 4_200, cheapest_used_cents: 4_200, kept_cents: 5_600,
    },
  ]);

  await embedDescriptions(closet.map((row, i) => ({ id: items[i]!.id, description: row.description })));

  console.log(`\ndone. sign in as ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
