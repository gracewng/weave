import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { Page, PageHeader, Card, CardTitle, SectionTitle, Stat, StatGrid, Row, Note, Badge, Empty, usd } from '@/components/ui';
import { IconCard } from '@/components/icons';
import { summarizeCoverage } from '@weave/shared/coverage';
import type { Transaction } from '@weave/shared/types';
import { ChargeActions } from './ChargeActions';
import { ChargesLive } from './ChargesLive';
import { PushEnable } from '@/components/PushEnable';

export const dynamic = 'force-dynamic';

export default async function ChargesPage() {
  const { supabase, user } = await requireUser();
  const admin = createAdminClient();
  const [{ data: txs }, { data: emailItems }, { data: linked }] = await Promise.all([
    supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    supabase.from('items').select('retailer,purchase_date,receipt_url').eq('user_id', user.id).eq('source', 'email').not('purchase_date', 'is', null),
    admin ? admin.from('plaid_items').select('item_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
  ]);
  const all = (txs ?? []) as Transaction[];
  const clothing = all.filter((t) => t.is_clothing && t.decision !== 'not_clothes');
  const fresh = clothing.filter((t) => t.match_status === 'unmatched');
  const mystery = clothing.filter((t) => t.match_status === 'mystery');
  const matched = clothing.filter((t) => t.match_status === 'matched' || t.match_status === 'captured');
  const emailOrders = [...new Set(((emailItems ?? []) as Array<{ retailer: string | null; purchase_date: string }>).map((i) => `${i.retailer ?? ''}|${i.purchase_date}`))].map((k) => ({ key: k, date: k.split('|')[1]! }));
  const dates = [...all.map((t) => t.date ?? ''), ...emailOrders.map((e) => e.date)].filter(Boolean).sort();
  const cov = summarizeCoverage({
    periodStart: dates[0] ?? '1970-01-01', periodEnd: dates[dates.length - 1] ?? '2999-12-31',
    transactions: all.map((t) => ({ id: t.id, date: t.date ?? '', isClothing: t.is_clothing, matchStatus: t.match_status, decision: t.decision, hasReceipt: (t.item_ids?.length ?? 0) > 0 })),
    emailOrders,
  });
  const segments = 40;
  const bar = cov.detected ? Math.round((cov.ratio ?? 0) * segments) : 0;

  return (
    <Page>
      <PageHeader title="Charges" subtitle="The card is the source of truth. Charges with a matching receipt email resolve on their own; the rest ask one question." />

      <Card>
        <ChargesLive userId={user.id} linked={(linked ?? []).length} />
        <div className="mt-3"><PushEnable compact /></div>
      </Card>

      <StatGrid>
        <Stat value={fresh.length} label="new charges to confirm" />
        <Stat value={mystery.length} label="mystery purchases" />
        <Stat value={matched.length} label="matched to receipts" />
      </StatGrid>

      <Card>
        <CardTitle hint={cov.detected ? `${dates[0]} to ${dates[dates.length - 1]}` : undefined}>Closet Coverage</CardTitle>
        {cov.ratio == null ? (
          <p className="text-sm text-ink-2">Not enough purchase history. Link a card or scan your inbox to start.</p>
        ) : (
          <>
            <p className="text-sm"><span className="display text-2xl font-semibold text-pine">{Math.round(cov.ratio * 100)}%</span><span className="ml-2 text-ink-2">{cov.resolved} of {cov.detected} purchase records resolved</span></p>
            <div className="mt-3 flex gap-1" aria-hidden>
              {Array.from({ length: segments }).map((_, i) => <span key={i} className="h-3 flex-1 rounded-full" style={{ background: i < bar ? 'var(--fern)' : 'var(--dust)' }} />)}
            </div>
            <Note className="mt-3">{cov.unresolved} unresolved, including {cov.missingReceipts} missing receipts. Answering “not clothes” removes a record from the total.</Note>
          </>
        )}
      </Card>

      {fresh.length > 0 && (
        <section>
          <SectionTitle hint="one question each">New</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {fresh.map((t) => (
              <Card key={t.id} tone="sprout">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><div className="truncate text-sm font-medium">{t.merchant}</div><div className="mt-0.5 text-xs text-ink-2">{t.date} · no matching receipt email</div></div>
                  <div className="flex shrink-0 items-center gap-2">{t.source === 'mock' && <Badge tone="warn">Demo charge</Badge>}<span className="display text-lg font-semibold text-pine">{usd(t.amount_cents)}</span></div>
                </div>
                <ChargeActions txId={t.id} merchant={t.merchant ?? ''} amountCents={t.amount_cents ?? 0} decision={t.decision} kind="new" />
              </Card>
            ))}
          </div>
        </section>
      )}

      {mystery.length > 0 && (
        <section>
          <SectionTitle hint="what was it?">Mystery purchases</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {mystery.slice(0, 8).map((t) => (
              <Card key={t.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 text-sm">You spent <span className="font-medium">{usd(t.amount_cents)}</span> at {t.merchant}</div>
                  <span className="shrink-0 text-xs text-ink-3">{t.date}</span>
                </div>
                <div className="mt-2 h-3 w-2/3 rounded-full bg-paper" aria-hidden />
                <Note className="mt-1">The item line stays blank until you fill it in.</Note>
                <ChargeActions txId={t.id} merchant={t.merchant ?? ''} amountCents={t.amount_cents ?? 0} decision={t.decision} kind="mystery" />
              </Card>
            ))}
          </div>
          {mystery.length > 8 && <Note className="mt-2">{mystery.length - 8} more</Note>}
        </section>
      )}

      {matched.length > 0 && (
        <Card tone="paper">
          <CardTitle hint="charge and receipt">Matched</CardTitle>
          {matched.slice(0, 12).map((t) => <Row key={t.id} label={`${t.date} · ${(t.merchant ?? '').slice(0, 32)}`} value={`${usd(t.amount_cents)} · ${t.match_status === 'captured' ? 'snapped' : `${t.item_ids.length} item${t.item_ids.length === 1 ? '' : 's'}`}`} muted />)}
        </Card>
      )}

      {all.length === 0 && <Empty icon={IconCard} title="No charges yet." body={<>Link a card and every clothing charge shows up here. Or start from your <Link href="/wardrobe" className="underline">wardrobe</Link>.</>} />}
    </Page>
  );
}
