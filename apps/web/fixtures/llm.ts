/**
 * DEVIN-OWNED (task 3). Pre-computed model outputs for DEMO_MODE and for the "both providers are down" path.
 * `fixtures.test.ts` validates every one of these against the zod schemas in @weave/shared/prompts.
 */
import type { ParseQueryResult } from '@weave/shared/prompts';

export const fixtureParseQuery: Record<string, ParseQueryResult> = {
  'black slip dress for a wedding': {
    query: 'black slip dress',
    category: 'dress',
    color: 'black',
    brand: null,
    max_price_cents: null,
    occasion: 'wedding',
    one_time_need: true,
    description: 'black satin slip dress, cocktail',
  },
  'plain black tee': {
    query: 'plain black tee',
    category: 'top',
    color: 'black',
    brand: null,
    max_price_cents: null,
    occasion: null,
    one_time_need: false,
    description: 'black cotton t-shirt, casual',
  },
  'white sneakers under $80': {
    query: 'white sneakers',
    category: 'shoes',
    color: 'white',
    brand: null,
    max_price_cents: 8_000,
    occasion: null,
    one_time_need: false,
    description: 'white leather sneakers, casual',
  },
  'levis 501 jeans size 28': {
    query: "levi's 501 jeans",
    category: 'bottom',
    color: null,
    brand: "Levi's",
    max_price_cents: null,
    occasion: null,
    one_time_need: false,
    description: 'blue denim jeans, casual',
  },
  'trench coat for fall': {
    query: 'trench coat',
    category: 'outerwear',
    color: null,
    brand: null,
    max_price_cents: null,
    occasion: null,
    one_time_need: false,
    description: 'khaki cotton trench coat, smart casual',
  },
  'something loud for a halloween party': {
    query: 'statement jacket',
    category: 'outerwear',
    color: null,
    brand: null,
    max_price_cents: null,
    occasion: 'halloween party',
    one_time_need: true,
    description: 'sequin statement jacket, cocktail',
  },
  'interview blazer': {
    query: 'blazer',
    category: 'outerwear',
    color: null,
    brand: null,
    max_price_cents: null,
    occasion: 'interview',
    one_time_need: true,
    description: 'navy wool blazer, business',
  },
  'neutral overshirt': {
    query: 'neutral overshirt',
    category: 'top',
    color: 'ecru',
    brand: null,
    max_price_cents: null,
    occasion: null,
    one_time_need: false,
    description: 'ecru wool overshirt, smart casual',
  },
  'lululemon align leggings': {
    query: 'align leggings',
    category: 'bottom',
    color: 'black',
    brand: 'Lululemon',
    max_price_cents: null,
    occasion: null,
    one_time_need: false,
    description: 'black nylon leggings, gym/loungewear',
  },
};

/** One line above the results. Never contradicts the verdict, always carries a number or a name. */
export const fixtureSearchNote: Record<string, string> = {
  skip: 'You already own a close match — the black Uniqlo crew tee you paid $14.90 for in March.',
  borrow: 'Maya has a black slip dress in your size and it is lendable — asking is free.',
  secondhand: 'Three used ones start at $22, about 85% off the $148 you were about to spend.',
  wait: 'This is $148 against $62 left in your September envelope — a 48-hour hold costs nothing.',
  buy: 'Nothing close in your closet, and your median dress purchase is $96 across 5 confirmed buys.',
};

export const fixtureBorrowMessage =
  'Hey Maya! Any chance I could borrow your black slip dress for Sam and Al’s wedding on the 4th? I’d pick it up Friday and have it back to you that Sunday. Totally fine if not!';
