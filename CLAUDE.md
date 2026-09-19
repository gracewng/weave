# Weave — shared context for every agent session (Claude Code, Devin, humans)

**Read this first.** Single source of truth for product, architecture, conventions, ownership, and status.
Keep it current: done / mocked / known issues / contract changes / open Devin tasks.
Re-planned 2026-09-19: **no Chrome extension, no crews, no outfit engine, no per-item impact numbers.**

## What we're building (one paragraph)
**Weave is a bank statement for your closet: an anti-shopping agent powered by your purchase history.** It
reconstructs what you own from order emails and card transactions, connects each confirmed item to its price, wear
history, and return window, and intervenes before your next purchase: **owned → borrow → secondhand → new.** Its
signature Ghost Rack shows the clothes you almost owned; its Statement shows the money you kept. The core question
is "Do you need to buy anything at all?"

The money loop leads: know what you paid → use what you own → avoid a duplicate, borrow, buy used, or recover an
eligible purchase. Sustainability follows from reduced consumption and longer use, not eco messaging. Clothes only
lose money; use is the lever. No investment-style recommendations. Resale value appears only on dormant items as an
exit, never as a reason to buy.

**Pitch:** "What if your shopping assistant was rewarded when you didn't buy anything?"

**Sponsor priorities:** Visa, Ramp, OpenAI API, plus Sustainability as the strongest regular track. Long Lake is a
strong pitch fit. Meta, token optimization, Devin, and Interactive Media depend on demonstrable evidence.
ElevenLabs is low priority. Education secondary. Healthcare not a target. (Track list is the supplied challenge
list; confirm official rules before submitting.)

## The features
1. **Receipt tracker via email** (main ingestion). Gmail backfill → items with image, price, size, retailer,
   purchase date, return_by. Raw email bodies are never stored.
2. **In-person card transactions** (second ingestion). Plaid sandbox + mock charges. A clothing charge with no
   matching email → push "Snap the receipt" → photo read by Muse Spark → item + receipt photo on the item.
3. **Purchase confirmation prompt.** Every new charge asks one question: **keep / returning / not clothes.**
   "Returning" lands on the return board. Older unmatched charges → **Mystery Purchases** quiz.
4. **Wardrobe** (the aesthetic hero). Clean cutouts on paper. Item page = mini receipt: paid, wears, cost-per-wear,
   **#30wears ring**, last worn, return window, "receipt on file". "Wore today" one-tap. **Purchase Autopsy** is a
   small expansion on the item page (see below).
5. **Budget from income.** Take-home × clothing % (default 5) = monthly envelope; filled live from email + card;
   projection; "what this could be instead" (months of a subscription, weeks of groceries, invested 10y at 7%).
6. **Return policy board.** Every item inside its window, sorted by days left, retailer policy, dollars at stake.
   A reminder shows money at stake; only a **confirmed refund** credits Money Recovered.
7. **Search bar** (the intervention point). Four fixed sections: your wardrobe → friends' wardrobes (in your size)
   → secondhand (eBay API + marketplace links) → new retail last. Deterministic verdict + one model-written line.
   **Purchase memory:** "Your median tee purchase is $28 across 6 confirmed purchases; this one is $45."
   Actions: Wear mine · Ask to borrow · Buy used · Hold 48h · Skip · Buy anyway.
8. **Ghost Rack — "The clothes you almost owned."** Held/skipped intentions hang in the wardrobe as translucent
   ghosts with intended price, chosen alternative, and outcome. Pending holds show *potential* Money Kept;
   confirmed outcomes show *estimated* Money Kept. 48h re-check notifies ("$23 used now — or Maya just added one").
9. **Friend wardrobes + borrowing.** Invite link/QR, browse shareable items in your size, loan request → accept →
   out → returned, push, **Closet Karma** ("Lent 7× · saved friends $412"). No prices, ever.
10. **Statement.** One monthly receipt: **Money Kept** hero, **Money Recovered** separately, a chronological
    intervention timeline, then spent / envelope / not spent / borrowed / secondhand / returns / % worn / best and
    worst cost-per-wear. `/stats` shows dollars kept per dollar of AI spend.
