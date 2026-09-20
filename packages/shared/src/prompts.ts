/**
 * LLM contracts: system prompts (stable → cache-friendly) + zod schemas (strict JSON).
 * Rules for strict structured output (OpenAI + Meta): no .optional() — use .nullable();
 * every object key is required; no unions at the root.
 */
import { z } from 'zod';

export const CATEGORIES = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory', 'intimates', 'other'] as const;
export const SLOTS = ['top', 'bottom', 'one_piece', 'outer', 'shoes', 'accessory'] as const;
export const PERSONAS = ['bestie', 'stylist', 'cfo'] as const;
export const VERDICTS = ['skip', 'borrow', 'secondhand', 'wait', 'buy'] as const;

// ─── extract_email ────────────────────────────────────────────────────────────

export const ExtractedItemSchema = z.object({
  name: z.string(),
  brand: z.string().nullable(),
  size: z.string().nullable(),
  color: z.string().nullable(),
  price_cents: z.number().int(),
  quantity: z.number().int(),
  image_index: z.number().int().nullable(),
  /** Index into the numbered product-link list, or null. */
  link_index: z.number().int().nullable(),
  /** UPC/EAN/SKU/style/item number exactly as printed, or null. */
  identifier: z.string().nullable(),
});

export const ExtractEmailSchema = z.object({
  /** purchase = the user bought; sale = the user SOLD (marketplace seller email); refund = money back; other. */
  direction: z.enum(['purchase', 'sale', 'refund', 'other']),
  is_clothing_order: z.boolean(),
  retailer: z.string(),
  order_date: z.string(), // YYYY-MM-DD
  items: z.array(ExtractedItemSchema),
});
export type ExtractEmailResult = z.infer<typeof ExtractEmailSchema>;

export const EXTRACT_EMAIL_SYSTEM = `You extract clothing purchases from order confirmation emails. First decide direction: 'purchase' when the user is the buyer; 'sale' when the user is the SELLER (marketplace emails like Depop/Poshmark/eBay/Mercari that say you sold, your buyer, ship to the buyer, shipping label, earnings, payout, or address the user as the shop); 'refund' for refund/return-credit notices; 'other' otherwise. For a sale, still list the items sold (name, price the buyer paid) but set is_clothing_order to false — sales are never purchases. Include only apparel, shoes, and wearable accessories; exclude beauty, home, electronics, gift cards, and shipping fees. If the email is a shipping or delivery update rather than an order/receipt, set is_clothing_order to false and return no items. Prices are per-unit in cents after discounts, before tax. Match each item to the most likely product image from the numbered IMAGES list, and to the most likely product page from the numbered LINKS list, or null. Copy any UPC, EAN, SKU, style or item number printed for the item into identifier, exactly as printed, or null. Never invent fields — use null when unsure. order_date must be YYYY-MM-DD.`;

/** Variable part goes LAST so the static prefix above stays cache-identical. */
export function extractEmailInput(args: { from: string; subject: string; date: string; text: string; imageUrls: string[]; linkUrls?: string[] }): string {
  const images = args.imageUrls.length ? args.imageUrls.map((u, i) => `${i}: ${u}`).join('\n') : '(none)';
  const links = args.linkUrls?.length ? args.linkUrls.map((u, i) => `${i}: ${u}`).join('\n') : '(none)';
  return `IMAGES:\n${images}\n\nLINKS:\n${links}\n\nFROM: ${args.from}\nSUBJECT: ${args.subject}\nDATE: ${args.date}\n\nEMAIL TEXT:\n${args.text}`;
}

// ─── tag_items ────────────────────────────────────────────────────────────────

export const TaggedItemSchema = z.object({
  id: z.string(),
  category: z.enum(CATEGORIES),
  slot: z.enum(SLOTS),
  color: z.string(),
  formality: z.number().int().min(1).max(5),
  /** Normalized, e.g. "black cotton crew-neck t-shirt, casual, Uniqlo". Used for embeddings. */
  description: z.string(),
  /** Who the garment is cut/marketed for, from the name and brand line. unknown when it can't be told. */
  department: z.enum(['womens', 'mens', 'unisex', 'kids', 'unknown']),
});
export const TagItemsSchema = z.object({ items: z.array(TaggedItemSchema) });
export type TagItemsResult = z.infer<typeof TagItemsSchema>;

