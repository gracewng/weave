'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { printReceipt } from '@/lib/printer';

/** New clothing charge → receipt prints (in-app banner; web push lands in Phase 10). Also hosts Link + sync buttons. */
export function ChargesLive({ userId, linked }: { userId: string; linked: number }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState('');
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel('charges-live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (p) => {
      const row = p.new as { user_id: string; merchant: string; amount_cents: number; is_clothing: boolean; match_status: string };
      if (row.user_id !== userId || !row.is_clothing) return;
      if (row.match_status === 'unmatched') printReceipt({ title: 'New clothing charge', subtitle: row.merchant.toUpperCase().slice(0, 28), lines: [{ label: 'AMOUNT', value: `$${(row.amount_cents / 100).toFixed(2)}` }, { label: 'NO RECEIPT EMAIL', value: 'SNAP IT?', muted: true }], footer: 'KEEP · RETURNING · NOT CLOTHES · FOR SOMEONE ELSE', ttlMs: 8000 });
      router.refresh();
    }).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [userId, router]);

  async function post(path: string) { const r = await fetch(path, { method: 'POST' }); const j = await r.json(); if (!r.ok) throw new Error(j.error ?? r.statusText); return j; }
  const linkSandbox = () => start(async () => { try { const j = await post('/api/plaid/sync?sandbox=1'); setMsg(`LINKED PLAID SANDBOX · ${j.added} CHARGES · ${j.clothing} CLOTHING`); router.refresh(); } catch (e) { setMsg(String(e instanceof Error ? e.message : e)); } });
  const sync = () => start(async () => { try { const j = await post('/api/plaid/sync'); setMsg(`SYNCED · ${j.added} NEW · ${j.clothing} CLOTHING`); router.refresh(); } catch (e) { setMsg(String(e instanceof Error ? e.message : e)); } });
  const linkReal = () => start(async () => {
    try {
      const { link_token } = await post('/api/plaid/link-token');
      await new Promise<void>((res, rej) => { if ((window as unknown as { Plaid?: unknown }).Plaid) return res(); const s = document.createElement('script'); s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'; s.onload = () => res(); s.onerror = () => rej(new Error('Plaid Link failed to load')); document.head.appendChild(s); });
      const Plaid = (window as unknown as { Plaid: { create: (o: { token: string; onSuccess: (t: string, m: { institution?: { name?: string } }) => void }) => { open: () => void } } }).Plaid;
      Plaid.create({ token: link_token, onSuccess: async (public_token, meta) => { const r = await fetch('/api/plaid/exchange', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ public_token, institution: meta.institution?.name ?? null }) }); const j = await r.json(); setMsg(r.ok ? `LINKED · ${j.added} CHARGES · ${j.clothing} CLOTHING` : j.error); router.refresh(); } }).open();
    } catch (e) { setMsg(String(e instanceof Error ? e.message : e)); }
  });
  return (
    <div className="mono flex flex-wrap items-center gap-2 text-[10px] uppercase text-ink-3">
      <span>{linked ? `${linked} ACCOUNT${linked === 1 ? '' : 'S'} LINKED` : 'NO CARD LINKED'}</span>
      <button className="btn !py-1 !text-[10px]" disabled={busy} onClick={linkReal}>Link a card (Plaid sandbox)</button>
      <button className="btn !py-1 !text-[10px]" disabled={busy} onClick={linkSandbox} title="Skips the Link UI using Plaid's test bank">Link test bank (demo)</button>
      {linked > 0 && <button className="btn !py-1 !text-[10px]" disabled={busy} onClick={sync}>Sync</button>}
      {msg && <span className="normal-case">{msg}</span>}
    </div>
  );
}
