# fixtures (DEVIN-OWNED)

`index.ts` exports `fixtures: Fixtures` (see `/packages/shared/src/contracts.ts`) — everything `DEMO_MODE=true`
needs with no external service reachable.

| File | What's in it |
|---|---|
| `emails.ts` | `ORDER_SPECS` — one compact spec per email; the HTML body, the expected `extract_email` result and the matching charge are all generated from it, so they can't drift. 30 emails: single- and multi-item, 2 shipping notifications that must be rejected, 2 Amazon orders mixing clothing with non-clothing. |
| `charges.ts` | 18 months of card activity: one charge per order email (messy statement string, tax on top, sometimes a day late), 6 clothing charges with no email (Mystery Purchases), 2 in the last 48 hours, plus non-clothing noise. |
| `search.ts` | Used listings and shopping results keyed by lowercased query prefix, and the 6 retail product pages. |
| `llm.ts` | `parse_query` for 9 queries, one search note and one spoken line per verdict, the borrow message. |
| `audio.ts` | A 0.25s silent mp3 data URL per verdict — proves the player and cache plumbing offline. |

Dates are relative to today, so return windows stay open and "last 48 hours" is always the last 48 hours.

Query lookup goes through `fixtureUsedFor()` / `fixtureShoppingFor()`, which match the longest key contained in the
query — "black slip dress for a wedding" resolves to the "black slip dress" bucket.

`fixtures.test.ts` validates every `extract_email` against `ExtractEmailSchema`, every `parse_query` against
`ParseQuerySchema`, and checks the email↔charge reconciliation stays inside the matcher's tolerances.
