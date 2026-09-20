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

## Judging criteria (weights drive every priority call)
| Criterion | Weight | What we show | Where it lives |
|---|---|---|---|
| **Innovation** | 30% | An anti-shopping agent: owned → borrow → used → new; Ghost Rack stub ledger; stand-in stamps; Closet Coverage; the printer interaction language | Search, Ghost Rack, Wardrobe, 90s demo |
| **Technical complexity** | 30% | Unstructured commerce data → structured wardrobe: Gmail pipeline with allowlist + cleanup, dual-provider LLM router (Meta + OpenAI) with strict JSON, timeout fallback and per-call cost logging, pgvector semantic matching, receipt↔transaction matcher, multimodal receipt capture via PWA push + camera, RLS privacy view, SSE streaming, cron | `/stats`, `/api/llm/health`, the capture flow, an architecture slide |
| **Impact** | 30% | Traceable Money Kept and Money Recovered, wear rate, avoided new purchases; honest estimates beat inflated claims | Statement, Ghost Rack, Returns |
| **Learning & collaboration** | 10% | 4 humans + Claude Code + Devin under a written ownership map, contracts-first, PR-only main with CI; what each of us learned | `DEVIN_LOG.md` (incl. Learning notes), PR history, `CLAUDE.md` |

**Adjustments from the weights**
- Technical complexity must be *visible*. Every demo beat pairs a user moment with a proof moment: the ingestion
  counter shows tokens and cost live; search shows which provider answered and the similarity retrieval; `/stats`
  is on screen for at least five seconds. Keep an architecture slide with the data flow.
- In-store capture (push → camera → multimodal read → item) moves from P2 to **P1**: it is the most technically
  dense 15 seconds we have and it is unique. Plaid sandbox stays P2; the mock charge is enough.
- Impact needs one number a judge can repeat. Lead with confirmed Money Kept for the demo user and the wear-rate
  change, never a projected annual figure without a labeled basis. Any market or behavior statistic in the pitch
  needs a cited source.
- Learning & collaboration is cheap points: keep `DEVIN_LOG.md` honest and current, and add a short
  "what we learned" per person before submission.

## The features
1. **Receipt tracker via email** (main ingestion). Gmail backfill → items with image, price, size, retailer,
   purchase date, return_by. Raw email bodies are never stored. The extractor labels every email **purchase / sale /
   refund / other**: a marketplace "you've made a sale" email never creates an item — it marks the matching owned
   item **sold** (`sold_cents`, `sold_at`); offers, shipping and marketplace marketing are rejected before the model.
   Depop "Your order is confirmed" = the user bought (secondhand); `sold@…` "sale confirmation" = the user sold.
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
8. **Ghost Rack — "The clothes you almost owned."** A ledger of purchase intentions you didn't act on: torn,
   VOIDED receipt stubs with intended price, chosen alternative, and outcome. Never silhouettes in the wardrobe.
   Pending holds show *potential* Money Kept; confirmed outcomes show *estimated* Money Kept. 48h re-check
   notifies ("$23 used now — or Maya just added one").
9. **Friend wardrobes + borrowing.** Invite link/QR, browse shareable items in your size, loan request → accept →
   out → returned, push, **Closet Karma** ("Lent 7× · saved friends $412"). No prices, ever.
10. **Statement.** One monthly receipt: **Money Kept** hero, **Money Recovered** separately, a chronological
    intervention timeline, then spent / envelope / not spent / borrowed / secondhand / returns / % worn / best and
    worst cost-per-wear. `/stats` shows dollars kept per dollar of AI spend.
