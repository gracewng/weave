'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { printReceipt } from '@/lib/printer';
import { openPlaidLink, linkTestBank } from '@/lib/plaid-link';
import { Icon } from '@/components/Icon';

/** New clothing charge → snackbar + refresh. Also the Link / Test bank / Sync buttons; `hero` makes them the page's main call to action. */
export function ChargesLive({ userId, linked, hero = false }: { userId: string; linked: number; hero?: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState('');
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel('charges-live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (p) => {
      const row = p.new as { user_id: string; merchant: string; amount_cents: number; is_clothing: boolean; match_status: string };
      if (row.user_id !== userId || !row.is_clothing) return;
      if (row.match_status === 'unmatched') printReceipt({ title: 'New clothing charge', subtitle: row.merchant.slice(0, 28), lines: [{ label: 'Amount', value: `$${(row.amount_cents / 100).toFixed(2)}` }], footer: 'Add details when you have a minute', ttlMs: 8000 });
      router.refresh();
    }).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [userId, router]);

  const run = (fn: () => Promise<{ added: number; clothing: number } | null>, done: (r: { added: number; clothing: number }) => string) => start(async () => {
    try { const r = await fn(); if (r) { setMsg(done(r)); router.refresh(); } } catch (e) { setMsg(String(e instanceof Error ? e.message : e)); }
  });
  const link = () => run(openPlaidLink, (r) => `Linked · ${r.added} charges, ${r.clothing} look like clothing`);
  const test = () => run(linkTestBank, (r) => `Test bank linked · ${r.added} charges, ${r.clothing} look like clothing`);
  const sync = () => run(async () => { const res = await fetch('/api/plaid/sync', { method: 'POST' }); const j = await res.json(); if (!res.ok) throw new Error(j.error ?? res.statusText); return j; }, (r) => `Synced · ${r.added} new, ${r.clothing} clothing`);

  if (hero) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary !px-7 !py-3 !text-sm" disabled={busy} onClick={link}><Icon name="link" size={14} />Link a card</button>
        <button className="btn btn-outline" disabled={busy} onClick={test} title="Plaid's sandbox bank, no login">Try the test bank</button>
        {msg && <span className="w-full text-xs text-ink-2">{msg}</span>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      {linked > 0 && <button className="btn btn-sm" disabled={busy} onClick={sync}><Icon name="refresh" size={12} />Sync</button>}
      <button className="btn-icon" disabled={busy} onClick={link} title="Link a card" aria-label="Link a card"><Icon name="link" size={16} /></button>
      {msg && <span className="text-xs text-ink-2">{msg}</span>}
    </div>
  );
}
