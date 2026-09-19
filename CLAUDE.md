# Weave — shared context for every agent session (Claude Code, Devin, humans)

**Read this first.** Single source of truth for product, architecture, conventions, ownership, and status.
Keep it current: done / mocked / known issues / contract changes / open Devin tasks.
Re-planned 2026-09-19: **no Chrome extension, no crews, no outfit engine, no per-item impact numbers.**

## What we're building (one paragraph)
Weave is an aesthetic digital wardrobe with a bank statement behind it. It builds the wardrobe silently from
**order emails and card transactions** (including in-store purchases no email app sees), so every item knows what
it cost, how often it's worn, and when its return window closes. On top of that: a **clothing budget derived from
income**, a **search bar that checks your wardrobe, your friends' wardrobes, and secondhand before new retail**,
a **return policy board**, **friend wardrobes you can borrow from**, and a **Ghost Rack** of things you didn't buy
and the money you kept. Every number points toward wearing more and buying less — never toward buying "pieces
that hold value." **Not a generic wardrobe app.** Every feature serves the money loop (know what you paid → get
your money's worth → buy less, used, or borrowed) or the sustainability loop (wear it, lend it, or let it go).

Sponsor tracks still in play: Visa (reimagine shopping) · Ramp (save time + money) · Meta (Meta Model API) ·
OpenAI (OpenAI API) · Token optimization · Devin. ElevenLabs is **low priority** (spoken statement, if time).

## The features (final)
1. **Receipt tracker via email** (main ingestion). Gmail backfill → items with image, price, size, retailer,
   purchase date, return_by. Raw email bodies are never stored.
2. **In-person card transactions** (second ingestion). Plaid sandbox + mock charges. A clothing charge with no
   matching email → push "Snap the receipt" → photo read by Muse Spark → item + receipt photo stored on the item.
3. **Purchase confirmation prompt.** Every new charge asks one question: **keep / returning / not clothes**.
   "Returning" lands on the return board. Older unmatched charges → **Mystery Purchases** quiz.
4. **Wardrobe** (the aesthetic hero). Clean cutouts on paper. Item page = mini receipt: paid, wears, cost-per-wear,
   **#30wears ring**, last worn, return window, "receipt on file". "Wore today" one-tap.
5. **Budget from income.** Take-home × clothing % (default 5) = monthly envelope; filled live from email + card;
   projection; **"what this could be instead"** (months of a subscription, weeks of groceries, invested 10y at 7%).
6. **Return policy board.** Every item inside its window, sorted by days left, with the retailer's policy and
   dollars at stake. Returning credits Saved.
7. **Search bar** (the intervention point). Query → `parse_query` → results in fixed order: **your wardrobe →
   friends' wardrobes (in your size) → secondhand (eBay API + marketplace links) → new retail last.** Deterministic
   verdict + one model-written line. **Price memory:** "you usually pay $28 for a tee; this is $45." Actions:
   Skip · Ask to borrow · Buy used · **Hold 48h** · Buy anyway.
8. **Ghost Rack.** Held/skipped items hang in the wardrobe as translucent ghosts with the money not spent. 48h
   cron re-checks friends + secondhand and notifies ("$23 used now — or Maya just added one").
9. **Friend wardrobes + borrowing.** Invite link/QR, browse shareable items filtered to your size, loan requests →
   accept → out → returned, push notifications, **Closet Karma** ("Lent 7× · saved friends $412"). No prices, ever.
10. **Statement.** Monthly bank-statement page: spent, envelope remaining, not spent (ghosts), borrowed, secondhand,
    returns caught, total saved, % of wardrobe worn, best/worst cost-per-wear, and (on `/stats`) dollars saved per
    dollar of AI spend.
11. **Voice (low priority).** ElevenLabs reads the statement or a search verdict in a persona (Bestie/Stylist/CFO).

**"Getting your money's worth" framing (decided):** clothes only lose money, so the only lever is use. Show
cost-per-wear, wears toward 30, days since worn, % worn this season, dormant items ($ and count). Resale value
appears only on dormant items as an exit, never as a reason to buy.

## Hard constraints
- **Demo reliability beats completeness.** Every external dependency has a mock behind `DEMO_MODE=true` or automatic
  fallback on error. The demo must survive bad Wi-Fi.
- **Privacy by design.** Never persist raw email bodies. Only `gmail.readonly`. Friends see only `shareable` items via
  the `friend_items` view — never `price_cents`, `purchase_date`, `retailer`, `return_by`, `est_resale_cents`,
  `receipt_url`. Intimates default to not shareable (DB trigger). Say this in onboarding UI.
