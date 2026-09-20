import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Page, PageHeader, Card, CardTitle, SectionTitle, Stat, StatGrid, Row, Note, Badge, Empty, usd } from '@/components/ui';
import { IconReturn } from '@/components/icons';
import { returnBoard } from '@/lib/returns';
import { ReturnActions } from './ReturnActions';

export const dynamic = 'force-dynamic';

export default async function ReturnsPage() {
  const { supabase, user } = await requireUser();
  const { open, pending, recovered } = await returnBoard(supabase, user.id);
  const atStake = open.reduce((s, r) => s + r.atStakeCents, 0);
  const recoveredCents = recovered.reduce((s, i) => s + (i.refund_cents ?? 0), 0);
  const empty = open.length === 0 && pending.length === 0 && recovered.length === 0;

  return (
    <Page>
      <PageHeader title="Returns" subtitle="Three different states: open, pending, refunded. Money Recovered counts confirmed refunds only." />

      <StatGrid cols={4}>
        <Stat value={open.length} label="return windows open" />
        <Stat value={usd(atStake)} label="at stake" />
        <Stat value={pending.length} label="returns pending" />
        <Stat value={usd(recoveredCents)} label={`recovered · ${recovered.length} refund${recovered.length === 1 ? '' : 's'}`} valueClass={recoveredCents > 0 ? 'saved' : ''} />
      </StatGrid>

      {open.length > 0 && (
        <section>
          <SectionTitle hint="soonest first">Open windows</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {open.map((r) => (
              <Card key={r.item.id}>
                <div className="flex gap-4">
                  <Link href={`/wardrobe/${r.item.id}`} className="h-24 w-[72px] shrink-0 overflow-hidden rounded-xl bg-paper">{r.item.image_url && <img src={r.item.image_url} alt="" className="h-full w-full object-contain" />}</Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/wardrobe/${r.item.id}`} className="truncate text-sm font-medium hover:underline">{r.item.name}</Link>
                      <Badge tone={r.daysLeft <= 4 ? 'warn' : 'neutral'}>{r.daysLeft === 0 ? 'Last day' : `${r.daysLeft} day${r.daysLeft === 1 ? '' : 's'} left`}</Badge>
                    </div>
                    <Row label="At stake" value={usd(r.atStakeCents)} />
                    <Row label="Return by" value={`${r.item.return_by}${r.policyDays != null ? ` · ${r.item.retailer ?? ''} ${r.policyDays}-day policy` : r.item.retailer ? ` · ${r.item.retailer}` : ''}`} muted />
                    <Row label="Receipt" value={r.item.receipt_url ? 'On file' : r.item.source === 'email' ? 'Order email' : 'Not on file'} muted />
                  </div>
                </div>
                <ReturnActions itemId={r.item.id} name={r.item.name} priceCents={r.item.price_cents} status="owned" />
              </Card>
            ))}
          </div>
        </section>
      )}

      {pending.length > 0 && (
        <section>
          <SectionTitle hint="nothing recovered yet">Return pending</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pending.map((i) => (
              <Card key={i.id}>
                <div className="flex items-start justify-between gap-2"><div className="truncate text-sm font-medium">{i.name}</div><Badge tone="pine">Return pending</Badge></div>
                <Row label="Paid" value={usd(i.price_cents)} />
                <Row label="Started" value={(i.return_initiated_at ?? '').slice(0, 10)} muted />
                <ReturnActions itemId={i.id} name={i.name} priceCents={i.price_cents} status="returning" />
              </Card>
            ))}
          </div>
        </section>
      )}

      {recovered.length > 0 && (
        <section>
          <SectionTitle>Refund confirmed</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recovered.map((i) => (
              <Card key={i.id} tone="paper">
                <div className="flex items-start justify-between gap-2"><div className="truncate text-sm text-ink-3 line-through">{i.name}</div><Badge tone="save">Refund confirmed</Badge></div>
                <Row label="Paid" value={usd(i.price_cents)} muted />
                <Row label="Recovered" value={usd(i.refund_cents)} valueClass="saved" />
                <Row label="On" value={(i.refunded_at ?? '').slice(0, 10)} muted />
              </Card>
            ))}
          </div>
        </section>
      )}

      {empty && <Empty icon={IconReturn} title="No open return windows." body="Items you buy show up here until their window closes, sorted by days left, with the dollars at stake." />}

      <Card tone="paper">
        <CardTitle>How this counts</CardTitle>
        <Note>A reminder is not a return. A return is not a refund. Only a refund you confirm, net of fees, counts as Money Recovered.</Note>
      </Card>
    </Page>
  );
}
