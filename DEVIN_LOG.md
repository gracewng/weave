# Devin log — Weave (HackMIT 2026)

Devin works asynchronously in its own environment and opens one PR per task against this repo. A human merges.
Fill this in as PRs land; it becomes a slide for the Devin judges.

| # | Task | PR | Time Devin took | Est. human time | Notes (what worked, what needed fixing) |
|---|------|----|-----------------|-----------------|------------------------------------------|
| 1 | Retailer data (`/packages/data`) | #1 | ~25m | ~3h (60 retailers + 25 return policies with sources) | 66 retailers, 56 return policies. Contract's `null` window means final sale, so retailers with *no* time limit (Patagonia, American Eagle) are capped at 365 with a note instead. |
| 2 | API clients + mocks (`/packages/clients`) | | | ~4h | |
| 3 | Fixtures + seed script (`/apps/web/fixtures`, `/scripts/seed-demo.ts`) | | | ~4h | |
| 4 | Tests (matcher, return dates, verdicts, budget math, price memory, wears) | | | ~2.5h | |
| 5 | Marketplace links + money alternatives (`/packages/data`) | #2 | ~15m | ~1.5h | 9 marketplaces (8 secondhand + Google Shopping), 11 sourced alternatives. Each search URL shape was checked by request; Depop/Mercari/RealReal answer 403 to any script (bot protection), so those three are unverified and want one click each. |

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