11. **Voice (low priority).** ElevenLabs reads the statement or a verdict in a persona (Bestie/Stylist/CFO).

## The intervention experience

### Search: "Before you buy"
A decision flow with four fixed sections, not a blended feed. The verdict engine is unchanged (rules below); the
model parses intent and writes one explanatory line. A `buy` verdict means no earlier rule fired, not an
endorsement. **Skip** and **Hold 48h** are always available.
1. **You already own this.** Owned items with wears, paid price, cost per wear. Primary: **Wear mine.**
   Similarity is a retrieval signal, never shown as a calibrated probability.
2. **Borrow.** Size-compatible, shareable, lendable friend items. Primary: **Ask to borrow.** A request is pending
   until accepted; acceptance alone does not confirm an avoided purchase.
3. **Secondhand.** Used listings with price and known fees; label unknown shipping/condition. Primary: **Buy used.**
   A link click is not a purchase.
4. **New.** Retail last, as an explicit fallback. Primary: **Buy anyway.** Never hide alternatives when an upstream
   section is empty; explain empty states briefly.

If a query has no price (general occasion), ask the user to supply or confirm intended item + price. Never invent a
dollar saving for an unpriced search. If owned results exist but the user borrows instead, that is a user choice;
the verdict is not rewritten.

### Ghost Rack: an alternate timeline
Each ghost is a **purchase intention**, not an owned item. Its mini receipt: candidate item, intended price and
source, decision date, outcome, alternative used, potential or confirmed Money Kept. Ghosts are excluded from
inventory counts, wear rates, and spend totals.

Lifecycle (`holds.status`): **held** → **skipped** (wore mine / didn't need it) · **borrowed** · **bought_used** ·
**bought** · **released** (expired, unanswered). Repeated searches and 48h re-checks update the same intention;
buying later reverses the prior credit. Expiry asks "what happened?"; silence does not confirm a skip.

```text
SEPTEMBER GHOST RACK — THE CLOTHES YOU ALMOST OWNED
Slip dress          intended $148 → borrowed, paid $0
White tee           intended  $45 → wore mine, paid $0
Jeans               intended  $98 → bought used, paid $37
-----------------------------------------------------
ESTIMATED MONEY KEPT                              $254
```
The 35%-opacity cutout and the printed decision receipt are the screenshot moment. Prefer a labeled demo
time-advance over scheduler work until the main flow is solid.

### Money Kept — "saved from yourself"
**Money Kept** is the neutral hero label; "saved from yourself" is optional playful copy. No guilt. It is an
estimate of avoided intended spending, not a bank balance or proven behavior change.

| Event | Headline treatment | Evidence |
|---|---|---|
| Hold / unanswered reminder | Potential only; excluded from Money Kept | Candidate + price recorded |
| Skip / wear mine | Intended price, once | User confirms the purchase was skipped |
| Borrow instead | Intended price − borrowing cost, floor 0 | Loan reached `out` and user confirms it replaced the purchase |
| Buy used | Intended new price − actual used total, floor 0 | User confirms purchase + actual paid |
| Return initiated / marked returning | Pending; excluded from Money Recovered | Return action recorded |
| Refund confirmed | Actual refund, net of fees | Refund amount entered (labeled user confirmation) |
| Later purchase / correction | Recompute or reverse the credit | Updated outcome on the same intention |

Count each intention once (a hold that becomes a borrow is one outcome). Reconcile email + card before counting
spend. Money Kept breakdown: skipped / borrowed / secondhand. **Money Recovered** is separate. A combined total is
optional and labeled "kept + recovered". Unknown prices are excluded from totals but keep the action count.
Pure math lives in `packages/shared/src/kept.ts` (Devin tests it).

### Closet Coverage
Visible label for the Mystery Purchases confidence idea. It measures reconciliation coverage, not certainty about
the physical wardrobe. MVP definition: **resolved clothing-purchase records / all detected clothing-purchase
records in the import period.** Records = clothing card transactions (`is_clothing`, decision ≠ not_clothes) ∪
email orders (grouped by retailer + order date). A record is resolved when matched to item(s), captured, confirmed
returning, or manually reconciled; "not clothes" removes it from the denominator; partial matches stay unresolved.
Zero records → "Not enough purchase history," not 100%. Show fraction + date range + confirmed items + unresolved
count: **40 of 46 purchase records resolved = 87%; 6 mystery purchases, including 3 missing receipts.** A charge
never invents a garment. Pure math in `packages/shared/src/coverage.ts`.

### Purchase Autopsy and purchase memory
Autopsy is an item-page expansion: purchase price, days owned, logged wears, cost per wear, days since last wear,
and a reuse scenario: **$120 sweater / 2 wears = $60 per wear; at 30 wears = $4 per wear.** Zero wears → "No wears
logged." An evidence-backed "What happened?" line may connect known facts (sale purchase, similar owned items,
inactivity) — never inferred motive. "What Weave would have shown that day" restricts matches to items owned at
that date and is labeled a reconstruction. Purchase memory beside an intervention uses the category median
(brand median only with ≥ 3 samples), shows sample size, and never turns history into a target. No model calls.

