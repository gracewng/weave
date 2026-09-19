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
});

export const ExtractEmailSchema = z.object({
  is_clothing_order: z.boolean(),
  retailer: z.string(),
  order_date: z.string(), // YYYY-MM-DD
  items: z.array(ExtractedItemSchema),
});
export type ExtractEmailResult = z.infer<typeof ExtractEmailSchema>;

export const EXTRACT_EMAIL_SYSTEM = `You extract clothing purchases from order confirmation emails. Include only apparel, shoes, and wearable accessories; exclude beauty, home, electronics, gift cards, and shipping fees. If the email is a shipping or delivery update rather than an order/receipt, set is_clothing_order to false and return no items. Prices are per-unit in cents after discounts, before tax. Match each item to the most likely product image from the numbered list, or null. Never invent fields — use null when unsure. order_date must be YYYY-MM-DD.`;

/** Variable part goes LAST so the static prefix above stays cache-identical. */
export function extractEmailInput(args: { from: string; subject: string; date: string; text: string; imageUrls: string[] }): string {
  const images = args.imageUrls.length
    ? args.imageUrls.map((u, i) => `${i}: ${u}`).join('\n')
    : '(none)';
  return `IMAGES:\n${images}\n\nFROM: ${args.from}\nSUBJECT: ${args.subject}\nDATE: ${args.date}\n\nEMAIL TEXT:\n${args.text}`;
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
});
export const TagItemsSchema = z.object({ items: z.array(TaggedItemSchema) });
export type TagItemsResult = z.infer<typeof TagItemsSchema>;

export const TAG_ITEMS_SYSTEM = `You normalize clothing items. For each item return: category (top, bottom, dress, outerwear, shoes, accessory, intimates, other), slot (top, bottom, one_piece, outer, shoes, accessory), a single dominant color word, formality 1-5 (1 gym/loungewear, 2 casual, 3 smart casual, 4 business/cocktail, 5 black tie), and a compact description: "<color> <material> <garment>, <formality word>, <brand>". Underwear, bras, socks and sleepwear are intimates. Keep the same ids. Never add items.`;

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
  })),
  confidence: z.number().min(0).max(1),
});
export type ReadCaptureResult = z.infer<typeof ReadCaptureSchema>;

export const READ_CAPTURE_SYSTEM = `You read a photo taken right after an in-store clothing purchase. Classify it as a receipt, a price/brand tag, a garment photo, or unknown. Extract only clothing line items with per-unit prices in cents when visible. For tags, read brand, size, and price. For garments, describe the item and guess category and color. Report confidence 0-1. Never invent prices.`;

// ─── score_pairings ───────────────────────────────────────────────────────────

export const ScorePairingsSchema = z.object({
  pairs: z.array(z.object({ a: z.string(), b: z.string(), score: z.number().min(0).max(1) })),
});
export type ScorePairingsResult = z.infer<typeof ScorePairingsSchema>;

export const SCORE_PAIRINGS_SYSTEM = `You judge whether two clothing items look good worn together in one outfit. Score 0-1: 1.0 = classic combination, 0.6 = works, 0.3 = awkward, 0.0 = clashing. Consider color harmony, formality match, silhouette, and season. Return every pair you were given, with the same ids.`;

export function scorePairingsInput(pairs: Array<{ a: string; b: string; descA: string; descB: string }>): string {
  return pairs.map((p) => `${p.a} :: ${p.descA}\n${p.b} :: ${p.descB}`).join('\n---\n');
}

// ─── crew_fits ────────────────────────────────────────────────────────────────

export const CrewFitsSchema = z.object({
  looks: z.array(z.object({
    user_id: z.string(),
    item_ids: z.array(z.string()),
    borrowed: z.array(z.object({ item_id: z.string(), from_user_id: z.string() })),
    rationale: z.string(),
  })),
  group_palette: z.string(),
  notes: z.string().nullable(),
});
export type CrewFitsResult = z.infer<typeof CrewFitsSchema>;

