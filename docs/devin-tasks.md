# Devin task briefs — Weave

Paste each brief into Devin as-is. Every brief starts with the same preamble.

---

## Preamble (include with every task)

> You are working in the `weave` monorepo (pnpm workspaces, TypeScript). **Read `CLAUDE.md` at the repo root
> first** — it has the architecture, conventions, and the ownership map. You may only touch the paths listed under
> "Files you may touch" in this brief. Do not edit `/supabase`, `/apps/web` (except `fixtures/`), `/apps/extension/src`,
> or `/packages/shared` (except `*.test.ts`). If you need a change outside your paths, add a TODO under "TODOs for
> Devin-owned folders" in `CLAUDE.md` and mention it in the PR description. Implement against the interfaces in
> `/packages/shared/src/contracts.ts` — do not change them. Work on a branch `devin/<task>`; open one PR per task
> against `main` with a description that lists what's real vs mocked. Run `pnpm install`, `pnpm typecheck`, and
> `pnpm test` before opening the PR. No secrets in the repo; add any new env var to `.env.example` with a comment.

---

## Task 1 — Retailer data (`@weave/data`)

**Context.** Before any LLM call, Gmail ingestion pre-filters emails by sender domain, and card-transaction matching
maps statement merchant strings to retailers. Return windows compute `items.return_by`. This data is the cheap
gate that keeps token spend low.

**Contract.** `RetailerInfo`, `ReturnPolicy`, `RetailerData` in `/packages/shared/src/contracts.ts`.
Export `retailerData: RetailerData` from `/packages/data/src/index.ts` (a scaffold already exists — replace it).

**Deliverables.**
- `/packages/data/src/retailers.ts`: ~60 clothing retailers (US-centric; include Uniqlo, Zara, H&M, Nike, Adidas,
  Aritzia, Everlane, Madewell, J.Crew, Gap/Old Navy/Banana Republic, Abercrombie, Lululemon, Nordstrom, Urban
  Outfitters/Anthropologie/Free People, ASOS, Shein, Levi's, Patagonia, North Face, Reformation, SSENSE, Farfetch,
  Zappos, Foot Locker, Target, Amazon, Depop, Poshmark, ThredUp, Grailed, etc.). For each: `id`, `name`,
  `senderDomains` (all domains they send order emails from, e.g. `email.uniqlo.com`), `merchantVariants` (as they
  appear on card statements, e.g. `UNIQLO USA`, `SQ *`, `ZARA USA`), `mixed: true` for Amazon/Target/Walmart/Nordstrom
  style mixed retailers, and `source` URL in a comment.
- `/packages/data/src/returnPolicies.ts`: return windows for ~25 of them, with source URLs in comments;
  `null` for final-sale-only retailers.
- `/packages/data/src/index.ts`: builds `retailerData` with pure lookup helpers `bySenderDomain` (suffix match,
  case-insensitive), `byMerchant` (normalize whitespace/punctuation, uppercase, substring match on variants — longest
  variant wins), `returnWindowFor` (default 30).
- `/packages/data/src/data.test.ts`: lookups for 10 domains, 10 merchant strings incl. messy ones
  (`SQ *UNIQLO NEWBURY`, `AMZN Mktp US*2K4`), and return windows.

**Acceptance.** `pnpm --filter @weave/data typecheck` and `pnpm test` pass; `byMerchant('UNIQLO NEWBURY ST')`
→ Uniqlo; `bySenderDomain('email.uniqlo.com')` → Uniqlo; `returnWindowFor('zara')` → 30; `returnWindowFor('shein')`
returns the documented value.

**Files you may touch.** `/packages/data/**`.

---

## Task 2 — API clients + mocks (`@weave/clients`)

**Context.** Four external services, each must have a mock selected by `DEMO_MODE=true` **and** used automatically
if the real call throws. Realistic latency in mocks (300–800ms, use `fixtureLatency()` from `@weave/shared/env`).

**Contract.** `EbayClient`, `SerpClient`, `TtsClient`, `PlaidClient`, `Clients` in `contracts.ts`.
Export `getClients(): Clients` from `/packages/clients/src/index.ts` (scaffold exists — replace it).

**Deliverables.**
- `ebay.ts` + `ebay.mock.ts`: eBay Browse API `item_summary/search` with `filter=conditions:{USED|...}`
  (client-credentials OAuth, token cached in memory; env `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`,
  `EBAY_MARKETPLACE_ID`). `searchUsed(query, {limit, maxPriceCents})` returns cheapest-first `UsedListing[]`;
  `soldMedianCents(query)` — use the Browse API's best available sold/price signal or a documented approximation,
  and say which in a comment. Verify the current endpoint docs before coding.
