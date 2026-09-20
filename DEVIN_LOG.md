# Devin log — Weave (HackMIT 2026)

Devin works asynchronously in its own environment and opens one PR per task against this repo. A human merges.
Fill this in as PRs land; it becomes a slide for the Devin judges.

| # | Task | PR | Time Devin took | Est. human time | Notes (what worked, what needed fixing) |
|---|------|----|-----------------|-----------------|------------------------------------------|
| 1 | Retailer data (`/packages/data`) | | | ~3h (60 retailers + 25 return policies with sources) | |
| 2 | API clients + mocks (`/packages/clients`) | #4 | ~40m | ~4h | eBay Browse (client-credentials OAuth, token cached) + ElevenLabs TTS (sha256(text+voice) cache, injectable store) are real; SerpAPI and Plaid keep the working app implementations and are injected into `getClients({ serp, plaid })`. Every real client is proxied so a throw falls back to the fixture per call — the demo cannot die on an external service. eBay has no sold-price endpoint outside limited-release Marketplace Insights, so `soldMedianCents` uses the median asking price of the cheapest 50 used listings, documented in code. |
| 3 | Fixtures + seed script (`/apps/web/fixtures`, `/scripts/seed-demo.ts`) | | | ~4h | |
| 4 | Tests (matcher, return dates, verdicts, budget math, price memory, wears) | | | ~2.5h | |
| 5 | Marketplace links + money alternatives (`/packages/data`) | | | ~1.5h | |

## How we split the work
- **Claude Code** (interactive, with the lead): schema, app, LLM router, search + budget logic — the parts that need
  fast iteration with a human in the loop.
- **Devin** (async): well-specified, contract-driven leaf packages — data, clients, fixtures, tests, scaffolds —
  where a written brief + acceptance criteria is enough and parallelism buys us hours.
- Contracts in `/packages/shared/src/contracts.ts` are the interface between them; ownership map in `CLAUDE.md`
  guarantees no merge conflicts.

## Totals
- Devin hours: —
- Estimated human hours replaced: ~15h

## Learning & collaboration notes (10% of the score — fill in before submission)
One or two lines each: what you built, what surprised you, what you'd do differently.
| Person / agent | Owned | What we learned |
|---|---|---|
| Grace (lead) | product, schema decisions, Claude Code sessions | |
| Zoe | | |
| Emma | | |
| (teammate 4) | | |
| Claude Code | app, shared package, migrations | |
| Devin | data, clients, fixtures, tests | |

Process facts worth stating: written ownership map so agents and humans never touched the same files; contracts
before implementation; PR-only `main` with CI; every LLM call logged with cost so we could see our own spend.