export const TAG_ITEMS_SYSTEM = `You normalize clothing items. For each item return: category (top, bottom, dress, outerwear, shoes, accessory, intimates, other), slot (top, bottom, one_piece, outer, shoes, accessory), a single dominant color word, formality 1-5 (1 gym/loungewear, 2 casual, 3 smart casual, 4 business/cocktail, 5 black tie), and a compact description: "<color> <material> <garment>, <formality word>, <brand>" (omit the color word entirely when it is not known — never write "unknown"). Underwear, bras, socks and sleepwear are intimates. Also set department: womens, mens, unisex, kids, or unknown, from explicit words only ("Women's", "Men's", "Boys'", bra, dress, boxers, etc.) — never guess from the brand alone. Keep the same ids. Never add items.`;

export function tagItemsInput(items: Array<{ id: string; name: string; brand?: string | null; color?: string | null; retailer?: string | null }>): string {
  return items.map((i) => `${i.id} | ${i.name} | brand: ${i.brand ?? '?'} | color: ${i.color ?? '?'} | retailer: ${i.retailer ?? '?'}`).join('\n');
}

// ─── read_capture ─────────────────────────────────────────────────────────────

export const ReadCaptureSchema = z.object({
  kind: z.enum(['receipt', 'tag', 'garment', 'unknown']),
  retailer: z.string().nullable(),
  total_cents: z.number().int().nullable(),
  items: z.array(z.object({
    name: z.string(),
    brand: z.string().nullable(),
    size: z.string().nullable(),
    color: z.string().nullable(),
    price_cents: z.number().int().nullable(),
    category: z.enum(CATEGORIES),
    /** UPC/SKU/style number if printed on the receipt or tag. */
    identifier: z.string().nullable(),
  })),
  confidence: z.number().min(0).max(1),
});
export type ReadCaptureResult = z.infer<typeof ReadCaptureSchema>;

export const READ_CAPTURE_SYSTEM = `You read a photo taken right after an in-store clothing purchase. Classify it as a receipt, a price/brand tag, a garment photo, or unknown. Extract only clothing line items with per-unit prices in cents when visible. For tags, read brand, size, and price. For garments, describe the item and guess category and color. Report confidence 0-1. Never invent prices.`;

// ─── judge_images (Identify the item) ─────────────────────────────────────────

export const JudgeImagesSchema = z.object({
  images: z.array(z.object({
    index: z.number().int(),
    /** Only the garment is shown: flat lay, mannequin/ghost, or hanger. No person. */
    product_only: z.boolean(),
    /** The image plausibly shows the named item (right garment type). */
    matches_item: z.boolean(),
    /** The garment shown is plausible for the account holder's profile line (department/age), when one is given. */
    fits_profile: z.boolean(),
  })),
});
export type JudgeImagesResult = z.infer<typeof JudgeImagesSchema>;

export const JUDGE_IMAGES_SYSTEM = `You look at numbered product thumbnails for one clothing item. For each image report: product_only = true only when no person or body part is visible (flat lay, ghost mannequin, hanger, or plain product shot); matches_item = true when the picture shows the same kind of garment as the item name AND, if the item line states a color, the garment is that color; fits_profile = true when the garment shown is plausible for the ACCOUNT HOLDER line if one is given (e.g. a men's cut for someone who shops men's; kids' sizing for kids), else true. Return every index you were given.`;

// ─── parse_query (search bar) ─────────────────────────────────────────────────

export const ParseQuerySchema = z.object({
  /** Cleaned search phrase for embeddings + marketplaces, e.g. "black slip dress". */
  query: z.string(),
  category: z.enum(CATEGORIES).nullable(),
  color: z.string().nullable(),
  brand: z.string().nullable(),
  max_price_cents: z.number().int().nullable(),
  /** e.g. "wedding", "interview" — signals a one-time need → borrow first. */
  occasion: z.string().nullable(),
  one_time_need: z.boolean(),
  /** Same shape as wardrobe item descriptions, for embedding: "<color> <material> <garment>, <formality word>". */
  description: z.string(),
});
export type ParseQueryResult = z.infer<typeof ParseQuerySchema>;

export const PARSE_QUERY_SYSTEM = `You parse a clothing shopping query into structured filters. Extract the cleaned item phrase, category, color, brand, a max price in cents if stated, and an occasion if mentioned. Set one_time_need true when the query implies a single event (wedding, formal, interview, costume, "for Saturday"). Also write description in exactly this shape: "<color> <material or fabric if implied> <garment noun>, <formality word>" where the formality word is one of gym/loungewear, casual, smart casual, cocktail, black tie — e.g. "black cotton t-shirt, casual" or "black satin slip dress, cocktail". Use null when not stated. Never invent a price.`;

// ─── search_note ──────────────────────────────────────────────────────────────

