# Worth It — shared context for every agent session (Claude Code, Devin, humans)

**Read this first.** It is the single source of truth for architecture, conventions, ownership, and status.
Keep it current: done / mocked / known issues / contract changes / open Devin tasks.

## What we're building (one paragraph)
A spending copilot for clothes. It silently builds a complete picture of everything the user owns and what they paid
(from order emails + card charges), then uses it to stop them wasting money — before they buy (checkout extension with
a voice verdict) and after (returns, cost-per-wear, resale) — and connects them with friends so they **borrow before
they buy** (friend closets, loans, crews). Core loop: know what you own → check what friends own → buy only what adds
value → get the most out of what you have. **Not a generic wardrobe app.** Every feature serves the money-saving loop or
the borrow loop.

Differentiators to protect: card is the source of truth · Mystery Purchases quiz · active checkout intervention with
voice · Outfits Unlocked score · Borrow before you buy (friend closets + crews) · one money ledger.

Sponsor tracks (each must be visibly used): Visa (reimagine shopping) · Ramp (save time + money) · Meta (Meta Model
API, "bring people closer") · OpenAI (OpenAI API) · ElevenLabs (TTS) · Token optimization · Devin (best use).

## Hard constraints
- **Demo reliability beats completeness.** Every external dependency has a mock behind `DEMO_MODE=true` or automatic
  fallback on error. The demo must survive bad Wi-Fi.
- **Privacy by design.** Never persist raw email bodies (extract structured items, discard text). Only `gmail.readonly`.
  Friends see only `shareable` items via the `friend_items` view — never `price_cents`, `purchase_date`, `retailer`,
  `return_by`, `est_resale_cents`. Intimates default to not shareable (DB trigger). Say this in onboarding UI.
- **Token discipline.** Every LLM call goes through `callLLM()` in `/packages/shared/src/llm.ts`, which logs
  provider/model/task/tokens/cached/cost/latency/fallback to `llm_calls`.
- **TypeScript everywhere** (optional Python `services/rembg`).
- **No secrets in the repo.** `.env.example` lists every variable with comments.
- **Verify before you code.** Model IDs live only in `/packages/shared/src/models.ts`.
- **Respect the ownership map.** Don't edit folders you don't own; write a TODO here or open an issue.
- Ask the lead before adding a dependency heavier than a small utility or changing the schema after Phase 1.

## Stack
Next.js 16 (App Router, `proxy.ts` not `middleware.ts`) + TypeScript + Tailwind v4 · Supabase (Postgres + pgvector,
Google OAuth, Storage bucket `items`, Realtime) · Vercel (cron) · Meta Model API (Muse Spark, OpenAI-SDK compatible,
base `https://api.meta.ai/v1`) · OpenAI (embeddings + spoken line) · ElevenLabs TTS · Plaid sandbox · eBay Browse ·
SerpAPI · Chrome MV3 extension (Vite) · PWA (web push, camera via file input) · optional FastAPI `rembg`.