- **Token discipline.** Every LLM call goes through `callLLM()` in `/packages/shared/src/llm.ts` → `llm_calls`.
- **TypeScript everywhere** (optional Python `services/rembg`).
- **No secrets in the repo.** `.env.example` lists every variable with comments.
- **Verify before you code.** Model IDs live only in `/packages/shared/src/models.ts`.
- **Respect the ownership map.** Don't edit folders you don't own; write a TODO here or open an issue.
- Ask the lead before adding a dependency heavier than a small utility or changing the schema.

## Stack
Next.js 16 (App Router, `proxy.ts` not `middleware.ts`) + TypeScript + Tailwind v4 · Supabase (Postgres + pgvector,
Google OAuth, Storage bucket `items`, Realtime) · Vercel (cron) · Meta Model API (Muse Spark, OpenAI-SDK compatible,
base `https://api.meta.ai/v1`) · OpenAI (embeddings + short lines) · Plaid sandbox · eBay Browse · SerpAPI ·
ElevenLabs (optional) · PWA (web push, camera via file input) · optional FastAPI `rembg`.

## Repo layout (pnpm workspaces)
```
apps/web              Next.js app + API routes            (Claude)   fixtures/ is Devin's
packages/shared       models.ts, llm.ts, prompts.ts, contracts.ts, types.ts, (budget.ts, verdict.ts, matcher.ts, returns.ts)  (Claude; *.test.ts Devin)
packages/data         retailer allowlist, return policies, marketplace links, money alternatives  (Devin)
packages/clients      eBay, SerpAPI, ElevenLabs, Plaid + mocks (Devin)
scripts               seed-demo.ts etc.                     (Devin)
supabase              migrations + seed.sql                 (Claude — schema-owner session ONLY)
services/rembg        optional Python bg removal
docs/devin-tasks.md   ready-to-paste Devin briefs
DEVIN_LOG.md          Devin PR log for the Devin judges
```

## Ownership map (never edit the same files as another agent)
| Owner | Paths |
|---|---|
| Claude Code (schema-owner session only) | `/supabase` |
| Claude Code | `/apps/web` (except `fixtures/`), `/packages/shared` (except `*.test.ts`) |
| Devin | `/packages/data`, `/packages/clients`, `/apps/web/fixtures`, `/scripts`, all `*.test.ts` |

Phase 1 created **scaffold-only** stubs in `/packages/data/src/index.ts`, `/packages/clients/src/index.ts` and
`/apps/web/fixtures/README.md` so the workspace resolves. Devin owns them from here on.

**Contracts first.** Devin implements against `/packages/shared/src/contracts.ts`; Claude consumes. Changing a
contract → add a line under "Contract changes" below and tell the lead.

**Git.** Branches for everyone; nobody pushes to `main` after Phase 1. One PR per task; a human merges; CI must be
green. Pull `main` into your branch every couple of hours. Commit messages: `phase-N: <what>` or `devin: <task>`.

## LLM routing (`/packages/shared/src/models.ts`)
Both providers via the OpenAI SDK with different `baseURL`/key. Verified 2026-09-19.
| Task | Provider · model | Settings |
|---|---|---|
| `extract_email` | Meta `muse-spark-1.3` | `reasoning_effort: minimal`, strict JSON |
| `tag_items` | Meta | `minimal`, strict JSON, batch 20 |
| `read_capture` | Meta | `low`, image input, strict JSON |
| `parse_query` | Meta | `minimal`, strict JSON (search bar) |
| `borrow_message` | Meta | `minimal` |
| `search_note` | OpenAI `gpt-5.6-luna` | one line above search results |
| `spoken_line` | OpenAI | ElevenLabs text (low priority) |
| `embed` | OpenAI `text-embedding-3-small` | 1536 dims, once per item |

Pricing (per 1M): Muse Spark $1.25 in / $0.15 cached / $4.25 out · gpt-5.6-luna $0.20 / $0.02 / $1.20 ·
embeddings $0.02. `callLLM` order: primary → other provider (on error or timeout) → fixture (in DEMO_MODE).
Prompts: stable `system` first, variable `input` last (prompt-cache friendly); `cached_tokens` logged.
Structured output: zod schema → `json_schema` strict (use `.nullable()`, never `.optional()`).
`GET /api/llm/health` pings both providers (logged as task `health`).