11. **Identify the item** (shared pipeline, three entry points). A receipt photo, a typed description ("black
    Uniqlo crewneck, M, $29"), or an email line item all resolve to *the specific product* with a clean,
    product-only image: extract line items (Muse Spark, multimodal for photos) → build a query (brand + name +
    color + retailer) → SerpAPI Google Shopping (text) or Google Lens (garment photo) → rank candidates
    deterministically (brand match, name similarity, retailer match) → prefer product-only images (flat background,
    no face) → show a strip of 4–6 candidates the user taps → fallback: user's photo through `rembg`. Every item
    records `image_source` (email / shopping / lens / user_photo / cutout). No item is invented from a charge alone.
12. **Voice (low priority).** ElevenLabs reads the statement or a verdict in a persona (Bestie/Stylist/CFO).

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
The torn VOIDED stub and the stand-in stamp on the owned item are the screenshot moment. Prefer a labeled demo
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
| P0 | Ghost Rack stub ledger with pending/confirmed states and printed action receipt | 7 |
| P0 | One reliable two-account borrowing path (+ demo-panel "Maya accepts" fallback) | 8 |
| P0 | One return rescue with honest pending/refund distinction | 6 |
| P0 | Statement with traceable totals; `/stats` evidence | 9 |
| P0 | Complete fixtures, visible fallback mode, recorded demo — before voice | 10 |
| P1 | In-store capture: mock charge → in-app banner → camera → multimodal read → item with receipt on file | 4 (built) |
| P1 | One Mystery Purchase resolution with a coverage change | 4 |
| P1 | Purchase Autopsy expansion | 3 / 9 |
| P2 | Plaid Link walkthrough, elaborate budget alternatives, richer friend features | kept in plan, off main stage |
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
| Interactive Media | Printer slot, tear-to-decide, stamps, receipt printing, timeline reacting to decisions | Motion communicates state; reduced-motion respected |
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
| `judge_images` | Meta → OpenAI | `minimal`, low-detail images, strict JSON (Identify the item) |
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
`profiles` · `items` (embedding, `receipt_url`, `image_source`, `line_index`, `shareable`, `lendable`, `return_by`, `status` incl. `returning`,
`return_initiated_at`, `refund_cents`, `refunded_at`, `est_resale_cents`) · `friendships` · `loans` · `transactions`
(match_status, decision keep/returning/not_clothes) · `wears` · `budgets` · `holds` (Ghost Rack: intended
price/source, verdict, status, `outcome_confirmed_at`, `actual_paid_cents`, `loan_id`, `wore_item_id`,
`kept_cents`, `release_at`) · `llm_calls` · `gmail_tokens` (service role) · `push_subscriptions` · `audio_cache` · `email_records` (per processed message: subject, retailer, items found,
cost; never the body).
RLS everywhere. View `friend_items` (no money fields). Functions: `match_items`, `match_friend_items`
(size-filtered), `accept_invite`, `is_friend`, `handle_new_user`, `items_privacy_defaults`.
Dedupe: unique `(user_id, retailer, lower(name), size, purchase_date)` where source='email'.

## Deterministic rules (the LLM only writes one line)
Verdict, in order (`verdict.ts`): (0) "for someone else" disables rules 1–2 · (1) owned similarity ≥ 0.60 → `skip` ·
(2) friend lendable similarity ≥ 0.55 + one-time-need signal → `borrow` · (3) cheapest used ≥ 40% cheaper →
`secondhand` · (4) price > budget remaining (when a budget exists) → `wait` · (5) else `buy`.
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

## Psychology — why each surface exists (read before designing anything)
The goal is intentional spending, not less shopping for its own sake, and tracking without anxiety. Every surface
maps to a known effect; every rule below closes a known failure mode.

| Effect | What we use it for | Rule that keeps it honest |
|---|---|---|
| **Ownership salience / endowment** — people want less when they can see what they have | Wardrobe grid fills itself in the first minute; owned matches appear *as you type* in search, before desire forms | Owned items are always the largest image on any decision surface |
| **Pain of paying** — cards make spending invisible | Card ingestion re-inks every charge; the keep/returning/not-clothes prompt is a moment of reflection | One question per prompt, neutral ink, no red |
| **Opportunity-cost neglect** — people don't picture the alternative use of money | "What this could be instead" beside every price and the month's overspend | Never followed by a buy button |
| **Cooling-off / delay discounting** — desire peaks at search and decays | Hold 48h is the primary action on a `wait` verdict; sections print in order (owned first) to slow the moment | A hold is never counted as savings |
| **Anchoring** — retailers anchor with strike-through prices | Purchase memory anchors on *your* median ("$28 across 6 purchases") | Never show retailer was/now anchors; never celebrate a "deal" |
| **Sunk cost, used constructively** — past spend feels wasted | Cost-per-wear and the #30wears ring turn past spend into something recoverable **through use, not more buying** | Zero wears → "No wears logged", never "wasted" |
| **Default effect / choice architecture** — order is a recommendation | Fixed order owned → borrow → used → new; "Buy anyway" is always present, plain text, last | Never hidden, never shamed |
| **Peak-end rule** — flows are remembered by their end | Every not-buy ends on a printed receipt; buying ends on a plain "noted" receipt | Not buying gets the satisfying animation |
| **Commitment + Zeigarnik** — open loops nag | A hold is a commitment with a 48h check-in; pending holds are text-only (no product image) | Check-in offers "bought anyway" in one tap with no judgment, or people lie or abandon |
| **Identity** — behavior follows self-image | Stamps, % worn, "stood in for" credits build "someone who wears what they own" | Never "frugal", "saver", or a score |
| **Social norms, not social comparison** | Lending is visible and warm (Closet Karma); friends see items, never money | No feed, no likes, no rankings, no spend comparison |
| **Loss aversion, used narrowly** | "$89 at stake, 3 days left" on the return board only | Everywhere else uses gain framing ("kept"), never "wasted" |

**Failure modes we design against**
- **Licensing.** Money Kept must never read as a balance to spend. It appears only on the Statement and Ghost Rack,
  never on search or near a buy action. No "you earned it" copy, ever.
- **Budget as permission.** The envelope shows what's left as remaining paper, never "you can still spend $X."
- **Purchase memory as a target.** Show the median with its sample size as an anchor; never flag an item cheaper than
  your median as good. Cheaper is still buying.
- **Gaps that beg to be filled.** Ghosts never appear in the wardrobe grid as silhouettes. The wardrobe only shows what
  you own, so it always looks complete. Confirmed outcomes are torn receipt stubs with a VOIDED stamp; the credit
  goes to the owned item that stood in ("STOOD IN FOR $148 DRESS · SEP 18").
- **Deal excitement.** Secondhand shows price plainly. No "40% off!", no urgency, no countdowns except return windows.
- **Gamification creep.** Wear stamps are self-tracking, not streaks. No points, badges, or leaderboards.
- **Tracking anxiety.** Monthly cadence, calm ink, green only for confirmed kept/recovered, no alarms. A quiet
  month is a feature.
- **Overclaiming.** Every estimate is labeled; broken trust ends the product.

**Language guide.** Use verbs of use: wear, lend, return, stand in, keep. Say "kept", not "saved". Never: deal,
treat, wishlist, missing, gap, saved for later, wasted, frugal, score, streak. "Buy anyway" is the neutral label;
"Skip" is the neutral opposite.

**Notification policy.** Exactly three kinds, each at most once per event: a new clothing charge (immediate), a
return window at 4 days with zero wears (once), a hold check-in at 48h (once). Never marketing, never nudges to shop.

## Design direction
Aesthetic digital wardrobe on receipt paper. **The app is a thermal printer:** every decision produces a receipt,
the wardrobe is a rack of cutouts, money is always ink on paper. Off-white thermal paper, near-black ink, one
accent: savings green (`--save`) **only for confirmed** kept/recovered money. No red anywhere; over-budget is the
receipt running out of paper. IBM Plex Mono for numbers, IBM Plex Sans for body; tabular numerals. Carbon-copy dark
mode with slightly blue ink. Respect `prefers-reduced-motion` (every animation degrades to an instant state
change); receipts are real text. Primitives: `apps/web/components/Receipt.tsx`.

**Signature interactions (build in this order; each phase inherits the earlier ones)**
1. **Printer slot.** A dark slit fixed at the top; every action's receipt prints from it line by line, then settles.
   Completed receipts curl into a spool icon that unrolls into the Statement. Latency becomes theater.
2. **Stand-in stamps + stub ledger.** Owned items that replaced a purchase get a stamp on their receipt; the Ghost
   Rack is a ledger of torn, VOIDED stubs (intended price struck through, kept amount in green). No silhouettes.
3. **Wear stamps and a ticking price.** Tap a cutout → rubber stamp "WORN SEP 19" → cost-per-wear ticks down
   toward $4. Stamps accumulate like a passport. One tap, no form.
4. **Search prints in order.** Owned prints first while the rest fetch; empty sections still print
   ("NOTHING OWNED ........ that's fine") so the order is never hidden.
5. **Tear to decide.** Results and stubs sit on a perforation; drag across to skip / confirm. Button fallback
   ships first, gesture second.
6. **Coverage barcode.** Resolved records are printed bars, unresolved are gaps; tap a gap to open that Mystery
   Purchase.
7. **Slash command bar.** `/` anywhere; owned matches appear from a lexical index as you type, before the semantic
   search runs; typing "$45" prints purchase memory beside it.

**Decision-surface rules.** Owned alternative is the largest image; pending holds are text-only; "Buy anyway" is
plain text, same size, last; one primary action per section; every printed receipt shows VOID for ten seconds.
Mystery Purchases are receipts with the item line thermally faded; resolving re-inks it. "Bought anyway" prints a
plain receipt with "$45 / 0 wears" and invites the first wear log — a purchase becomes a use commitment. Search's
owned section sorts by fewest wears (rediscovery). Wardrobe has a "least recently worn" sort.

**Stretch (Phase 10):** budget as receipt length (remaining money = remaining paper, projection as a dotted
extension), Shared Receipt that tears in half on return, optional printer sound (off by default).

## Conventions
- Server code in Route Handlers / Server Actions / Server Components; `createClient()` (RLS) for user data;
  `createAdminClient()` only for `llm_calls`, `gmail_tokens`, cron.
- `ensureLLM()` (`apps/web/lib/llm.ts`) before any `callLLM` in a server module.
- Money = integer cents; `usd()` from `components/Receipt.tsx`. DB dates are `YYYY-MM-DD` strings.
- `isDemoMode()` everywhere; fixture results carry a visible "fixture" label in UI.
- Hidden demo panel (`D` ×3, Phase 4): fire mock charge, return reminder, **advance 48h**, **Maya accepts**,
  **seed confirmed refund**, reset demo users.
- Copy passes the language guide (no deal/treat/wishlist/missing/gap/wasted/saved). Money Kept never appears on a
  buy surface.

## Phase checklist
- [x] **Phase 1 — Skeleton** (re-planned). Monorepo, migrations, Google sign-in (Gmail scope + refresh-token
      capture), profile trigger + invite code, nav, `DEMO_MODE`, LLM router + logging, `/api/llm/health`,
      `.env.example`, docs, `contracts.ts`. **Done:** Supabase project + migrations, Google provider, `.env.local`. **Manual:** LLM keys in `.env.local`,
      Gmail scope + test users on the Google consent screen, Vercel (root `apps/web`).
- [ ] **Phase 2 — Gmail receipt backfill** (3.5h). Query + allowlist → strip/truncate → `extract_email` → email
      image if present, else Identify-the-item lookup for a clean product image → Storage → dedupe → `return_by`. SSE progress "Scanned 214 emails · found 47 items · 9¢ in tokens".
      Accept: a teammate's real inbox → wardrobe with images, prices, return dates in < 2 min.
- [x] **Phase 3 — Tagging, embeddings, Wardrobe UI** (3h). `lib/tagging.ts` (`tagAndEmbed`: only untagged /
      unembedded rows, batch 20; `similarOwned`), `POST /api/items/tag`, `GET /api/items/similar`, tagging runs
      automatically after an ingestion that found items. `packages/shared/src/wears.ts` (cost-per-wear, #30wears,
      wornShare, dormant). Wardrobe grid with sorts (newest / least recently worn / cost per wear / paid) + item
      page = mini receipt + WearRing + wear stamps + "Wore today" (prints from the **PrinterSlot**) + Purchase
      Autopsy + sharing toggles + semantic neighbors. **Verified live:** 10 items tagged + embedded for $0.0008;
      "black cotton crew neck t-shirt" → the two black tees first (0.66), "formal black dress for a wedding" →
      slip midi dress first (0.43).
- [ ] **Phase 4 — Card transactions + Charges** (3.5h). Plaid sandbox/mock; matcher; push "Snap the receipt" +
      keep/returning/not-clothes; capture page with three inputs (receipt photo / garment photo / typed description)
      → Identify the item (`read_capture` + Shopping/Lens + candidate strip + `rembg` fallback); Mystery Purchases stack with Closet
      Coverage fraction; `POST /api/demo/charge`; demo panel. Accept: mock charge → notification < 5s → snapped
      receipt → item < 15s; resolving one mystery changes coverage from data.
- [ ] **Phase 5 — Budget** (2h). Envelope, live spend, projection, alternatives, over-budget state.
- [x] **Phase 6 — Return board** (2h). `lib/returns.ts`, `/returns` (open windows soonest-first with days-left stamp,
      $ at stake, policy days, wears, receipt-on-file; Return Pending → Refund Confirmed with the actual amount →
      Money Recovered; "keeping it after all"), `GET /api/cron/returns` (daily 14:00 UTC via `vercel.json`; lists
      unworn items closing within 4 days — push delivery is Phase 10), demo panel "Seed confirmed refund".
- [x] **Phase 7 — Search + Ghost Rack** (5h). Built: `packages/shared/src/{verdict,budget,kept}.ts` (rules, calibrated
      thresholds skip ≥ 0.60 / borrow ≥ 0.55), `lib/search/run.ts` two stages (`local`: `parse_query` → description-
      shaped embedding → `match_items` + `match_friend_items` + price memory + budget + provisional verdict;
      `market`: one cached SerpAPI search split into used (resale merchants) vs retail, final verdict, `search_note`),
      `POST /api/search`, `/search` UI (four sections print in order; Wear mine · Ask to borrow · Buy used · Skip ·
      Hold 48h · Buy anyway; `/` focuses the bar; **"for someone else"** toggle skips owned/friends and rules 1–2),
      `holds` decisions with `kept_cents` via `keptForHold`, `/ghosts` stub ledger (pending with "What happened?",
      confirmed with VOIDED/BOUGHT USED stamps, Money Kept breakdown), stand-in stamps on items, demo panel (D×3:
      advance 48h, reset holds). Marketplace links are a stopgap in `lib/search/marketplaces.ts` until Devin task 5.
      **Verified live:** "plain black tee" → skip on the black tees (0.65); "black slip dress for a wedding" → skip on
      the slip midi dress (0.67), note "Skip it—the closest match is your Slip Midi Dress, worn 0x." ~$0.0003/search
      + 1 SerpAPI search per distinct query. **Deferred to Phase 10:** the 48h cron re-check + push (demo panel
      time-advance covers the demo).
      Accept: near-duplicate tee shows owned first "worn 2×"; formal dress shows "Borrow from Maya"; Hold prints a
      Purchase Paused stub; confirming a skip turns it green and raises Money Kept by exactly the intended price.
- [x] **Phase 8 — Friend wardrobes + borrowing** (3h). `lib/friends.ts` (size match, karma, loans with names),
      `/friends` (Closet Karma, invite code + QR (`qrcode`) + paste-a-code form, open loans with Accept / Decline /
      Handed over / Returned, friends list, past loans; **Supabase Realtime** on `loans` refreshes and prints a
      receipt when the other party acts), `/friends/[id]` (friend wardrobe via `friend_items`, "in my size" filter
      with show-all toggle, Ask-to-borrow form with dates + `borrow_message` draft), search "Ask to borrow" deep-links
      with the intended price; a loan that replaces a purchase creates a linked hold that becomes **borrowed** (Money
      Kept credited) only when the item is handed over; declined → released. Demo panel: "Friend accepts my request".
      **Verified:** Grace ↔ Zoe friendship; Zoe's shareable items appear in the Borrow section with sizes; `friend_items`
      exposes no money fields. **Not yet verified live:** the two-phone accept (needs both of you signed in) — the
      demo-panel accept covers it. Push notifications deferred to Phase 10.
- [x] **Phase 9 — Statement + Stats** (2.5h). `lib/statement.ts` + `/statement?m=YYYY-MM` (month nav; timeline of
      holds / returns / loans each linking to its page; Money Kept with breakdown; Money Recovered; pending shown
      separately; "kept + recovered" labeled; spent on you vs on others; envelope when a budget exists; % worn 90d,
      best/worst cost per wear, dormant $). `/stats` now shows your AI spend, per-email and per-search cost, your
      confirmed Money Kept / Recovered, **kept per $1 of your AI spend** (N/A at zero), and live call count.
- [~] **Phase 10 — Hardening, then voice.** **Done:** production deploy at https://weave-phi.vercel.app (health green,
      Google sign-in redirect verified, cron authenticates). **Left:** web push (VAPID + service worker), 48h hold cron,
      fixture completeness (Devin task 3), empty/loading states, reduced-motion pass, language-guide pass, 90-second
      recording; ElevenLabs only after all of that.

