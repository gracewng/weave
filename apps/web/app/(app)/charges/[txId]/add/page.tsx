import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
import { AddDetailsForm } from './AddDetailsForm';
import type { Transaction } from '@weave/shared/types';

export const dynamic = 'force-dynamic';

export default async function AddPurchasePage({ params }: { params: Promise<{ txId: string }> }) {
  const { txId } = await params;
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from('transactions').select('*').eq('id', txId).eq('user_id', user.id).maybeSingle();
  if (!data) notFound();
  const t = data as Transaction;
  return (
    <Receipt className="mx-auto max-w-lg">
      <ReceiptHeader title="Add purchase details" subtitle={(t.merchant ?? '').toUpperCase()} />
      <ReceiptRule />
      <ReceiptLine label="CHARGE" value={usd(t.amount_cents)} />
      <ReceiptLine label="DATE" value={t.date ?? ''} muted />
      <ReceiptRule />
      {t.match_status === 'captured' && t.item_ids.length > 0
        ? <div className="mono text-[11px] text-ink-3">ALREADY ADDED · <Link href={`/wardrobe/${t.item_ids[0]}`} className="underline">VIEW ITEM</Link></div>
        : <AddDetailsForm txId={t.id} merchant={t.merchant ?? ''} />}
    </Receipt>
  );
}