## Repo layout (pnpm workspaces)
```
apps/web              Next.js app + API routes            (Claude)   fixtures/ is Devin's
apps/extension        Chrome MV3 extension                  src/ Claude · build config + manifest Devin
packages/shared       models.ts, llm.ts, prompts.ts, contracts.ts, types.ts  (Claude; *.test.ts Devin)
packages/data         retailer allowlist + return policies  (Devin)
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
| Claude Code | `/apps/web` (except `fixtures/`), `/apps/extension/src`, `/packages/shared` (except `*.test.ts`) |
| Devin | `/packages/data`, `/packages/clients`, `/apps/web/fixtures`, `/scripts`, all `*.test.ts`, `/apps/extension` build config (Vite + manifest scaffold) |

Phase 1 created **scaffold-only** stubs in `/packages/data/src/index.ts`, `/packages/clients/src/index.ts` and
`/apps/web/fixtures/README.md` so the workspace resolves. Devin owns them from here on.

**Contracts first.** Devin implements against `/packages/shared/src/contracts.ts`; Claude consumes. Changing a
contract → add a line under "Contract changes" below and tell the lead.

**Git.** Branches for everyone; nobody pushes to `main` after Phase 1. Devin: one PR per task; a human merges.
Pull `main` into your branch every couple of hours. Commit messages: `phase-N: <what>` or `devin: <task>`.

## LLM routing (`/packages/shared/src/models.ts`)
Both providers via the OpenAI SDK with different `baseURL`/key. Verified 2026-09-19.
| Task | Provider · model | Settings |
|---|---|---|
| `extract_email` | Meta `muse-spark-1.3` | `reasoning_effort: minimal`, strict JSON |
| `tag_items` | Meta | `minimal`, strict JSON, batch 20 |
| `read_capture` | Meta | `low`, image input, strict JSON |
| `score_pairings` | Meta | `low`, batched, cached in `pairings` |
| `crew_fits` | Meta | `medium` (flagship Meta feature) |
| `borrow_message` | Meta | `minimal` |
| `spoken_line` | OpenAI `gpt-5.6-luna` | short persona line |
| `embed` | OpenAI `text-embedding-3-small` | 1536 dims, once per item |

Pricing (per 1M): Muse Spark $1.25 in / $0.15 cached / $4.25 out · gpt-5.6-luna $0.20 / $0.02 / $1.20 ·
embeddings $0.02. `callLLM` order: primary → other provider (on error or timeout) → fixture (in DEMO_MODE).
Prompts: stable `system` first, variable `input` last (prompt-cache friendly); `cached_tokens` logged.
Structured output: zod schema → `json_schema` strict (use `.nullable()`, never `.optional()`).
`GET /api/llm/health` pings both providers (logged as task `health`).

## Data model (see `/supabase/migrations`)
`profiles` (sizes, voice_persona, invite_code) · `items` (+ `embedding vector(1536)`, `shareable`, `lendable`,
`return_by`, `status`) · `friendships` (user_a < user_b) · `loans` · `crews` / `crew_members` / `crew_looks` ·
`transactions` (match_status) · `wears` · `pairings` (item_a < item_b) · `interventions` · `llm_calls` ·
`gmail_tokens` (service role only) · `push_subscriptions` · `audio_cache`. RLS on every table.
View `friend_items` (security definer, friendship-filtered, no money fields). Functions: `match_items`,
`match_friend_items` (size-filtered), `accept_invite`, `is_friend`, `is_crew_member`, `handle_new_user` trigger,
`items_privacy_defaults` trigger (intimates → not shareable).

Dedupe for email ingestion: unique index on `(user_id, retailer, lower(name), size, purchase_date)` where source='email'.

## Verdict rules (deterministic, in order — the LLM only writes the spoken line)
1. owned similarity > 0.88 and < 3 wears → `skip`
2. friend lendable similarity > 0.85 and one-time-need signal → `borrow`
3. used option ≥ 40% cheaper → `secondhand`
4. outfits unlocked ≥ 8 → `buy`
5. else → `wait`

Outfit = (top + bottom) or one_piece, + shoes, optional outer; valid if every pair `pairings.score ≥ 0.6` and
formality spread ≤ 2. Rule pre-filter (formality gap > 2 → 0, no model call).

## Token optimization (prize track — shown on `/stats`)
1. Gmail query + sender-domain allowlist before any LLM call
2. HTML stripping, boilerplate removal, truncation (~6k chars)
3. `reasoning_effort: minimal` for extraction/tagging; higher only for `crew_fits`
4. Batching: tagging 20/call, pairing scores batched
5. Static instructions first → prompt cache hits; `cached_tokens` tracked per call
6. Embeddings once per item; `pairings` cache; ElevenLabs audio cache (`audio_cache`)
7. Rule-based verdicts + rule pre-filters; the model writes only short text
8. Crew prompts send compact descriptions, never images
9. `/stats`: tokens + cost by task/provider, cache hit rate, fallbacks, cost per email/intervention/crew, and
   **dollars saved per dollar of AI spend**

## Design direction
Receipt / bank-statement aesthetic. Off-white thermal paper, near-black ink, one accent: savings green (`--save`)
used ONLY for money saved. IBM Plex Mono for numbers/ledger lines, IBM Plex Sans for body; tabular numerals.
Items are clean cutouts, not pastel cards. Interventions "print" mini receipts (`.print` animation). Loans print as a
shared receipt with both names; crews print one long group receipt ending `CREW SPENT ON NEW CLOTHES ...... $0.00`.
Dashed dividers, perforated edges (`.receipt`), dark mode = carbon copy. Primitives in `apps/web/components/Receipt.tsx`.

## Conventions
- Server code only in Route Handlers / Server Actions / Server Components; RLS-respecting `createClient()` for user
  data, `createAdminClient()` (service role) only for `llm_calls`, `gmail_tokens`, cron, and validated
  `crew_looks` inserts.
- Call `ensureLLM()` (`apps/web/lib/llm.ts`) in any server module before `callLLM` so logs reach `llm_calls`.
- Money is always integer cents; format with `usd()` from `components/Receipt.tsx`.
- Dates in DB are `date` (YYYY-MM-DD) strings in TS.
- Env access: `apps/web/lib/env.ts` (web) and `packages/shared/src/env.ts` (shared). `isDemoMode()` everywhere.
- Hidden demo panel: press `D` three times (Phase 4) hosts every demo trigger.

## Phase checklist
- [x] **Phase 1 — Skeleton**: monorepo, migrations written, Google sign-in (Gmail scope + refresh-token capture),
      profile trigger + invite code, nav + empty pages, `DEMO_MODE`, LLM router + logging, `/api/llm/health`,
      `.env.example`, `CLAUDE.md`, `DEVIN_LOG.md`, `docs/devin-tasks.md`, `contracts.ts`.
      **Manual steps still needed:** create Supabase project + apply migrations, enable Google provider with the
      Gmail scope, fill `.env.local`, deploy to Vercel (root dir `apps/web`).
- [ ] Phase 2 — Gmail backfill (SSE progress UI)
- [ ] Phase 3 — Tagging + embeddings
- [ ] Phase 4 — Transactions + Mystery Purchases + demo panel
- [ ] Phase 5 — In-person capture (PWA + push)
- [ ] Phase 6 — Outfits Unlocked engine
- [ ] Phase 7 — Checkout copilot extension (the star)
- [ ] Phase 8 — Friend closets + Crews (the Meta feature)
- [ ] Phase 9 — Returns, wears, ledger
- [ ] Phase 10 — Polish + demo hardening + 90s fallback recording

## Status
### Done
- Phase 1 code (see checklist).
### Mocked / not yet live
- `@worthit/data` and `@worthit/clients` are stubs (Devin tasks 1–2). `fixtures/` is a README (Devin task 3).
- No real Supabase project or Vercel deployment has been linked from this repo yet.
### Known issues
- `match_items`/`match_friend_items` use HNSW cosine; rebuild index if recall looks off after seeding.
- Meta `cached_tokens` field location unverified in a real response — `extractUsage()` accepts both
  `usage.prompt_tokens_details.cached_tokens` and `usage.cached_tokens`; confirm on first live call.
### Contract changes
- (none yet)
### Open Devin tasks
- See `/docs/devin-tasks.md`: 1 retailer data · 2 API clients · 3 fixtures + seed · 4 tests · 5 extension scaffold.
### TODOs for Devin-owned folders
- (none yet)
