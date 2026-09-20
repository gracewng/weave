/**
 * DEVIN-OWNED. External service clients — see /docs/devin-tasks.md task 2.
 *
 * Every client is real when configured and DEMO_MODE is off, and a fixture otherwise. Real clients are also
 * wrapped so that a throw (bad key, rate limit, timeout, no network on the demo wifi) silently falls back to the
 * fixture for that call: the demo never dies on an external service.
 *
 * eBay is implemented here (ElevenLabs was removed from scope 2026-09-20). SerpAPI and Plaid already have working real implementations in the
 * web app (`apps/web/lib/identify.ts`, `apps/web/lib/plaid.ts`) — per the task status note they are not
 * reimplemented; pass them into `getClients({ serp, plaid })` and they get the same fallback wrapper, or omit
 * them and get the fixtures.
 */
import type { Clients, EbayClient, PlaidClient, SerpClient } from '@weave/shared/contracts';
import { isDemoMode } from '@weave/shared/env';
import { createEbayClient, ebayConfigured } from './ebay';
import { createEbayMock } from './ebay.mock';
import { createSerpMock } from './serp.mock';
import { createPlaidMock } from './plaid.mock';

export * from './ebay';
export * from './ebay.mock';
export * from './serp.mock';
export * from './plaid.mock';

export interface ClientOptions {
  /** Real SerpAPI client from the web app; fixture is used when omitted. */
  serp?: SerpClient;
  /** Real Plaid client from the web app; fixture is used when omitted. */
  plaid?: PlaidClient;
  /** Force fixtures regardless of env — used by tests. */
  demo?: boolean;
}

export type FallbackReason = { client: string; method: string; error: unknown };

/** Set by the app to log "fell back to fixture" into /stats. */
let onFallback: ((r: FallbackReason) => void) | null = null;
export function setFallbackReporter(fn: ((r: FallbackReason) => void) | null): void {
  onFallback = fn;
}

/** Per-method: try real, and on any throw use the fixture instead. */
function withFallback<T extends object>(name: string, real: T, mock: T): T {
  return new Proxy(real, {
    get(target, prop, receiver) {
      const fn = Reflect.get(target, prop, receiver);
      if (typeof fn !== 'function') return fn;
      return async (...args: unknown[]) => {
        try {
          return await (fn as (...a: unknown[]) => Promise<unknown>).apply(target, args);
        } catch (error) {
          onFallback?.({ client: name, method: String(prop), error });
          const alt = Reflect.get(mock, prop) as (...a: unknown[]) => Promise<unknown>;
          return alt.apply(mock, args);
        }
      };
    },
  });
}

export function getClients(opts: ClientOptions = {}): Clients {
  const demo = opts.demo ?? isDemoMode();

  const ebayMock = createEbayMock();
  const ebay: EbayClient = demo || !ebayConfigured() ? ebayMock : withFallback('ebay', createEbayClient(), ebayMock);

  const serpMock = createSerpMock();
  const serp: SerpClient = demo || !opts.serp ? serpMock : withFallback('serp', opts.serp, serpMock);

  const plaidMock = createPlaidMock();
  const plaid: PlaidClient = demo || !opts.plaid ? plaidMock : withFallback('plaid', opts.plaid, plaidMock);

  return { ebay, serp, plaid };
}
