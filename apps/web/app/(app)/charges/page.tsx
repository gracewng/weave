import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { Page, PageHeader, Card, CardTitle, Row, Note, Badge, Stat, StatGrid, usd } from '@/components/ui';
import { IconCard } from '@/components/icons';
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

  // First visit: one job, link a card.
  if (accounts.length === 0 && all.length === 0) {
    return (
      <Page>
        <PageHeader title="Charges" subtitle="Card purchases with no order email still become items." icon={IconCard} />
        <Card tone="sprout" className="max-w-2xl">
          <CardTitle>Link a card to start</CardTitle>
          <p className="mb-4 text-sm text-ink-2">Weave keeps only the store, amount and date of each charge, flags the ones that look like clothing, and asks you for details once.</p>
          <ChargesLive userId={user.id} linked={0} hero />
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Charges"
        subtitle={`${accounts.length} card${accounts.length === 1 ? '' : 's'} linked${lastSync ? ` · synced ${lastSync.slice(0, 10)}` : ''}`}
        icon={IconCard}
        actions={<ChargesLive userId={user.id} linked={accounts.length} />}
      />

      <StatGrid>
        <Stat value={todo.length} label={todo.length === 1 ? 'charge needs details' : 'charges need details'} tone={todo.length ? 'sprout' : 'mist'} />
        <Stat value={usd(waitingCents)} label="waiting to be added" />
        <Stat value={done.length} label="added to your wardrobe" />
      </StatGrid>

      <Card>
        <CardTitle hint={todo.length ? 'Likely clothing, by store or category. Add details and it becomes an item.' : 'Every clothing charge has details.'}>Needs details</CardTitle>
        {todo.length === 0 && <Note>Nothing waiting. New charges show up here as they sync.</Note>}
        <div className="divide-y divide-dust/60">
          {todo.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{t.merchant}</div>
                <div className="text-xs text-ink-3">{t.date}{t.source === 'mock' && <Badge className="ml-2">demo</Badge>}</div>
              </div>
              <div className="display text-base tabular-nums">{usd(t.amount_cents)}</div>
              <ChargeActions txId={t.id} />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card tone="paper">
          <CardTitle>Added</CardTitle>
          {done.length === 0 && <Note>Charges you add details to land here.</Note>}
          {done.slice(0, 15).map((t) => <Row key={t.id} label={<Link href={`/wardrobe/${t.item_ids[0]}`} className="hover:underline">{`${t.date} · ${(t.merchant ?? '').slice(0, 28)}`}</Link>} value={usd(t.amount_cents)} muted />)}
        </Card>
        <Card tone="paper">
          <CardTitle hint="One push when a clothing charge lands">Cards</CardTitle>
          {accounts.map((a, i) => <Row key={i} label={a.institution ?? 'Card'} value={a.last_sync_at ? `synced ${a.last_sync_at.slice(0, 10)}` : 'linked'} muted />)}
          <div className="mt-3"><PushEnable compact /></div>
        </Card>
      </div>
    </Page>
  );
}