### One receipt language; one intervention timeline
Borrowing prints a **Shared Receipt** (both names, item, status, due date; no prices, retailer, or history — the
borrower may see their own private intended-price comparison on their personal receipt only). Skipping prints
**Purchase Voided** (intended, paid $0, confirmation state, kept). Holding prints **Purchase Paused** (next check
time). Returns print **Return Pending**, then **Refund Confirmed** (actual amount). Savings green is reserved for
confirmed kept/recovered amounts; pending states are neutral ink. Receipts reflect real state transitions.

```text
SEP 18  Wanted a $168 dress → borrowed instead → $168 kept*
SEP 14  Returned trousers → refund confirmed  →  $79 recovered
SEP 09  Wanted a $45 tee   → wore mine         →  $45 kept*
SEP 02  Intended $98 new   → paid $42 used     →  $56 kept*
------------------------------------------------------------
MONEY KEPT* $269                 MONEY RECOVERED $79
*Estimated against confirmed purchase intentions.
```
Each line opens its receipt and evidence. The timeline is a presentation of `holds` + `items` events, not a new
event system.

## AI technical story and proof
**Unstructured commerce data → structured wardrobe → semantic matching → deterministic intervention.**
- Gmail pre-filter + cleaned receipt text → schema-validated extraction (Meta); image/receipt capture handles
  unmatched card purchases. Only structured data is retained.
- Matcher reconciles receipts with transactions; uncertain matches wait for user confirmation; dedupe prevents
  double-counted spend.
- Batched tags + embeddings (OpenAI) turn inconsistent names into searchable attributes and semantic neighbors;
  `parse_query` (Meta) captures occasion and constraints.
- Privacy, size, and lending constraints, then unchanged verdict rules. Deterministic code computes budget,
  medians, return dates, cost per wear, coverage, and Money Kept; the one model-written line (OpenAI) explains
  computed facts and invents nothing.
- Every call through `callLLM()`; `/stats` shows provider, task, tokens, cost, cache, fallback, live vs fixture.

Judging trace: one safe (synthetic or consented) receipt → extracted fields → confirmed item → semantic match →
rule fired → receipt/statement outcome. Token optimization: a small fixed labeled sample under baseline vs
optimized pipeline, reporting extraction validity alongside tokens, cost, latency. `/stats` ratio = confirmed
estimated Money Kept / measured AI spend, with period and fixture/live status; "N/A" at zero or unknown cost.

