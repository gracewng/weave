import 'server-only';

const API = 'https://gmail.googleapis.com/gmail/v1/users/me';

export class GmailError extends Error {
  constructor(message: string, public status?: number) { super(message); this.name = 'GmailError'; }
}

export interface GmailMessage {
  id: string;
  from: string;
  subject: string;
  /** ISO date */
  date: string;
  html: string | null;
  text: string | null;
}

/** The spec's query: 3 years of order/receipt mail, minus shipping/delivery updates. */
export const ORDER_QUERY =
  'newer_than:3y (category:purchases OR subject:(order OR receipt OR "order confirmation" OR "your purchase")) -subject:(shipped OR "out for delivery" OR delivered)';

async function gfetch<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    const msg = body.error?.message ?? res.statusText;
    if (res.status === 403 && /Gmail API has not been used|is disabled/i.test(msg)) {
      throw new GmailError('Gmail API is not enabled on the Google Cloud project that owns the OAuth client. Enable it and retry.', 403);
    }
    if (res.status === 403 && /insufficient/i.test(msg)) {
      throw new GmailError('Google did not grant the gmail.readonly scope. Sign out and sign in again (the consent screen must list the scope).', 403);
    }
    throw new GmailError(`${res.status} ${msg}`, res.status);
  }
  return (await res.json()) as T;
}

export async function listMessageIds(token: string, q: string, max: number): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  while (ids.length < max) {
    const params = new URLSearchParams({ q, maxResults: String(Math.min(100, max - ids.length)) });
    if (pageToken) params.set('pageToken', pageToken);
    const page = await gfetch<{ messages?: Array<{ id: string }>; nextPageToken?: string }>(token, `/messages?${params}`);
    for (const m of page.messages ?? []) ids.push(m.id);
    if (!page.nextPageToken || !page.messages?.length) break;
    pageToken = page.nextPageToken;
  }
  return ids.slice(0, max);
}

interface Part { mimeType?: string; body?: { data?: string; size?: number }; parts?: Part[]; headers?: Array<{ name: string; value: string }> }

function b64url(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function collect(part: Part | undefined, out: { html: string[]; text: string[] }) {
  if (!part) return;
  if (part.body?.data) {
    if (part.mimeType === 'text/html') out.html.push(b64url(part.body.data));
    else if (part.mimeType === 'text/plain') out.text.push(b64url(part.body.data));
  }
  for (const p of part.parts ?? []) collect(p, out);
}

export async function getMessage(token: string, id: string): Promise<GmailMessage> {
  const msg = await gfetch<{ id: string; internalDate?: string; payload?: Part }>(token, `/messages/${id}?format=full`);
  const headers = msg.payload?.headers ?? [];
  const h = (n: string) => headers.find((x) => x.name.toLowerCase() === n)?.value ?? '';
  const out = { html: [] as string[], text: [] as string[] };
  collect(msg.payload, out);
  const date = msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : new Date(h('date') || Date.now()).toISOString();
  return { id: msg.id, from: h('from'), subject: h('subject'), date, html: out.html[0] ?? null, text: out.text[0] ?? null };
}
