import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
import type { Transaction } from '@weave/shared/types';
import { ChargeActions } from './ChargeActions';
import { ChargesLive } from './ChargesLive';
import { PushEnable } from '@/components/PushEnable';

export const dynamic = 'force-dynamic';

export default async function ChargesPage() {
  const { supabase, user } = await requireUser();
  const admin = createAdminClient();
  const [{ data: txs }, { data: linked }] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    admin ? admin.from('plaid_items').select('institution,last_sync_at,created_at').eq('user_id', user.id) : Promise.resolve({ data: [] }),
  ]);
  const all = (txs ?? []) as Transaction[];
  const accounts = (linked ?? []) as Array<{ institution: string | null; last_sync_at: string | null; created_at: string }>;
  // Likely clothing, by Plaid category or store name, with no item yet.
  const todo = all.filter((t) => t.is_clothing && t.decision !== 'not_clothes' && t.item_ids.length === 0 && t.match_status !== 'skipped');
  const done = all.filter((t) => t.is_clothing && t.item_ids.length > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Receipt>
        <ReceiptHeader title="Charges" subtitle={accounts.length ? `${accounts.length} CARD${accounts.length === 1 ? '' : 'S'} LINKED` : 'NO CARD LINKED'} />
        <ReceiptRule />
        {accounts.map((a, i) => <ReceiptLine key={i} label={(a.institution ?? 'CARD').toUpperCase()} value={a.last_sync_at ? `SYNCED ${a.last_sync_at.slice(0, 10)}` : 'LINKED'} muted />)}
        <div className={accounts.length ? 'mt-2' : ''}><ChargesLive userId={user.id} linked={accounts.length} /></div>
        <div className="mt-2"><PushEnable compact /></div>
      </Receipt>

      <Receipt>
        <ReceiptHeader title="Likely clothing" subtitle={todo.length ? `${todo.length} TO ADD` : 'NOTHING WAITING'} />
        <ReceiptRule />
        {todo.length === 0 && <div className="mono text-[11px] text-ink-3">{all.length ? 'EVERY CLOTHING CHARGE HAS DETAILS.' : 'LINK A CARD TO START.'}</div>}
        <div className="divide-y divide-dashed divide-rule">
          {todo.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm">{t.merchant}</div>
                <div className="mono text-[10px] text-ink-3">{t.date}{t.source === 'mock' ? ' · DEMO' : ''}</div>
              </div>
              <div className="mono text-sm">{usd(t.amount_cents)}</div>
              <ChargeActions txId={t.id} />
            </div>
          ))}
        </div>
      </Receipt>

      {done.length > 0 && (
        <Receipt>
          <ReceiptHeader title="Added" />
          <ReceiptRule />
          {done.slice(0, 15).map((t) => <ReceiptLine key={t.id} label={<Link href={`/wardrobe/${t.item_ids[0]}`} className="hover:underline">{`${t.date} · ${(t.merchant ?? '').slice(0, 24)}`}</Link>} value={usd(t.amount_cents)} muted />)}
        </Receipt>
      )}
    </div>
  );
}