## Demo scope overlay
| Priority | Deliverable | Phases |
|---|---|---|
| P0 | Receipt reconstruction → usable wardrobe and mini receipt | 2–3 |
| P0 | Owned-first search, visible purchase memory, deterministic verdict | 7 |
| P0 | Ghost Rack with pending/confirmed states and printed action receipt | 7 |
| P0 | One reliable two-account borrowing path (+ demo-panel "Maya accepts" fallback) | 8 |
| P0 | One return rescue with honest pending/refund distinction | 6 |
| P0 | Statement with traceable totals; `/stats` evidence | 9 |
| P0 | Complete fixtures, visible fallback mode, recorded demo — before voice | 10 |
| P1 | One Mystery Purchase resolution with a coverage change | 4 |
| P1 | Purchase Autopsy expansion | 3 / 9 |
| P2 | Full capture/Plaid walkthrough, elaborate budget alternatives, richer friend features | kept in plan, off main stage |
| P2 | ElevenLabs voice/personas | 10, after all P0 |

## Track strategy (same product for every track)
| Track | Story | Evidence |
|---|---|---|
| Long Lake (convince a non-believer) | "I won't catalog my closet" / "an AI assistant just sells me more" | Rebuild from receipts, admit incomplete coverage, resolve a real intention with owned/borrowed alternatives |
| Visa (reimagine shopping) | Shopping becomes a decision about whether to transact at all | owned → borrow → used → new, linked records, decision receipts. Plaid sandbox ≠ Visa integration; don't imply one |
| Ramp (save time + money) | Automatic reconstruction replaces cataloging; intervention avoids spend; returns recover it | Time-to-usable-wardrobe, items reconciled, itemized Money Kept/Recovered. Time-saved claims need a timed manual baseline |
| OpenAI API | Embeddings do the retrieval; `search_note` explains grounded facts | Real calls, logs, costs; say which tasks are Meta vs OpenAI |
| Devin | Useful engineering inside the ownership map | `DEVIN_LOG.md`, briefs, PRs, reviews, tests, merged code |
| ElevenLabs | Optional accessible spoken Statement | One real playback with cache behavior |
| Token optimization | Measured filtering, batching, caching, short outputs | `/stats` + controlled before/after sample with quality held constant |
| Meta (bring people closer) | A real shared wardrobe, not a feed; Meta Model API does extraction/parsing | Two accounts complete a loan; private fields shown excluded |
| Sustainability | Reduced new consumption, reuse, lending | Confirmed avoided purchases, borrows, used buys, repeat wears. No carbon/water figures |
| Interactive Media | Cutouts → ghosts, receipt printing, timeline reacting to decisions | Motion communicates state; reduced-motion respected |
| Education | Price awareness and cost per wear from one's own purchases | Autopsy + purchase memory; no invented outcomes |

## Hard constraints
- **Demo reliability beats completeness.** Every external dependency has a mock behind `DEMO_MODE=true` or automatic
  fallback on error. Live vs fixture is always visibly labeled.
- **Privacy by design.** Never persist raw email bodies. Only `gmail.readonly`. Friends see only `shareable` items via
  the `friend_items` view — never `price_cents`, `purchase_date`, `retailer`, `return_by`, `est_resale_cents`,
  `receipt_url`, `refund_cents`. Intimates default to not shareable (DB trigger). Say this in onboarding UI.
- **Honest numbers.** Money Kept only from confirmed outcomes; Money Recovered only from confirmed refunds; unknown
  prices never become dollars; no fabricated cache hits or savings percentages.
- **Token discipline.** Every LLM call goes through `callLLM()` in `/packages/shared/src/llm.ts` → `llm_calls`.
- **TypeScript everywhere** (optional Python `services/rembg`). **No secrets in the repo** (`.env.example`).
- **Verify before you code.** Model IDs live only in `/packages/shared/src/models.ts`.
- **Respect the ownership map.** Ask the lead before heavy dependencies or schema changes.

## Stack
Next.js 16 (App Router, `proxy.ts` not `middleware.ts`) + TypeScript + Tailwind v4 · Supabase (Postgres + pgvector,
Google OAuth, Storage bucket `items`, Realtime) · Vercel (cron) · Meta Model API (Muse Spark, OpenAI-SDK compatible,
base `https://api.meta.ai/v1`) · OpenAI (embeddings + short lines) · Plaid sandbox · eBay Browse · SerpAPI ·
ElevenLabs (optional) · PWA (web push, camera via file input) · optional FastAPI `rembg`.