## Data model (see `/supabase/migrations`)
`profiles` (sizes, voice_persona, invite_code) · `items` (+ `embedding vector(1536)`, `receipt_url`, `shareable`,
`lendable`, `return_by`, `status`, `est_resale_cents`) · `friendships` (user_a < user_b) · `loans` ·
`transactions` (match_status, decision keep/returning/not_clothes) · `wears` · `budgets` (income, pct, override) ·
`holds` (Ghost Rack: verdict, status, saved_cents, release_at) · `llm_calls` · `gmail_tokens` (service role only) ·
`push_subscriptions` · `audio_cache`. RLS on every table. View `friend_items` (security definer,
friendship-filtered, no money fields). Functions: `match_items`, `match_friend_items` (size-filtered),
`accept_invite`, `is_friend`, `handle_new_user` trigger, `items_privacy_defaults` trigger.

Dedupe for email ingestion: unique index on `(user_id, retailer, lower(name), size, purchase_date)` where source='email'.

## Search verdict rules (deterministic, in order — the LLM only writes the one-line note)
1. owned similarity > 0.88 → `skip` ("you already own this")
2. friend lendable similarity > 0.85 and one-time-need signal (occasion in query / formal category) → `borrow`
3. cheapest used ≥ 40% cheaper than retail → `secondhand`
4. price > budget remaining this month → `wait` (hold 48h)
5. else → `buy`

Budget math (`budget.ts`, pure): envelope = override ?? income × pct; remaining = envelope − spent; projected =
spent / dayOfMonth × daysInMonth. Price memory: median of the user's own `price_cents` by category (and by brand
when ≥ 3 samples).

## Token optimization (prize track — shown on `/stats`)
1. Gmail query + sender-domain allowlist before any LLM call
2. HTML stripping, boilerplate removal, truncation (~6k chars)
3. `reasoning_effort: minimal` for extraction, tagging, query parsing
4. Batching: tagging 20/call
5. Static instructions first → prompt cache hits; `cached_tokens` tracked per call
6. Embeddings once per item; ElevenLabs audio cache (`audio_cache`)
7. Rule-based verdicts, budget math, price memory, return dates — the model writes only short text
8. `/stats`: tokens + cost by task/provider, cache hit rate, fallbacks, cost per email/search, and
   **dollars saved per dollar of AI spend**

## Design direction
Aesthetic digital wardrobe on receipt paper. Off-white thermal paper, near-black ink, one accent: savings green
(`--save`) used ONLY for money kept. IBM Plex Mono for numbers/ledger lines, IBM Plex Sans for body; tabular
numerals. The **wardrobe grid is the hero**: clean cutouts, hover shows the item's mini receipt. Ghosts are the
same cutouts at 35% opacity with a dashed outline and the $ kept. Decisions "print" mini receipts (`.print`).
Loans print as a shared receipt with both names. The Statement is one long receipt. Dashed dividers, perforated
edges (`.receipt`), dark mode = carbon copy. Primitives in `apps/web/components/Receipt.tsx`.

## Conventions
- Server code only in Route Handlers / Server Actions / Server Components; RLS-respecting `createClient()` for user
  data, `createAdminClient()` (service role) only for `llm_calls`, `gmail_tokens`, cron.
- Call `ensureLLM()` (`apps/web/lib/llm.ts`) in any server module before `callLLM` so logs reach `llm_calls`.
- Money is always integer cents; format with `usd()` from `components/Receipt.tsx`.
- Dates in DB are `date` (YYYY-MM-DD) strings in TS.
- Env access: `apps/web/lib/env.ts` (web) and `packages/shared/src/env.ts` (shared). `isDemoMode()` everywhere.
- Hidden demo panel: press `D` three times (Phase 4) hosts every demo trigger.

## Phase checklist
- [x] **Phase 1 — Skeleton** (re-planned): monorepo, migrations, Google sign-in (Gmail scope + refresh-token
      capture), profile trigger + invite code, nav (Wardrobe · Search · Charges · Budget · Returns · Friends ·
      Ghost Rack · Statement · Settings · Stats), `DEMO_MODE`, LLM router + logging, `/api/llm/health`,
      `.env.example`, `CLAUDE.md`, `DEVIN_LOG.md`, `docs/devin-tasks.md`, `contracts.ts`.
      **Manual steps still needed:** create Supabase project + apply migrations, enable Google provider with the
      Gmail scope, fill `.env.local`, deploy to Vercel (root dir `apps/web`).
- [ ] **Phase 2 — Gmail receipt backfill** (3h). Gmail query + allowlist pre-filter → strip/truncate → `extract_email`
      → images to Storage → dedupe → `return_by`. SSE progress: "Scanned 214 emails · found 47 items · 9¢ in tokens".
      Accept: a teammate's real inbox produces a wardrobe with images, prices, return dates in < 2 min.
