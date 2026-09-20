import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Page, PageHeader, Card, CardTitle, SectionTitle, Stat, StatGrid, Row, Note, Badge, Empty, usd } from '@/components/ui';
import { IconSearch } from '@/components/icons';
import { summarizeKept } from '@weave/shared/kept';
import type { Hold } from '@weave/shared/types';
import { GhostActions } from './GhostActions';

export const dynamic = 'force-dynamic';

const OUTCOME: Record<string, string> = { skipped: 'Voided', borrowed: 'Borrowed instead', bought_used: 'Bought used', bought: 'Bought anyway', released: 'Expired, unanswered', held: 'Paused' };
const OUTCOME_TONE: Record<string, 'save' | 'pine' | 'neutral'> = { skipped: 'save', borrowed: 'save', bought_used: 'save', bought: 'neutral', released: 'neutral', held: 'neutral' };

export default async function GhostsPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from('holds').select('*').order('created_at', { ascending: false });
  const holds = (data ?? []) as Hold[];
  const pending = holds.filter((h) => h.status === 'held');
  const done = holds.filter((h) => h.status !== 'held');
  const kept = summarizeKept({ holds: holds.map((h) => ({ id: h.id, status: h.status, priceCents: h.price_cents > 0 ? h.price_cents : null, actualPaidCents: h.actual_paid_cents, outcomeConfirmedAt: h.outcome_confirmed_at })), returns: [] });
  const now = Date.now();
  const footnote = '*Estimated against confirmed purchase intentions. Never a bank balance.';

  if (holds.length === 0) {
    return (
      <Page>
        <PageHeader title="The clothes you almost owned" subtitle="Every purchase you pause or skip lands here with the intended price, what stood in for it, and the outcome." />
        <StatGrid>
          <Stat value="0" label="paused" />
          <Stat value="0" label="confirmed outcomes" />
          <Stat value="$0.00" label="estimated Money Kept*" tone="pine" />
        </StatGrid>
        <Empty icon={IconSearch} title="Nothing here yet." body="Search before you buy. Skipping or holding a purchase prints an intention here." href="/search" />
        <Note>{footnote}</Note>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader title="The clothes you almost owned" subtitle={`${holds.length} purchase intention${holds.length === 1 ? '' : 's'}. Pending holds are potential only; confirmed outcomes count.`} />

      <StatGrid>
        <Stat value={pending.length} label="paused, waiting on you" />
        <Stat value={kept.actionsCount} label="confirmed outcomes" />
        <Stat value={usd(kept.keptCents)} label="estimated Money Kept*" tone="pine" valueClass={kept.keptCents > 0 ? 'saved' : ''} />
      </StatGrid>

      <Card>
        <CardTitle hint={footnote}>Breakdown</CardTitle>
        <Row label="Potential, not yet kept" value={usd(kept.potentialKeptCents)} muted />
        <Row label="Skipped / wore mine" value={usd(kept.byOutcome.skipped)} />
        <Row label="Borrowed instead" value={usd(kept.byOutcome.borrowed)} />
        <Row label="Bought used" value={usd(kept.byOutcome.boughtUsed)} />
        {kept.unpricedActions > 0 && <Row label="Without a price (not counted)" value={String(kept.unpricedActions)} muted />}
        <Row label="Estimated Money Kept*" value={usd(kept.keptCents)} valueClass={kept.keptCents > 0 ? 'saved' : ''} />
      </Card>

      {pending.length > 0 && (
        <section>
          <SectionTitle hint="Waiting on you">Paused</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((h) => {
              const hrs = h.release_at ? Math.round((new Date(h.release_at).getTime() - now) / 3600000) : null;
              return (
                <Card key={h.id} tone="paper">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 truncate text-sm font-medium">{h.title}</div>
                    <div className="flex shrink-0 gap-1">{h.for_other && <Badge>For someone else</Badge>}<Badge>Paused</Badge></div>
                  </div>
                  <div className="mt-2">
                    <Row label="Intended" value={h.price_cents > 0 ? usd(h.price_cents) : 'No price'} />
                    <Row label="Next check" value={hrs == null ? '—' : hrs <= 0 ? 'Now' : `In ${hrs}h`} muted />
                    <Row label="Potential kept" value={h.price_cents > 0 ? usd(h.price_cents) : '—'} muted />
                  </div>
                  {h.loan_id
                    ? <Note className="mt-3">Waiting on the loan. Credited when the item is handed over. <Link href="/friends" className="underline">Friends</Link></Note>
                    : <GhostActions id={h.id} priceCents={h.price_cents} />}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <SectionTitle hint="Confirmed outcomes">Stubs</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {done.map((h) => (
              <Card key={h.id} tone="paper" className={h.status === 'bought' ? 'opacity-70' : ''}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium"><span className={h.status === 'skipped' || h.status === 'borrowed' ? 'line-through decoration-2' : ''}>{h.title}</span></div>
                    <div className="mt-0.5 text-xs text-ink-3">{h.created_at.slice(0, 10)}{h.query ? ` · ${h.query}` : ''}{h.note ? ` · ${h.note}` : ''}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">{h.for_other && <Badge>For someone else</Badge>}<Badge tone={h.kept_cents > 0 ? 'save' : OUTCOME_TONE[h.status] === 'save' ? 'pine' : 'neutral'}>{OUTCOME[h.status] ?? h.status}</Badge></div>
                </div>
                <div className="mt-2">
                  <Row label="Intended" value={h.price_cents > 0 ? usd(h.price_cents) : 'No price'} />
                  {h.actual_paid_cents != null && <Row label="Paid" value={usd(h.actual_paid_cents)} />}
                  {h.status !== 'bought' && <Row label="Money kept" value={h.price_cents > 0 ? usd(h.kept_cents) : 'Not counted'} valueClass={h.kept_cents > 0 ? 'saved' : ''} />}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}
