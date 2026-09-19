/**
 * DEVIN-OWNED. Scaffold only — see /docs/devin-tasks.md task 2.
 * Must export `getClients(): Clients` that returns real implementations, or mocks when DEMO_MODE=true
 * (or automatically on error). Each client lives in its own file: ebay.ts, serp.ts, tts.ts, plaid.ts (+ *.mock.ts).
 */
import type { Clients } from '@worthit/shared/contracts';

export function getClients(): Clients {
  throw new Error('@worthit/clients not implemented yet — Devin task 2 (see docs/devin-tasks.md)');
}