## Demo — 90 seconds, one changed purchase at a time
Live vs fixture is always labeled; the recorded fallback is ready.
| Time | Show | Proves |
|---|---|---|
| 0:00–0:15 | "Weave is a bank statement for your closet." Reconstruction fills the wardrobe with a real or labeled-fixture count, the logged token cost, and the provider that answered. | Commerce data becomes wardrobe memory with no manual entry (technical proof #1). |
| 0:15–0:25 | One mini receipt: paid $128, 1 wear, $128/wear. Closet Coverage + one unresolved charge. | Financial context; admits what it doesn't know. |
| 0:25–0:45 | Search "black dress for a wedding." Owned first, then Maya's size-match, then used, then new. Request loan; second account accepts (or demo-panel accept). Shared Receipt prints. | An intention becomes a real social alternative. |
| 0:45–1:00 | Search a $45 tee: three owned alternatives + purchase memory. Hold 48h prints a Purchase Paused stub. Labeled time-advance or "I skipped it" → stub is VOIDED, the owned tee gets a stand-in stamp, Money Kept +$45. | The alternate timeline; a hold is not yet savings. |
| 1:00–1:12 | Unworn item, 3 days left, $89 at stake → Return Pending → seeded Refund Confirmed. | Reminder, return, and refund are different states. |
| 1:12–1:30 | Statement: timeline → Money Kept → Money Recovered; `/stats` on screen ≥ 5s with real or labeled costs, cache rate, fallbacks. Close: "an AI shopping assistant whose goal is to stop you from shopping." | Every headline traces to an action (technical proof #2). |

Consistent numbers: $168 borrowed + $45 skipped = **$213 estimated Money Kept**; $89 refund = **$89 Money
Recovered**; combined only as "$302 kept + recovered". If time allows inside 90s, or as the first appendix beat: in-store charge → push → snap receipt → item appears
(15s, P1). Then mystery resolution → budget. Autopsy and token comparisons are judge follow-ups.

## Status
### Done
- Phase 1 code (see checklist), re-planned 2026-09-19; accounting/coverage schema fields added 2026-09-19.
### Mocked / not yet live
- `@weave/data` and `@weave/clients` are stubs (Devin tasks 1–2). `fixtures/index.ts` exports `null` (Devin task 3).
- Stopgaps Claude owns until Devin's PRs land: `apps/web/lib/ingest/retailers-fallback.ts` (35 retailers +
  return windows) and `apps/web/lib/ingest/sample-emails.ts` (5 demo emails). `prefilter.ts` switches to
  `@weave/data` automatically once it has retailers; `pipeline.ts` prefers `fixtures.emails` when present.
- Supabase project `kwvllecqmgoqfjzpqfkp` ("Weave Users", us-east-2) has all migrations applied (2026-09-19) and Google auth enabled. Keys live in `apps/web/.env.local` (gitignored). **Deployed:** https://weave-phi.vercel.app (Vercel project `weave`,
  root `apps/web`, auto-deploys from `main`; 18 env vars set via API; Supabase site URL + redirect list point at it;
  daily returns cron active). `VERCEL_TOKEN` in `.env.local` manages env + deploys from the CLI.
