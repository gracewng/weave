import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
import { CaptureForm } from './CaptureForm';
import type { Transaction } from '@weave/shared/types';

export const dynamic = 'force-dynamic';

export default async function CapturePage({ params }: { params: Promise<{ txId: string }> }) {
  const { txId } = await params;
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from('transactions').select('*').eq('id', txId).eq('user_id', user.id).maybeSingle();
  if (!data) notFound();
  const t = data as Transaction;
  return (
    <Receipt className="mx-auto max-w-lg">
      <ReceiptHeader title="Snap the receipt" subtitle={(t.merchant ?? '').toUpperCase()} />
      <ReceiptRule />
      <ReceiptLine label="CHARGE" value={usd(t.amount_cents)} />
      <ReceiptLine label="DATE" value={t.date ?? ''} muted />
      <ReceiptLine label="STATUS" value={t.match_status.toUpperCase()} muted />
      <ReceiptRule />
      {t.match_status === 'captured' ? <div className="mono text-[11px] text-ink-3">ALREADY CAPTURED · {t.item_ids.length} ITEM{t.item_ids.length === 1 ? '' : 'S'}</div> : <CaptureForm txId={t.id} merchant={t.merchant ?? ''} amount={usd(t.amount_cents)} />}
    </Receipt>
  );
}