- `serp.ts` + `serp.mock.ts`: SerpAPI `engine=google_shopping` (`SERPAPI_KEY`) → `ShoppingResult[]`
  (title, imageUrl, priceCents, merchant, url).
- `tts.ts` + `tts.mock.ts`: ElevenLabs text-to-speech (verify current endpoint + model id in their docs). Voice per
  persona from `ELEVENLABS_VOICE_BESTIE|STYLIST|CFO`. **Cache** by `sha256(text + voiceId)`: the client takes an
  injectable `store` interface `{ get(hash): Promise<string|null>; put(hash, bytes, chars): Promise<string> }` so the
  web app can back it with Supabase Storage + the `audio_cache` table; the mock returns a bundled short mp3 as a
  `data:` URL. Return `{ audioUrl, cached, chars }`.
- `plaid.ts` + `plaid.mock.ts`: Plaid sandbox (`PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`) — `createLinkToken`,
  `exchangePublicToken`, `syncTransactions` wrapping `/transactions/sync` (paginate until `has_more=false`). Map
  `personal_finance_category.primary === 'GENERAL_MERCHANDISE'` with detailed
  `GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES` → `isClothingCategory: true`. Mock returns ~40 transactions over
  18 months (use the same shapes as `/apps/web/fixtures` charges — coordinate with Task 3).
- `index.ts`: `getClients()` returns mocks when `isDemoMode()`; otherwise real clients wrapped so any thrown error
  logs a warning and falls back to the mock for that call.
- Tests: `*.test.ts` for each mock and for the fallback wrapper (simulate a throw → mock result).

**Acceptance.** `pnpm test` passes; with `DEMO_MODE=true`, `getClients().ebay.searchUsed('black slip dress')`
returns ≥3 listings in <1s; with a bad `EBAY_CLIENT_ID` and `DEMO_MODE=false`, the same call still returns mock
results and logs a fallback warning.

**Files you may touch.** `/packages/clients/**`, `.env.example` (append only).

---

## Task 3 — Fixtures + seed script

**Context.** `DEMO_MODE=true` swaps every external API for fixtures; the seed script creates believable demo
users so the 2-minute demo works without any real account.

**Contract.** `Fixtures`, `FixtureEmail`, `FixtureCharge`, `FixtureProductPage` in `contracts.ts`; DB schema in
`/supabase/migrations/0001_schema.sql`; LLM output shapes in `/packages/shared/src/prompts.ts`.

**Deliverables.**
- `/apps/web/fixtures/index.ts` exporting `fixtures: Fixtures`:
  - `emails`: 30 realistic order-confirmation HTML emails from allowlisted retailers (mix of single- and multi-item,
    2 shipping notifications that must be rejected, 2 Amazon orders mixing clothes with non-clothes), with product
    `<img>` URLs (use stable placeholder image URLs).
  - `charges`: 18 months of card charges; ≥6 clothing charges with no matching email (mystery), 2 in the last 48h,
    plus non-clothing noise.
  - `usedListings`, `shoppingResults`: keyed by lowercased query prefix, ≥5 queries each.
  - `productPages`: 6 product pages (a near-duplicate black tee, a formal dress, a neutral overshirt, a loud
    statement jacket, sneakers, jeans) with title/price/image/description.
  - `llm`: pre-computed `extract_email` results keyed by email id (must validate against `ExtractEmailSchema`), one
    `crew_fits` result for the seeded Formal Friday crew (validates against `CrewFitsSchema`), `spoken_line` per
    verdict, one `borrow_message`.
  - `audio`: one short mp3 data URL per verdict (can be silence or a TTS-generated clip committed as base64).
- `/scripts/seed-demo.ts` (run with `pnpm tsx scripts/seed-demo.ts`, needs `SUPABASE_SERVICE_ROLE_KEY`):
  creates via the Supabase admin API a main demo user (`demo@weave.app`) with a 45-item closet (images uploaded to
  the `items` bucket, sizes, prices, purchase dates, categories/slots/formality/descriptions filled, `return_by` for
  2 items within 4 days, wear logs), 18 months of `transactions` incl. 6 `mystery`; **three friends** Maya, Jordan,
  Priya (25–40 items each, varied sizes, accepted friendships with demo user and each other), one past loan
  (`returned`), and a crew "Formal Friday" with event date next week, dress code "cocktail", vibe "black tie-ish but
  fun", all four as members. Idempotent: `--reset` deletes and recreates the demo users. Embeddings may be left null
  (Phase 3 fills them) unless `OPENAI_API_KEY` is set, in which case embed descriptions.
