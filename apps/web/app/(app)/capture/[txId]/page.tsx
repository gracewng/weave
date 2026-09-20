import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Page, PageHeader, Card, Row, Note, Badge, usd } from '@/components/ui';
import { CaptureForm } from './CaptureForm';
import type { Transaction } from '@weave/shared/types';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, string> = { unmatched: 'Unmatched', mystery: 'Mystery', matched: 'Matched', captured: 'Captured' };

export default async function CapturePage({ params }: { params: Promise<{ txId: string }> }) {
  const { txId } = await params;
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from('transactions').select('*').eq('id', txId).eq('user_id', user.id).maybeSingle();
  if (!data) notFound();
  const t = data as Transaction;
  return (
    <Page>
      <PageHeader title="Snap the receipt" subtitle={`${t.merchant ?? 'A charge'} with no matching receipt email. A photo or a line of text becomes the item, with the photo kept as your receipt.`} />
      <Card className="mx-auto w-full max-w-xl">
        <div className="mb-3 flex items-center justify-between"><span className="display text-2xl font-semibold text-pine">{usd(t.amount_cents)}</span><Badge tone={t.match_status === 'captured' ? 'save' : 'neutral'}>{STATUS[t.match_status] ?? t.match_status}</Badge></div>
        <Row label="Merchant" value={t.merchant ?? '—'} />
        <Row label="Date" value={t.date ?? ''} muted />
        <div className="mt-4">
          {t.match_status === 'captured' ? <Note>Already captured · {t.item_ids.length} item{t.item_ids.length === 1 ? '' : 's'}.</Note> : <CaptureForm txId={t.id} merchant={t.merchant ?? ''} amount={usd(t.amount_cents)} />}
        </div>
      </Card>
    </Page>
  );
}
