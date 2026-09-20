# scripts

## seed-demo.ts — the demo database

Creates everything the 90-second demo needs in a Supabase project: a demo user with a 45-item closet, three
friends with their own closets, 18 months of transactions, a budget, the Ghost Rack lifecycle, a past loan, one
pending return and one confirmed refund. Wear tracking was dropped from the schema in migration 0012, so nothing
is seeded into `wears`.

```bash
export NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<service role key>      # never the anon key, never committed
pnpm tsx scripts/seed-demo.ts --reset
```

`--reset` deletes the four demo users first; the schema's cascades remove their items, transactions,
holds and loans, so the script is safe to re-run. Without `--reset` it fails on the second run, because the demo
users already exist.

Accounts (all with password `weave-demo-2026`):

| Email | Who | Closet |
|---|---|---|
| `demo@weave.app` | the demo user | 45 items spread over 18 months |
| `maya@weave.app` | friend, same sizes | 34 items — **owns the black silk slip dress in the demo user's size** |
| `jordan@weave.app` | friend, larger sizes | 28 items |
| `priya@weave.app` | friend, smaller sizes | 38 items |

What the seed guarantees for the demo beats:

- **Returns board** — two items whose return window closes within 4 days, one item `returning`, one `returned`
  with a confirmed refund (Money Recovered).
- **Ghost Rack / Statement** — five holds: two `held` with `release_at` already past (the 48h re-check fires
  immediately), one `skipped` confirmed against an owned tee, one `borrowed` confirmed and linked to the past
  loan, one `bought_used` at $42 against a $98 intention.
- **Mystery Purchases / Closet Coverage** — 6 clothing charges with no order email, plus 2 clothing charges in
  the last 48 hours for the keep / returning / not clothes prompt.
- **Budget** — $4,200 take-home, 5% clothing envelope.

Notes:

- Item images are stable remote placeholders rather than uploads to the `items` storage bucket. The demo needs
  images that always load and a seed that runs against a fresh project with no bucket policy set up; swap
  `img()` for an upload helper if you want them served from Supabase.
- Embeddings are left null unless `OPENAI_API_KEY` is set, in which case every item description is embedded
  with `text-embedding-3-small`.
- Charges, emails and their expected extractions all come from `apps/web/fixtures`, so the seeded database and
  `DEMO_MODE=true` ingestion tell the same story.
