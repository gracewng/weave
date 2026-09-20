'use client';
/* Opens Plaid Link in the browser and exchanges the public token. Resolves with the first sync summary. */
type PlaidLink = { create: (o: { token: string; onSuccess: (t: string, m: { institution?: { name?: string } }) => void; onExit: (err: unknown) => void }) => { open: () => void } };

async function post(url: string, body?: unknown) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? r.statusText);
  return j as { added: number; clothing: number; link_token?: string };
}

function loadScript(): Promise<PlaidLink> {
  const w = window as unknown as { Plaid?: PlaidLink };
  if (w.Plaid) return Promise.resolve(w.Plaid);
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    s.onload = () => (w.Plaid ? res(w.Plaid) : rej(new Error('Plaid Link failed to load')));
    s.onerror = () => rej(new Error('Plaid Link failed to load'));
    document.head.appendChild(s);
  });
}

/* Resolves null if the user closes Link without connecting. */
export async function openPlaidLink(): Promise<{ added: number; clothing: number } | null> {
  const { link_token } = await post('/api/plaid/link-token');
  const Plaid = await loadScript();
  return new Promise((res, rej) => {
    Plaid.create({
      token: link_token!,
      onSuccess: (public_token, meta) => post('/api/plaid/exchange', { public_token, institution: meta.institution?.name ?? null }).then(res, rej),
      onExit: () => res(null),
    }).open();
  });
}

/* Demo shortcut: Plaid's sandbox test bank, no Link UI. */
export function linkTestBank() { return post('/api/plaid/sync?sandbox=1'); }
