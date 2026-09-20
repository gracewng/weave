'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { openPlaidLink } from '@/lib/plaid-link';
import { createClient } from '@/lib/supabase/client';
import { printReceipt } from '@/lib/printer';

/** New clothing charge → snackbar (in-app; web push is separate). Also hosts Link + sync buttons. */
export function ChargesLive({ userId, linked }: { userId: string; linked: number }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState('');
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel('charges-live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (p) => {
      const row = p.new as { user_id: string; merchant: string; amount_cents: number; is_clothing: boolean; match_status: string };
      if (row.user_id !== userId || !row.is_clothing) return;
      if (row.match_status === 'unmatched') printReceipt({ title: 'New clothing charge', subtitle: row.merchant.slice(0, 28), lines: [{ label: 'Amount', value: `$${(row.amount_cents / 100).toFixed(2)}` }, { label: 'No receipt email', value: 'Snap it?', muted: true }], footer: 'Keep · Returning · Not clothes · For someone else', ttlMs: 8000 });
      router.refresh();
    }).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [userId, router]);

  async function post(path: string) { const r = await fetch(path, { method: 'POST' }); const j = await r.json(); if (!r.ok) throw new Error(j.error ?? r.statusText); return j; }
  const linkSandbox = () => start(async () => { try { const j = await post('/api/plaid/sync?sandbox=1'); setMsg(`Linked Plaid sandbox · ${j.added} charges · ${j.clothing} clothing`); router.refresh(); } catch (e) { setMsg(String(e instanceof Error ? e.message : e)); } });
  const sync = () => start(async () => { try { const j = await post('/api/plaid/sync'); setMsg(`Synced · ${j.added} new · ${j.clothing} clothing`); router.refresh(); } catch (e) { setMsg(String(e instanceof Error ? e.message : e)); } });
  const linkReal = () => start(async () => {
    try { const r = await openPlaidLink(); if (r) { setMsg(`Linked · ${r.added} charges · ${r.clothing} clothing`); router.refresh(); } }
    catch (e) { setMsg(String(e instanceof Error ? e.message : e)); }
  });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-2 text-sm font-medium">{linked ? `${linked} account${linked === 1 ? '' : 's'} linked` : 'No card linked'}</span>
      <button className="btn btn-sm btn-primary" disabled={busy} onClick={linkReal}>Link a card (Plaid sandbox)</button>
      <button className="btn btn-sm" disabled={busy} onClick={linkSandbox} title="Skips the Link UI using Plaid's test bank">Link test bank (demo)</button>
      {linked > 0 && <button className="btn btn-sm btn-outline" disabled={busy} onClick={sync}>Sync</button>}
      {msg && <span className="text-xs text-ink-3">{msg}</span>}
    </div>
  );
}
