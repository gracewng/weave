import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { EmptyState } from '@/components/EmptyState';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
import type { Item } from '@worthit/shared/types';

export default async function ClosetPage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from('items').select('*').eq('user_id', user.id).eq('status', 'owned').order('created_at', { ascending: false });
  const items = (data ?? []) as Item[];

  if (items.length === 0) {
    return (
      <EmptyState title="Closet" lines={[['ITEMS', '0'], ['CLOSET VALUE', '$0.00'], ['FROM EMAIL', '0'], ['FROM CARD', '0']]}>
        <p className="text-sm text-ink-2">Your closet fills itself from order emails and card charges. Gmail ingestion lands in Phase 2.</p>
        <div className="mt-4 flex gap-2">
          <button className="btn btn-primary" disabled title="Phase 2">Scan my inbox</button>
          <Link href="/settings" className="btn">Settings</Link>
        </div>
      </EmptyState>
    );
  }

  const value = items.reduce((s, i) => s + (i.price_cents ?? 0), 0);
  return (
    <div className="space-y-6">
      <Receipt>
        <ReceiptHeader title="Closet" subtitle={`${items.length} ITEMS`} />
        <ReceiptRule />
        <ReceiptLine label="CLOSET VALUE" value={usd(value)} />
      </Receipt>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map((i) => (
          <div key={i.id} className="cutout p-2">
            <div className="aspect-[3/4] w-full bg-paper-2">
              {i.image_url && <img src={i.image_url} alt={i.name} className="h-full w-full object-contain" />}
            </div>
            <div className="mt-2 truncate text-sm">{i.name}</div>
            <div className="mono flex justify-between text-[11px] text-ink-3"><span>{i.brand ?? i.retailer ?? ''}</span><span>{usd(i.price_cents)}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}
