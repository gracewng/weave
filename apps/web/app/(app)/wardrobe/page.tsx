import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { IngestPanel } from '@/components/IngestPanel';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
import { costPerWear, summarizeWears, wornShare, type WearRow } from '@weave/shared/wears';
import type { Item } from '@weave/shared/types';

export const dynamic = 'force-dynamic';

type Sort = 'newest' | 'least_worn' | 'cpw' | 'price';
const SORTS: Array<[Sort, string]> = [['newest', 'Newest'], ['least_worn', 'Least recently worn'], ['cpw', 'Cost per wear'], ['price', 'Paid']];

export default async function WardrobePage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort = 'newest' } = await searchParams;
  const { supabase, user } = await requireUser();
  const admin = createAdminClient();
  const [{ data: itemsData }, { data: wearsData }, { data: tok }] = await Promise.all([
    supabase.from('items').select('id,user_id,name,brand,category,slot,color,formality,size,price_cents,purchase_date,retailer,image_url,image_source,receipt_url,source,return_by,status,shareable,lendable,description,created_at').eq('user_id', user.id).eq('status', 'owned'),
    supabase.from('wears').select('item_id,worn_on'),
    admin ? admin.from('gmail_tokens').select('user_id').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const items = (itemsData ?? []) as Item[];
  const wears = summarizeWears((wearsData ?? []) as WearRow[]);
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
          <ReceiptLine label="CLOSET COVERAGE" value="Not enough purchase history" muted />
        </Receipt>
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => {
    const wa = wears.get(a.id), wb = wears.get(b.id);
    if (sort === 'least_worn') return (wa?.last ?? a.purchase_date ?? '').localeCompare(wb?.last ?? b.purchase_date ?? '');
    if (sort === 'cpw') return (costPerWear(b.price_cents, wb?.count ?? 0) ?? Infinity) - (costPerWear(a.price_cents, wa?.count ?? 0) ?? Infinity);
    if (sort === 'price') return (b.price_cents ?? 0) - (a.price_cents ?? 0);
    return (b.purchase_date ?? b.created_at).localeCompare(a.purchase_date ?? a.created_at);
  });

  const paid = items.reduce((s, i) => s + (i.price_cents ?? 0), 0);
  const seasonStart = new Date(); seasonStart.setUTCDate(seasonStart.getUTCDate() - 90);
  const worn = wornShare(items.map((i) => i.id), (wearsData ?? []) as WearRow[], seasonStart.toISOString().slice(0, 10));
  const withImages = items.filter((i) => i.image_url).length;
  const returnable = items.filter((i) => i.return_by && i.return_by >= today).length;
  const neverWorn = items.filter((i) => !wears.get(i.id)).length;

  return (
    <div className="space-y-6">
      <IngestPanel hasGmail={hasGmail} itemCount={items.length} compact />
      <Receipt>
        <ReceiptHeader title="Wardrobe" subtitle={`${items.length} ITEMS`} />
        <ReceiptRule />
        <ReceiptLine label="PAID IN TOTAL" value={usd(paid)} />
        <ReceiptLine label="WORN IN THE LAST 90 DAYS" value={`${Math.round(worn * 100)}%`} />
        <ReceiptLine label="NO WEARS LOGGED" value={String(neverWorn)} muted />
        <ReceiptLine label="STILL RETURNABLE" value={String(returnable)} muted />
        <ReceiptLine label="WITH PRODUCT IMAGE" value={`${withImages} / ${items.length}`} muted />
      </Receipt>

      <div className="mono flex flex-wrap gap-x-4 gap-y-1 text-[11px] uppercase tracking-wider text-ink-3">
        <span>Sort</span>
        {SORTS.map(([k, label]) => <Link key={k} href={`/wardrobe?sort=${k}`} className={k === sort ? 'text-ink underline underline-offset-4' : 'hover:text-ink'}>{label}</Link>)}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {sorted.map((i) => {
          const w = wears.get(i.id); const cpw = costPerWear(i.price_cents, w?.count ?? 0);
          return (
            <Link key={i.id} href={`/wardrobe/${i.id}`} className="cutout block p-2 hover:shadow-[0_8px_20px_-12px_rgba(0,0,0,.4)]">
              <div className="relative aspect-[3/4] w-full bg-paper-2">
                {i.image_url ? <img src={i.image_url} alt={i.name} className="h-full w-full object-contain" /> : <div className="mono flex h-full items-center justify-center px-2 text-center text-[10px] text-ink-3">NO IMAGE YET</div>}
                {!i.shareable && <span className="mono absolute left-1 top-1 bg-paper px-1 text-[9px] text-ink-3">PRIVATE</span>}
              </div>
              <div className="mt-2 truncate text-sm" title={i.name}>{i.name}</div>
              <div className="mono flex justify-between text-[11px] text-ink-3"><span className="truncate">{i.brand ?? i.retailer ?? ''}{i.size ? ` · ${i.size}` : ''}</span><span>{usd(i.price_cents)}</span></div>
              <div className="mono flex justify-between text-[10px] text-ink-3">
                <span>{w ? `${w.count} WEAR${w.count === 1 ? '' : 'S'} · ${usd(cpw)}/WEAR` : 'NO WEARS LOGGED'}</span>
                {i.return_by && i.return_by >= today && <span>RETURN BY {i.return_by.slice(5)}</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