export const CREW_FITS_SYSTEM = `You style a group of friends for one event using ONLY the items listed. Produce exactly one look per member. A look is (top + bottom) or one one_piece, plus shoes, optionally outerwear and accessories. Rules: (a) use only listed item ids; (b) the group must coordinate — complementary palette, matching formality that fits the dress code; (c) prefer each person's own items, borrow from another member only to fill a gap; (d) a borrowed item must be in the borrower's size for that slot; (e) never assign one item to two people. For each look, list item_ids (including borrowed ones) and the borrowed entries with from_user_id, plus a one-sentence rationale. Return group_palette as a short phrase.`;

export interface CrewMemberCompact {
  user_id: string;
  name: string;
  sizes: Record<string, string>;
  items: Array<{ id: string; slot: string; size: string | null; description: string }>;
}

/** Compact descriptions only — never images. */
export function crewFitsInput(args: { event: string; date: string; dressCode: string; vibe: string; members: CrewMemberCompact[] }): string {
  const members = args.members.map((m) =>
    `MEMBER ${m.user_id} (${m.name}) sizes=${JSON.stringify(m.sizes)}\n` +
    m.items.map((i) => `  ${i.id} | ${i.slot} | size ${i.size ?? '?'} | ${i.description}`).join('\n'),
  ).join('\n');
  return `EVENT: ${args.event} on ${args.date}\nDRESS CODE: ${args.dressCode}\nVIBE: ${args.vibe}\n\n${members}`;
}

// ─── spoken_line ──────────────────────────────────────────────────────────────

export const PERSONA_STYLE: Record<(typeof PERSONAS)[number], string> = {
  bestie: 'Warm, hype, a little funny, gently talks the user down. Sounds like a best friend texting.',
  stylist: 'Blunt, fashion-literate, opinionated about fit and fabric. No fluff.',
  cfo: 'Dry, all numbers, mildly amused. Talks in dollars and cost-per-wear.',
};

export const SPOKEN_LINE_SYSTEM = `You write the one spoken line a shopping copilot says at checkout. The verdict is already decided and you must not contradict it. One or two sentences, under 30 words. Mention at least one concrete number (a price, a wear count, an outfit count) or a friend's name. Never shame the user. Output plain text only, no quotes, no emojis.`;

export function spokenLineInput(args: {
  persona: (typeof PERSONAS)[number];
  verdict: (typeof VERDICTS)[number];
  productTitle: string;
  priceCents: number;
  similarOwned?: { name: string; wears: number } | null;
  friendItem?: { name: string; friendName: string } | null;
  outfitsUnlocked: number;
  cheapestUsedCents?: number | null;
}): string {
  const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
  return [
    `PERSONA: ${args.persona} — ${PERSONA_STYLE[args.persona]}`,
    `VERDICT (fixed): ${args.verdict}`,
    `PRODUCT: ${args.productTitle} at ${usd(args.priceCents)}`,
    `MOST SIMILAR OWNED: ${args.similarOwned ? `${args.similarOwned.name} (worn ${args.similarOwned.wears}x)` : 'none'}`,
    `FRIEND CAN LEND: ${args.friendItem ? `${args.friendItem.friendName}'s ${args.friendItem.name}` : 'none'}`,
    `OUTFITS UNLOCKED: ${args.outfitsUnlocked}`,
    `CHEAPEST USED: ${args.cheapestUsedCents != null ? usd(args.cheapestUsedCents) : 'none'}`,
  ].join('\n');
}

// ─── borrow_message ───────────────────────────────────────────────────────────

export const BORROW_MESSAGE_SYSTEM = `Draft a warm, casual message asking a friend to borrow one clothing item. Under 40 words. Mention the event and the date, and offer to return it by a specific day. No emojis unless the user's past messages use them. Output plain text only.`;

export function borrowMessageInput(args: { friendName: string; itemName: string; event: string; neededOn: string; returnBy: string; usesEmoji: boolean }): string {
  return `FRIEND: ${args.friendName}\nITEM: ${args.itemName}\nEVENT: ${args.event} on ${args.neededOn}\nRETURN BY: ${args.returnBy}\nUSER USES EMOJI: ${args.usesEmoji ? 'yes' : 'no'}`;
}
