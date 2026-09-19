# Devin log — Weave (HackMIT 2026)

Devin works asynchronously in its own environment and opens one PR per task against this repo. A human merges.
Fill this in as PRs land; it becomes a slide for the Devin judges.

| # | Task | PR | Time Devin took | Est. human time | Notes (what worked, what needed fixing) |
|---|------|----|-----------------|-----------------|------------------------------------------|
| 1 | Retailer data (`/packages/data`) | | | ~3h (60 retailers + 25 return policies with sources) | |
| 2 | API clients + mocks (`/packages/clients`) | | | ~4h | |
| 3 | Fixtures + seed script (`/apps/web/fixtures`, `/scripts/seed-demo.ts`) | | | ~4h | |
| 4 | Tests (matcher, return dates, outfit counting, verdicts, crew_fits validator) | | | ~2.5h | |
| 5 | Extension scaffold (MV3 manifest, Vite, entry points, dev reload) | | | ~1.5h | |

## How we split the work
- **Claude Code** (interactive, with the lead): schema, app, LLM router, extension logic — the parts that need
  fast iteration with a human in the loop.
- **Devin** (async): well-specified, contract-driven leaf packages — data, clients, fixtures, tests, scaffolds —
  where a written brief + acceptance criteria is enough and parallelism buys us hours.
- Contracts in `/packages/shared/src/contracts.ts` are the interface between them; ownership map in `CLAUDE.md`
  guarantees no merge conflicts.

## Totals
- Devin hours: —
- Estimated human hours replaced: ~15h