- `/scripts/README.md` with usage.

**Acceptance.** `pnpm tsx scripts/seed-demo.ts --reset` against a fresh Supabase project completes without error and
`select count(*) from items` ≈ 45 + 3×(25–40); `fixtures.llm.extract_email` values all pass `ExtractEmailSchema`;
`fixtures.llm.crew_fits` passes `CrewFitsSchema` and references only seeded item ids.

**Files you may touch.** `/apps/web/fixtures/**`, `/scripts/**`, root `package.json` (add `tsx` devDependency only).

---

## Task 4 — Tests for shared logic

**Context.** Claude writes pure functions in `/packages/shared/src`; you write the tests that lock their behavior.
Where a function does not exist yet, write the test against the signature below and mark it `it.todo` until the
implementation lands; Claude will un-todo them.

**Signatures (in `/packages/shared/src`):**
- `matcher.ts`: `matchTransaction(tx: {merchant, amountCents, date}, orders: Array<{retailer, totalCents, date, id}>) → {orderId, score} | null`
  — retailer fuzzy match (via `retailerData.byMerchant` + name similarity) AND `|amount diff| ≤ 10%` AND date within
  ±4 days.
- `returns.ts`: `returnBy(purchaseDate: string, retailerId: string | null, data: RetailerData) → string | null`.
- `outfits.ts`: `countOutfits(items: Item[], pairings: Map<string, number>) → number` and
  `outfitsUnlocked(candidate: Item, items: Item[], pairings) → { count: number; examples: Item[][] }` per the rules in
  `CLAUDE.md` (Outfit = top+bottom or one_piece, + shoes, optional outer; every pair ≥ 0.6; formality spread ≤ 2).
- `verdict.ts`: `decideVerdict(inputs: VerdictInputs) → Verdict` with the five ordered rules in `CLAUDE.md`.
- `crewValidate.ts`: `validateCrewFits(result: CrewFitsResult, members: CrewMemberCompact[]) → { ok: true } | { ok: false; errors: string[] }`
  — every item exists in the combined closets, borrowed items match the borrower's size for that slot, no item
  assigned to two people, exactly one look per member.

**Deliverables.** `*.test.ts` next to each file, vitest, table-driven, covering happy paths, boundaries (exactly 10%,
exactly ±4 days, similarity exactly 0.88), and the priority order of verdict rules.

**Acceptance.** `pnpm test` runs green (todos allowed for unimplemented functions).

**Files you may touch.** `/packages/shared/src/*.test.ts` only.

---

## Task 5 — Chrome extension scaffold

**Context.** Phase 7 is a Chrome MV3 content script that detects product/checkout pages and shows an overlay. Claude
writes the business logic in `/apps/extension/src`; you provide the build system and entry points with **no business
logic**.

**Deliverables.**
- `/apps/extension/package.json` (`@weave/extension`, Vite + `@crxjs/vite-plugin` or plain Vite multi-entry — pick
  what's currently maintained and say why), `vite.config.ts`, `tsconfig.json` extending `../../tsconfig.base.json`.
- `manifest.json` (MV3): `content_scripts` on `<all_urls>` (Claude narrows with URL heuristics at runtime),
  `background` service worker, `permissions: ["storage", "activeTab"]`, `host_permissions` for
  `http://localhost:3000/*` and `https://*.vercel.app/*`, an `action` popup.
- Entry points that compile and do nothing meaningful: `src/content.ts` (logs "weave content script"),
  `src/background.ts`, `src/popup.html` + `src/popup.ts` with a field to store the web app base URL + a paste-in
  session token in `chrome.storage.sync`.
- Dev reload (crxjs HMR or a `watch` script) and a `README.md` with "load unpacked" steps.
- Add `dev:ext` / `build:ext` scripts to root `package.json`.

**Acceptance.** `pnpm --filter @weave/extension build` produces `dist/` loadable in Chrome with no console errors;
content script logs on any page.

**Files you may touch.** `/apps/extension/**` except `/apps/extension/src/**` after your initial scaffold commit
(Claude takes over `src/`), root `package.json` scripts.