### Known issues
- `judge_images` can be refused by the model for intimates imagery (lingerie thumbnails); the lookup then
  falls back to the unjudged ranking, which may pick a model shot. Intimates are private anyway. Regular garments judge fine.
- SerpAPI fresh searches take ~20–25s; identical queries are served from SerpAPI's cache instantly and free.
  Free plan: 250 searches/month. Our DB cache means each distinct query costs one search, ever.
- Similarity thresholds are calibrated for `text-embedding-3-small` (skip ≥ 0.60, borrow ≥ 0.55 in `verdict.ts`);
  queries are embedded in the item-description shape via `parse_query.description`. Re-check after Devin's seed
  data lands (friends' items).
- Meta `cached_tokens` field location unverified in a real response — `extractUsage()` accepts both
  `usage.prompt_tokens_details.cached_tokens` and `usage.cached_tokens`; confirm on first live call.
### Contract changes
- 2026-09-19 re-plan: removed crew/outfit/intervention shapes; added `MarketplaceLink`, `MoneyAlternative`,
  `BudgetInputs`/`BudgetSummary`; `VerdictInputs.outfitsUnlocked` → `budgetRemainingCents`; fixtures gained
  `parse_query` and `search_note`, lost `crew_fits`.
- 2026-09-19 identify: `SerpClient.lens(imageUrl)` added; `ShoppingResult.productOnly` heuristic flag; `items.image_source`.
- 2026-09-19 accounting: added `KeptInputs`/`KeptSummary`, `CoverageInputs`/`CoverageSummary`; fixture holds must
  include confirmed outcomes with `actual_paid_cents`; seed includes one confirmed refund.
### Open Devin tasks
- `/docs/devin-tasks.md`: 1 retailer data · 2 API clients · 3 fixtures + seed · 4 tests (now incl. kept, coverage,
  wears) · 5 marketplace links + money alternatives.
### TODOs for Devin-owned folders
- (none yet)