export const SEARCH_NOTE_SYSTEM = `You write the one line shown above shopping search results in a wardrobe app. The verdict is already decided and you must not contradict it. One sentence, under 25 words, plain text, no emojis. Mention one concrete number (a count, a price, a wear count) or the friend's name. If OWNED SIMILAR lists items, name the closest one and its wear count even when the verdict is buy — never say nothing matches when something is listed. Never shame the user.`;

export function searchNoteInput(args: {
  verdict: (typeof VERDICTS)[number];
  query: string;
  ownedSimilar: Array<{ name: string; wears: number; price_cents: number | null }>;
  friendItem?: { name: string; friendName: string } | null;
  cheapestUsedCents?: number | null;
  usualPriceCents?: number | null;
  budgetRemainingCents?: number | null;
}): string {
  const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
  return [
    `VERDICT (fixed): ${args.verdict}`,
    `QUERY: ${args.query}`,
    `OWNED SIMILAR: ${args.ownedSimilar.length ? args.ownedSimilar.map((i) => `${i.name} (worn ${i.wears}x${i.price_cents != null ? `, paid ${usd(i.price_cents)}` : ''})`).join('; ') : 'none'}`,
    `FRIEND CAN LEND: ${args.friendItem ? `${args.friendItem.friendName}'s ${args.friendItem.name}` : 'none'}`,
    `CHEAPEST USED: ${args.cheapestUsedCents != null ? usd(args.cheapestUsedCents) : 'none'}`,
    `USER USUALLY PAYS: ${args.usualPriceCents != null ? usd(args.usualPriceCents) : 'unknown'}`,
    `BUDGET LEFT THIS MONTH: ${args.budgetRemainingCents != null ? usd(args.budgetRemainingCents) : 'unknown'}`,
  ].join('\n');
}

// ─── spoken_line ──────────────────────────────────────────────────────────────

export const PERSONA_STYLE: Record<(typeof PERSONAS)[number], string> = {
  bestie: 'Warm, hype, a little funny, gently talks the user down. Sounds like a best friend texting.',
  stylist: 'Blunt, fashion-literate, opinionated about fit and fabric. No fluff.',
  cfo: 'Dry, all numbers, mildly amused. Talks in dollars and cost-per-wear.',
};

export const SPOKEN_LINE_SYSTEM = `You write the one spoken line a wardrobe copilot says about a purchase or a monthly statement. The verdict is already decided and you must not contradict it. One or two sentences, under 30 words. Mention at least one concrete number (a price, a wear count, a budget figure) or a friend's name. Never shame the user. Output plain text only, no quotes, no emojis.`;

export function spokenLineInput(args: {
  persona: (typeof PERSONAS)[number];
  verdict: (typeof VERDICTS)[number];
  productTitle: string;
  priceCents: number;
  similarOwned?: { name: string; wears: number } | null;
  friendItem?: { name: string; friendName: string } | null;
  cheapestUsedCents?: number | null;
  budgetRemainingCents?: number | null;
}): string {
  const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
  return [
    `PERSONA: ${args.persona} — ${PERSONA_STYLE[args.persona]}`,
    `VERDICT (fixed): ${args.verdict}`,
    `PRODUCT: ${args.productTitle} at ${usd(args.priceCents)}`,
    `MOST SIMILAR OWNED: ${args.similarOwned ? `${args.similarOwned.name} (worn ${args.similarOwned.wears}x)` : 'none'}`,
    `FRIEND CAN LEND: ${args.friendItem ? `${args.friendItem.friendName}'s ${args.friendItem.name}` : 'none'}`,
    `BUDGET LEFT THIS MONTH: ${args.budgetRemainingCents != null ? usd(args.budgetRemainingCents) : 'unknown'}`,
    `CHEAPEST USED: ${args.cheapestUsedCents != null ? usd(args.cheapestUsedCents) : 'none'}`,
  ].join('\n');
}

// ─── borrow_message ───────────────────────────────────────────────────────────

export const BORROW_MESSAGE_SYSTEM = `Draft a warm, casual message asking a friend to borrow one clothing item. Under 40 words. Mention the event and the date, and offer to return it by a specific day. No emojis unless the user's past messages use them. Output plain text only.`;

export function borrowMessageInput(args: { friendName: string; itemName: string; event: string; neededOn: string; returnBy: string; usesEmoji: boolean }): string {
  return `FRIEND: ${args.friendName}\nITEM: ${args.itemName}\nEVENT: ${args.event} on ${args.neededOn}\nRETURN BY: ${args.returnBy}\nUSER USES EMOJI: ${args.usesEmoji ? 'yes' : 'no'}`;
}