- [ ] **Phase 3 — Tagging, embeddings, Wardrobe UI** (2.5h). `tag_items` batches → category/slot/color/formality/
      description; embed once. Wardrobe grid + item page (mini receipt, cost-per-wear, #30wears ring, wore today).
      Accept: `match_items` returns sensible neighbors; item page shows cost-per-wear updating after "wore today".
- [ ] **Phase 4 — Card transactions + Charges page** (3h). Plaid sandbox/mock → `/transactions/sync`; matcher
      (`matcher.ts`); new charge → push "Snap the receipt" + keep/returning/not-clothes; capture page with
      `read_capture` (receipt/tag/garment) + SerpAPI clean image; Mystery Purchases card stack with Wardrobe
      Confidence %; `POST /api/demo/charge`; hidden demo panel (D×3). Accept: mock charge → phone notification
      in < 5s → snapped receipt → item in wardrobe in < 15s.
- [ ] **Phase 5 — Budget** (2h). Income + % → envelope; live spend from items + transactions this month;
      projection; "what this could be instead"; over-budget state. Accept: adding a $60 charge moves envelope,
      projection and alternatives instantly.
- [ ] **Phase 6 — Return board** (1.5h). Items with open windows sorted by days left, policy text, $ at stake,
      receipt-on-file badge; "Returned" credits Saved; daily cron push at 4 days left with zero wears.
- [ ] **Phase 7 — Search bar + Ghost Rack** (4h). `parse_query` → embed → `match_items` / `match_friend_items` →
      eBay used + marketplace links → retail links; verdict rules; `search_note`; price memory; actions incl.
      Hold 48h → `holds`; ghosts in the wardrobe grid; 48h cron re-check + push. Accept: searching for a
      near-duplicate of an owned item shows it first with "you own this, worn 2×"; searching a formal dress with a
      matching friend item shows "Borrow from Maya"; Hold prints a ghost.
- [ ] **Phase 8 — Friend wardrobes + borrowing** (3h). Invite link + QR, friend grid (in my size), loan request →
      accept → out → returned, Realtime, push, Closet Karma. Accept: two accounts complete a borrow live.
- [ ] **Phase 9 — Statement + Stats** (2h). Monthly statement receipt; `/stats` headline "dollars saved per dollar
      of AI spend".
- [ ] **Phase 10 — Voice (low priority) + polish + demo hardening.** ElevenLabs spoken statement/verdict with
      audio cache; loading/empty states; fixture completeness; 90-second recorded fallback demo.

## Demo script (2 minutes)
1. Sign in → ingestion counter fills the wardrobe from real email.
2. Fire an in-store charge → phone buzzes → "keep / returning / not clothes" → snap receipt → item + receipt on file.
3. Swipe two Mystery Purchases; Wardrobe Confidence rises.
4. Budget: take-home in, envelope fills from real spend, "this month's overspend = 3 weeks of groceries".
5. Search "black slip dress for a wedding" → your wardrobe first ("you own 2, worn 1×"), then "Maya has one in your
   size" → Ask to borrow → Maya (teammate) accepts live → shared receipt prints.
6. Search a near-duplicate tee → "you already own 3" → Hold 48h → a ghost appears in the wardrobe with $34 kept.
7. Return board: one item at 3 days left, $89 at stake, receipt on file → Returned.
8. End on the Statement: spent vs envelope, not spent, borrowed, returns caught, % worn, and dollars saved per AI dollar.

## Status
### Done
- Phase 1 code (see checklist), re-planned 2026-09-19.
### Mocked / not yet live
- `@weave/data` and `@weave/clients` are stubs (Devin tasks 1–2). `fixtures/` is a README (Devin task 3).
- No real Supabase project or Vercel deployment has been linked from this repo yet.
### Known issues
- Meta `cached_tokens` field location unverified in a real response — `extractUsage()` accepts both
  `usage.prompt_tokens_details.cached_tokens` and `usage.cached_tokens`; confirm on first live call.
### Contract changes
- 2026-09-19 re-plan: removed crew/outfit/intervention shapes; added `MarketplaceLink`, `MoneyAlternative`,
  `BudgetInputs`/`BudgetSummary`; `VerdictInputs.outfitsUnlocked` → `budgetRemainingCents`; fixtures gained
  `parse_query` and `search_note`, lost `crew_fits`.
### Open Devin tasks
- See `/docs/devin-tasks.md`: 1 retailer data · 2 API clients · 3 fixtures + seed · 4 tests · 5 marketplace links +
  money alternatives.
### TODOs for Devin-owned folders
- (none yet)
