import 'server-only';
import { callLLM, isDemoMode } from '@weave/shared';
import { EXTRACT_EMAIL_SYSTEM, ExtractEmailSchema, extractEmailInput, type ExtractEmailResult } from '@weave/shared/prompts';
import type { Item } from '@weave/shared/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureLLM } from '@/lib/llm';
import { refreshGoogleAccessToken } from '@/lib/google';
import { ORDER_QUERY, retailerQuery, getMessage, listMessageIds, type GmailMessage } from '@/lib/gmail';
import { prepareEmail } from './html';
import { prefilter, allowlistDomains } from './prefilter';
import { insertExtractedItems } from './persist';
import { SAMPLE_EMAILS } from './sample-emails';
import { fixtures } from '@/fixtures';

export interface Counters {
  scanned: number;      // messages fetched
  prefiltered: number;  // dropped before any model call
  sent: number;         // model calls made
  clothingOrders: number;
  itemsFound: number;
  duplicates: number;
  failed: number;
  costUsd: number;
  tokens: number;
  cached: number;
}

export type IngestEvent =
  | { type: 'start'; mode: 'gmail' | 'fixture'; total: number }
  | { type: 'progress'; counters: Counters; subject?: string; retailer?: string; provider?: string }
  | { type: 'item'; item: Pick<Item, 'id' | 'name' | 'brand' | 'price_cents' | 'image_url' | 'retailer' | 'purchase_date' | 'return_by'> }
  | { type: 'done'; counters: Counters; mode: 'gmail' | 'fixture'; elapsedMs: number }
  | { type: 'error'; message: string; counters: Counters };

export interface RunOptions {
  userId: string;
  refreshToken: string | null;
  maxEmails?: number;
  maxCostUsd?: number;
  onEvent: (e: IngestEvent) => void;
  /** Force fixtures even outside DEMO_MODE (demo panel / tests). */
  forceFixture?: boolean;
}

type EmailInput = { id: string; from: string; subject: string; date: string; html: string | null; text: string | null; expected?: ExtractEmailResult };

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]!, i); }
  });
  await Promise.all(workers);
  return out;
}

/** Devin's fixtures (task 3) win when present; otherwise the stopgap samples. */
function loadFixtureEmails(): EmailInput[] {
  const emails = fixtures?.emails;
  if (emails?.length) {
    return emails.map((e) => ({ ...e, text: null, expected: fixtures?.llm?.extract_email?.[e.id] as ExtractEmailResult | undefined }));
  }
  return SAMPLE_EMAILS.map((e) => ({ ...e, text: null }));
}

