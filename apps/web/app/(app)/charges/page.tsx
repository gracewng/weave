import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { Page, PageHeader, Card, CardTitle, Row, Badge, usd } from '@/components/ui';
import { PrintedTape, TapeHeader, TapeRule, TapeLine } from '@/components/Tape';
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
  const todo = all.filter((t) => t.is_clothing && t.decision !== 'not_clothes' && t.item_ids.length === 0 && t.match_status !== 'skipped');
  const done = all.filter((t) => t.is_clothing && t.item_ids.length > 0);
  const lastSync = accounts.map((a) => a.last_sync_at).filter(Boolean).sort().pop() ?? null;
  const waitingCents = todo.reduce((s, t) => s + (t.amount_cents ?? 0), 0);

  if (accounts.length === 0 && all.length === 0) {
    return (
      <Page>
        <PageHeader title="Charges" />
        <Card tone="sprout" className="max-w-xl">
          <CardTitle>Link a card</CardTitle>
          <p className="mb-4 text-sm text-ink-2">Clothing charges show up here. Add details once and each becomes an item.</p>
          <ChargesLive userId={user.id} linked={0} hero />
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Charges"
        subtitle={`${accounts.length} card${accounts.length === 1 ? '' : 's'}${lastSync ? ` · synced ${lastSync.slice(5, 10).replace('-', '/')}` : ''}`}
        actions={<ChargesLive userId={user.id} linked={accounts.length} />}
      />

      <div className="mx-auto w-full max-w-2xl">
        <PrintedTape>
          <TapeHeader title="To add" subtitle={todo.length ? `${todo.length} charge${todo.length === 1 ? '' : 's'} · ${usd(waitingCents)}` : 'Nothing waiting'} />
          <TapeRule />
          {todo.length === 0 && <div className="py-3 text-center text-[11px] text-ink-3">Every clothing charge has details.</div>}
          {todo.map((t, i) => (
            <div key={t.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 py-3 ${i > 0 ? 'border-t border-dashed border-ink/20' : ''}`}>
              <div className="min-w-0 flex-1">
                <div className="truncate font-sans text-[15px]">{t.merchant}</div>
                <div className="text-[11px] text-ink-3">{t.date}{t.source === 'mock' && <Badge className="ml-2 !font-mono">demo</Badge>}</div>
              </div>
              <div className="text-base font-semibold tabular-nums">{usd(t.amount_cents)}</div>
              <ChargeActions txId={t.id} />
            </div>
          ))}
        </PrintedTape>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card tone="paper">
          <CardTitle>Added</CardTitle>
          {done.length === 0 && <div className="text-sm text-ink-3">None yet.</div>}
          {done.slice(0, 15).map((t) => <Row key={t.id} label={<Link href={`/wardrobe/${t.item_ids[0]}`} className="hover:underline">{`${t.date} · ${(t.merchant ?? '').slice(0, 28)}`}</Link>} value={usd(t.amount_cents)} muted />)}
        </Card>
        <Card tone="paper">
          <CardTitle action={<PushEnable compact />}>Cards</CardTitle>
          {accounts.map((a, i) => <Row key={i} label={a.institution ?? 'Card'} value={a.last_sync_at ? `synced ${a.last_sync_at.slice(0, 10)}` : 'linked'} muted />)}
        </Card>
      </div>
    </Page>
  );
}
