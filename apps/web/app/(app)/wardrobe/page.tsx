import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { IngestPanel } from '@/components/IngestPanel';
import { CardMenu } from '@/components/CardMenu';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
import type { Item } from '@weave/shared/types';
import { ReturnActions } from '../returns/ReturnActions';

export const dynamic = 'force-dynamic';

type Sort = 'newest' | 'price';
const SORTS: Array<[Sort, string]> = [['newest', 'Newest'], ['price', 'Paid']];

export default async function WardrobePage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort = 'newest' } = await searchParams;
  const { supabase, user } = await requireUser();
  const admin = createAdminClient();
  const [{ data: itemsData }, { data: tok }] = await Promise.all([
    supabase.from('items').select('id,user_id,name,brand,category,slot,color,formality,size,price_cents,purchase_date,retailer,image_url,image_source,receipt_url,source,return_by,status,shareable,lendable,description,created_at').eq('user_id', user.id).in('status', ['owned', 'returning']),
    admin ? admin.from('gmail_tokens').select('user_id').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const items = (itemsData ?? []) as Item[];
  const hasGmail = !!tok;
  const today = new Date().toISOString().slice(0, 10);

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <IngestPanel hasGmail={hasGmail} itemCount={0} />
        <Receipt className="mx-auto max-w-lg">
          <ReceiptHeader title="Wardrobe" subtitle="NOTHING PRINTED YET" />
          <ReceiptRule />
          <ReceiptLine label="ITEMS" value="0" muted />
          <ReceiptLine label="PAID IN TOTAL" value="$0.00" muted />
          <ReceiptLine label="CLOSET COVERAGE" value="No history yet" muted />
        </Receipt>
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => {
    if (sort === 'price') return (b.price_cents ?? 0) - (a.price_cents ?? 0);
    return (b.purchase_date ?? b.created_at).localeCompare(a.purchase_date ?? a.created_at);
  });

  const paid = items.reduce((s, i) => s + (i.price_cents ?? 0), 0);
  const since = new Date(); since.setUTCDate(since.getUTCDate() - 30); const sinceISO = since.toISOString().slice(0, 10);
  const spent30 = items.filter((i) => i.purchase_date && i.purchase_date >= sinceISO).reduce((s, i) => s + (i.price_cents ?? 0), 0);
  const returnableItems = items.filter((i) => i.return_by && i.return_by >= today);
  const atStake = returnableItems.reduce((s, i) => s + (i.price_cents ?? 0), 0);
  const returnsPending = items.filter((i) => i.status === 'returning').length;

  return (
    <div className="space-y-6">
      <IngestPanel hasGmail={hasGmail} itemCount={items.length} compact />
      <Receipt>
        <ReceiptHeader title="Wardrobe" subtitle={`${items.length} ITEMS`} />
        <ReceiptRule />
        <ReceiptLine label="SPENT, LAST 30 DAYS" value={usd(spent30)} />
        <ReceiptLine label="PAID IN TOTAL" value={usd(paid)} muted />
        {returnableItems.length > 0 && <ReceiptLine label={<Link href="/returns" className="underline">RETURNABLE</Link>} value={`${returnableItems.length} · ${usd(atStake)} AT STAKE`} />}
        {returnsPending > 0 && <ReceiptLine label={<Link href="/returns" className="underline">RETURNS PENDING</Link>} value={String(returnsPending)} muted />}
      </Receipt>

      <div className="mono flex flex-wrap gap-x-4 gap-y-1 text-[11px] uppercase tracking-wider text-ink-3">
        <span>Sort</span>
        {SORTS.map(([k, label]) => <Link key={k} href={`/wardrobe?sort=${k}`} className={k === sort ? 'text-ink underline underline-offset-4' : 'hover:text-ink'}>{label}</Link>)}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {sorted.map((i) => {
          const returnableNow = i.status === 'owned' && !!i.return_by && i.return_by >= today;
          return (
            <div key={i.id} className="cutout group relative p-2 hover:shadow-[0_8px_20px_-12px_rgba(0,0,0,.4)]">
              <CardMenu itemId={i.id} name={i.name} hasImage={!!i.image_url} />
              <Link href={`/wardrobe/${i.id}`} className="block">
                <div className="relative aspect-[3/4] w-full bg-paper-2">
                  {i.image_url ? <img src={i.image_url} alt={i.name} className="h-full w-full object-contain" /> : <div className="mono flex h-full items-center justify-center px-2 text-center text-[10px] text-ink-3">NO IMAGE YET</div>}
                  {!i.shareable && <span className="mono absolute left-1 top-1 bg-paper px-1 text-[9px] text-ink-3">PRIVATE</span>}
                  {i.profile_mismatch && <span className="mono absolute bottom-1 left-1 bg-paper px-1 text-[9px] text-warn">YOURS?</span>}
                  <span className={`stamp absolute right-1 top-1 ${i.status === 'returning' ? '' : returnableNow ? 'saved' : 'opacity-60'}`}>
                    {i.status === 'returning' ? 'RETURN PENDING' : returnableNow ? 'RETURNABLE' : 'NOT RETURNABLE'}
                  </span>
                </div>
                <div className="mt-2 truncate text-sm" title={i.name}>{i.name}</div>
                <div className="mono flex justify-between text-[11px] text-ink-3"><span className="truncate">{i.brand ?? i.retailer ?? ''}{i.size ? ` · ${i.size}` : ''}</span><span>{usd(i.price_cents)}</span></div>
                <div className="mono flex justify-between text-[10px] text-ink-3">
                  <span>{i.purchase_date ? `BOUGHT ${i.purchase_date.slice(5)}` : ''}</span>
                  {returnableNow && <span>RETURN BY {i.return_by!.slice(5)}</span>}
                </div>
              </Link>
              {returnableNow
                ? <ReturnActions itemId={i.id} name={i.name} priceCents={i.price_cents} status="owned" />
                : i.status === 'returning' && <ReturnActions itemId={i.id} name={i.name} priceCents={i.price_cents} status="returning" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