export async function runIngestion(opts: RunOptions): Promise<Counters> {
  ensureLLM();
  const admin = createAdminClient();
  if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  const maxEmails = opts.maxEmails ?? Number(process.env.INGEST_MAX_EMAILS ?? 300);
  const maxCost = opts.maxCostUsd ?? Number(process.env.INGEST_MAX_COST_USD ?? 2);
  const started = Date.now();
  const c: Counters = { scanned: 0, prefiltered: 0, sent: 0, clothingOrders: 0, itemsFound: 0, duplicates: 0, failed: 0, costUsd: 0, tokens: 0, cached: 0 };
  const emit = opts.onEvent;

  // ── source ──────────────────────────────────────────────────────────────────
  const mode: 'gmail' | 'fixture' = !isDemoMode() && !opts.forceFixture && opts.refreshToken ? 'gmail' : 'fixture';
  let emails: EmailInput[] = [];
  let token: string | null = null;
  let ids: string[] = [];

  try {
    if (mode === 'gmail') {
      token = await refreshGoogleAccessToken(opts.refreshToken!);
      // Two passes: (1) everything from known clothing retailers — full 3 years, never crowded out by receipts
      // from food/transit/prints; (2) the generic purchases query for retailers we don't know yet.
      const fromRetailers = await listMessageIds(token, retailerQuery(allowlistDomains()), Math.min(maxEmails, 200));
      const generic = await listMessageIds(token, ORDER_QUERY, maxEmails);
      const all = [...new Set([...fromRetailers, ...generic])].slice(0, maxEmails + 200);
      const { data: done } = await admin.from('email_records').select('message_id').eq('user_id', opts.userId);
      const doneSet = new Set((done ?? []).map((r: { message_id: string }) => r.message_id));
      ids = all.filter((id) => !doneSet.has(id));
      emit({ type: 'start', mode, total: ids.length });
    } else {
      emails = loadFixtureEmails();
      const { data: done } = await admin.from('email_records').select('message_id').eq('user_id', opts.userId);
      const doneSet = new Set((done ?? []).map((r: { message_id: string }) => r.message_id));
      emails = emails.filter((e) => !doneSet.has(e.id));
      emit({ type: 'start', mode, total: emails.length });
    }
  } catch (err) {
    // Source failure (token refresh, Gmail API): report once and stop. Nothing was processed.
    emit({ type: 'error', message: err instanceof Error ? err.message : String(err), counters: c });
    return c;
  }

  let aborted = false;
  const processOne = async (email: EmailInput) => {
    if (aborted) return;
    c.scanned++;
    const prepared = prepareEmail(email);
    const pf = prefilter({ from: email.from, subject: email.subject, text: prepared.text });
    const record: Record<string, unknown> = {
      user_id: opts.userId, message_id: email.id, sender_domain: pf.domain, subject: email.subject.slice(0, 200),
      email_date: email.date.slice(0, 10), retailer: pf.retailer?.name ?? null,
    };
    if (!pf.pass) {
      c.prefiltered++;
      await admin.from('email_records').upsert({ ...record, status: 'prefiltered' });
      emit({ type: 'progress', counters: { ...c }, subject: email.subject });
      return;
    }
    try {
      c.sent++;
      const r = await callLLM<ExtractEmailResult>({
        task: 'extract_email', system: EXTRACT_EMAIL_SYSTEM, schema: ExtractEmailSchema, schemaName: 'extract_email',
        input: extractEmailInput({ from: email.from, subject: email.subject, date: email.date.slice(0, 10), text: prepared.text, imageUrls: prepared.imageUrls, linkUrls: prepared.linkUrls }),
        userId: opts.userId,
        fixture: email.expected ? () => email.expected! : () => ({ is_clothing_order: false, retailer: pf.retailer?.name ?? '', order_date: email.date.slice(0, 10), items: [] }),
      });
      c.costUsd += r.costUsd; c.tokens += r.usage.input + r.usage.output; c.cached += r.usage.cached;
      const result = r.data;
      let inserted: Item[] = [];
      if (result.is_clothing_order && result.items.length) {
        c.clothingOrders++;
        const res = await insertExtractedItems(admin, opts.userId, result, {
          messageId: email.id, retailerName: pf.retailer?.name ?? result.retailer ?? '',
          returnWindowDays: pf.retailer ? pf.retailer.returnWindowDays : 30, imageUrls: prepared.imageUrls, linkUrls: prepared.linkUrls,
        });
        inserted = res.inserted; c.duplicates += res.duplicates; c.itemsFound += inserted.length;
      }
      await admin.from('email_records').upsert({
        ...record, retailer: pf.retailer?.name ?? result.retailer ?? null, order_date: /^\d{4}-\d{2}-\d{2}$/.test(result.order_date) ? result.order_date : null,
        is_clothing_order: result.is_clothing_order, items_found: inserted.length, status: 'processed', cost_usd: r.costUsd,
      });
      emit({ type: 'progress', counters: { ...c }, subject: email.subject, retailer: result.retailer, provider: r.provider });
      for (const it of inserted) emit({ type: 'item', item: { id: it.id, name: it.name, brand: it.brand, price_cents: it.price_cents, image_url: it.image_url, retailer: it.retailer, purchase_date: it.purchase_date, return_by: it.return_by } });
      if (c.costUsd > maxCost) { aborted = true; emit({ type: 'error', message: `Stopped: model spend passed $${maxCost.toFixed(2)} for this scan`, counters: { ...c } }); }
    } catch (err) {
      c.failed++;
      await admin.from('email_records').upsert({ ...record, status: 'failed' });
      emit({ type: 'progress', counters: { ...c }, subject: email.subject });
      console.warn('[ingest] failed', email.id, err instanceof Error ? err.message : err);
    }
  };

  if (mode === 'gmail') {
    await mapLimit(ids, 4, async (id) => {
      if (aborted) return;
      let msg: GmailMessage;
      try { msg = await getMessage(token!, id); }
      catch (err) { c.failed++; console.warn('[ingest] fetch failed', id, err instanceof Error ? err.message : err); return; }
      await processOne(msg);
    });
  } else {
    await mapLimit(emails, 3, async (e) => { await processOne(e); });
  }

  emit({ type: 'done', counters: { ...c }, mode, elapsedMs: Date.now() - started });
  return c;
}