## Repo layout (pnpm workspaces)
```
apps/web              Next.js app + API routes            (Claude)   fixtures/ is Devin's
packages/shared       models, llm, prompts, contracts, types, budget, verdict, matcher, returns, kept, coverage, wears  (Claude; *.test.ts Devin)
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

Phase 1 created scaffold-only stubs in `/packages/data`, `/packages/clients`, `/apps/web/fixtures` so the
workspace resolves. Devin owns them from here on. **Contracts first:** Devin implements
`/packages/shared/src/contracts.ts`; Claude consumes. Contract change → line under "Contract changes" + tell lead.
**Git:** branches for everyone; nobody pushes to `main`; one PR per task; a human merges; CI green. Pull `main`
every couple of hours. Commit messages `phase-N: <what>` or `devin: <task>`.

## LLM routing (`/packages/shared/src/models.ts`) — verified 2026-09-19
| Task | Provider · model | Settings |
|---|---|---|
| `extract_email` | Meta `muse-spark-1.3` | `reasoning_effort: minimal`, strict JSON |
| `tag_items` | Meta | `minimal`, strict JSON, batch 20 |
| `read_capture` | Meta | `low`, image input, strict JSON |
| `parse_query` | Meta | `minimal`, strict JSON |
| `borrow_message` | Meta | `minimal` |
| `search_note` | OpenAI `gpt-5.6-luna` | one line above search results |
| `spoken_line` | OpenAI | ElevenLabs text (low priority) |
| `embed` | OpenAI `text-embedding-3-small` | 1536 dims, once per item |

Pricing (per 1M): Muse Spark $1.25 in / $0.15 cached / $4.25 out · gpt-5.6-luna $0.20 / $0.02 / $1.20 ·
embeddings $0.02. `callLLM` order: primary → other provider (error/timeout) → fixture (DEMO_MODE). Stable `system`
first, variable `input` last; `cached_tokens` logged. zod → `json_schema` strict (`.nullable()`, never
`.optional()`). `GET /api/llm/health` pings both providers.

## Data model (see `/supabase/migrations`)
`profiles` · `items` (embedding, `receipt_url`, `shareable`, `lendable`, `return_by`, `status` incl. `returning`,
`return_initiated_at`, `refund_cents`, `refunded_at`, `est_resale_cents`) · `friendships` · `loans` · `transactions`
(match_status, decision keep/returning/not_clothes) · `wears` · `budgets` · `holds` (Ghost Rack: intended
price/source, verdict, status, `outcome_confirmed_at`, `actual_paid_cents`, `loan_id`, `wore_item_id`,
`kept_cents`, `release_at`) · `llm_calls` · `gmail_tokens` (service role) · `push_subscriptions` · `audio_cache`.
RLS everywhere. View `friend_items` (no money fields). Functions: `match_items`, `match_friend_items`
(size-filtered), `accept_invite`, `is_friend`, `handle_new_user`, `items_privacy_defaults`.
Dedupe: unique `(user_id, retailer, lower(name), size, purchase_date)` where source='email'.

## Deterministic rules (the LLM only writes one line)
Verdict, in order: (1) owned similarity > 0.88 → `skip` · (2) friend lendable similarity > 0.85 + one-time-need
signal → `borrow` · (3) cheapest used ≥ 40% cheaper → `secondhand` · (4) price > budget remaining (when a budget
exists) → `wait` · (5) else `buy`.
Budget: envelope = override ?? income × pct; remaining = envelope − spent; projected = spent / day × days.
Purchase memory: category median; brand median only with ≥ 3 samples; show n.
Money Kept: per the table above; `kept_cents` set only at confirmation; reversal on later purchase.
Coverage: resolved / detected records in period; "not clothes" leaves the denominator.
Cost per wear: price / wears; 0 wears → "No wears logged".

## Token optimization (prize track — shown on `/stats`)
1. Gmail query + sender-domain allowlist before any LLM call · 2. HTML strip, boilerplate removal, ~6k-char
truncation · 3. `minimal` reasoning for extraction, tagging, parsing · 4. Tagging batched 20/call · 5. Static
prefix first → prompt cache; `cached_tokens` tracked · 6. Embeddings once per item; audio cache · 7. Rules for
verdicts, budget, memory, coverage, kept, returns — the model writes only short text · 8. `/stats`: tokens + cost
by task/provider, cache rate, fallbacks, cost per email/search, kept per AI dollar, live vs fixture.

## Design direction
Aesthetic digital wardrobe on receipt paper. Off-white thermal paper, near-black ink, one accent: savings green
(`--save`) **only for confirmed** kept/recovered money. IBM Plex Mono for numbers, IBM Plex Sans for body; tabular
numerals. Wardrobe grid is the hero: clean cutouts; hover shows the mini receipt. Ghosts = same cutouts at 35%
opacity, dashed outline, potential $ while pending, estimated $ kept when confirmed. Decisions print mini receipts
(`.print`); loans print a Shared Receipt; the Statement is one long receipt. Perforated edges (`.receipt`), dashed
dividers, carbon-copy dark mode. Respect `prefers-reduced-motion`. Primitives: `apps/web/components/Receipt.tsx`.

## Conventions
- Server code in Route Handlers / Server Actions / Server Components; `createClient()` (RLS) for user data;
  `createAdminClient()` only for `llm_calls`, `gmail_tokens`, cron.
- `ensureLLM()` (`apps/web/lib/llm.ts`) before any `callLLM` in a server module.
- Money = integer cents; `usd()` from `components/Receipt.tsx`. DB dates are `YYYY-MM-DD` strings.
- `isDemoMode()` everywhere; fixture results carry a visible "fixture" label in UI.
- Hidden demo panel (`D` ×3, Phase 4): fire mock charge, return reminder, **advance 48h**, **Maya accepts**,
  **seed confirmed refund**, reset demo users.

## Phase checklist
- [x] **Phase 1 — Skeleton** (re-planned). Monorepo, migrations, Google sign-in (Gmail scope + refresh-token
      capture), profile trigger + invite code, nav, `DEMO_MODE`, LLM router + logging, `/api/llm/health`,
      `.env.example`, docs, `contracts.ts`. **Manual:** Supabase project + migrations, Google provider with Gmail
      scope, `.env.local`, Vercel (root `apps/web`).
- [ ] **Phase 2 — Gmail receipt backfill** (3h). Query + allowlist → strip/truncate → `extract_email` → images to
      Storage → dedupe → `return_by`. SSE progress "Scanned 214 emails · found 47 items · 9¢ in tokens".
      Accept: a teammate's real inbox → wardrobe with images, prices, return dates in < 2 min.
- [ ] **Phase 3 — Tagging, embeddings, Wardrobe UI** (3h). `tag_items` batches; embed once. Grid + item page (mini
      receipt, cost-per-wear, #30wears ring, wore today, Autopsy expansion). Accept: `match_items` returns sensible
      neighbors; cost-per-wear updates after "wore today".
- [ ] **Phase 4 — Card transactions + Charges** (3h). Plaid sandbox/mock; matcher; push "Snap the receipt" +
      keep/returning/not-clothes; capture with `read_capture` + SerpAPI image; Mystery Purchases stack with Closet
      Coverage fraction; `POST /api/demo/charge`; demo panel. Accept: mock charge → notification < 5s → snapped
      receipt → item < 15s; resolving one mystery changes coverage from data.
- [ ] **Phase 5 — Budget** (2h). Envelope, live spend, projection, alternatives, over-budget state.
- [ ] **Phase 6 — Return board** (2h). Open windows by days left, policy, $ at stake, receipt badge; **Return
      Pending** → **Refund Confirmed** (amount entered) credits Money Recovered; daily cron push at 4 days.
- [ ] **Phase 7 — Search + Ghost Rack** (5h). `parse_query` → embed → owned / friends / used / retail; verdict;
      `search_note`; purchase memory with n; actions; Hold → `holds`; ghosts in grid; confirmation prompts
      (skipped / borrowed / bought used / bought) set `kept_cents`; 48h re-check + push (demo time-advance first).
      Accept: near-duplicate tee shows owned first "worn 2×"; formal dress shows "Borrow from Maya"; Hold prints a
      ghost; confirming a skip turns it green and raises Money Kept by exactly the intended price.
- [ ] **Phase 8 — Friend wardrobes + borrowing** (3h). Invite + QR, friend grid (in my size), loan flow, Realtime,
      push, Shared Receipt, Closet Karma. Accept: two accounts complete a borrow live (demo-panel fallback works).
- [ ] **Phase 9 — Statement + Stats** (2.5h). Timeline → Money Kept → Money Recovered → details; `/stats` kept per
      AI dollar with live/fixture label. Accept: every headline number opens the receipts that sum to it.
- [ ] **Phase 10 — Hardening, then voice.** Fixtures complete, fallback mode visible, 90-second recording, empty and
      loading states, reduced motion; ElevenLabs only after all P0 acceptance passes.

## Demo — 90 seconds, one changed purchase at a time
Live vs fixture is always labeled; the recorded fallback is ready.
| Time | Show | Proves |
|---|---|---|
| 0:00–0:15 | "Weave is a bank statement for your closet." Reconstruction fills the wardrobe with a real or labeled-fixture count and the logged processing cost. | Commerce data becomes wardrobe memory with no manual entry. |
| 0:15–0:25 | One mini receipt: paid $128, 1 wear, $128/wear. Closet Coverage + one unresolved charge. | Financial context; admits what it doesn't know. |
| 0:25–0:45 | Search "black dress for a wedding." Owned first, then Maya's size-match, then used, then new. Request loan; second account accepts (or demo-panel accept). Shared Receipt prints. | An intention becomes a real social alternative. |
| 0:45–1:00 | Search a $45 tee: three owned alternatives + purchase memory. Hold 48h prints a pending ghost. Labeled time-advance or "I skipped it" → ghost confirms, Money Kept +$45. | The alternate timeline; a hold is not yet savings. |
| 1:00–1:12 | Unworn item, 3 days left, $89 at stake → Return Pending → seeded Refund Confirmed. | Reminder, return, and refund are different states. |
| 1:12–1:30 | Statement: timeline → Money Kept → Money Recovered; `/stats` with real or labeled costs. Close: "an AI shopping assistant whose goal is to stop you from shopping." | Every headline traces to an action. |

Consistent numbers: $168 borrowed + $45 skipped = **$213 estimated Money Kept**; $89 refund = **$89 Money
Recovered**; combined only as "$302 kept + recovered". Extended appendix (off main stage): in-store charge →
receipt capture → mystery resolution → budget. Autopsy and token comparisons are judge follow-ups.

## Status
### Done
- Phase 1 code (see checklist), re-planned 2026-09-19; accounting/coverage schema fields added 2026-09-19.
### Mocked / not yet live
- `@weave/data` and `@weave/clients` are stubs (Devin tasks 1–2). `fixtures/` is a README (Devin task 3).
- No Supabase project or Vercel deployment linked yet.
### Known issues
- Meta `cached_tokens` field location unverified in a real response — `extractUsage()` accepts both
  `usage.prompt_tokens_details.cached_tokens` and `usage.cached_tokens`; confirm on first live call.
### Contract changes
- 2026-09-19 re-plan: removed crew/outfit/intervention shapes; added `MarketplaceLink`, `MoneyAlternative`,
  `BudgetInputs`/`BudgetSummary`; `VerdictInputs.outfitsUnlocked` → `budgetRemainingCents`; fixtures gained
  `parse_query` and `search_note`, lost `crew_fits`.
- 2026-09-19 accounting: added `KeptInputs`/`KeptSummary`, `CoverageInputs`/`CoverageSummary`; fixture holds must
  include confirmed outcomes with `actual_paid_cents`; seed includes one confirmed refund.
### Open Devin tasks
- `/docs/devin-tasks.md`: 1 retailer data · 2 API clients · 3 fixtures + seed · 4 tests (now incl. kept, coverage,
  wears) · 5 marketplace links + money alternatives.
### TODOs for Devin-owned folders
- (none yet)
