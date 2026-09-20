import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { IngestPanel } from '@/components/IngestPanel';
import { CardMenu } from '@/components/CardMenu';
import { Page, PageHeader, Stat, StatGrid, Badge, usd } from '@/components/ui';
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
      <Page>
        <PageHeader title="Wardrobe" subtitle="Nothing here yet. Scan your inbox and your order emails become items with prices, sizes and return windows." />
        <StatGrid>
          <Stat value={0} label="items owned" />
          <Stat value="$0.00" label="paid in total" />
          <Stat value="—" label="closet coverage · not enough purchase history" />
        </StatGrid>
        <IngestPanel hasGmail={hasGmail} itemCount={0} />
      </Page>
    );
  }

  const sorted = [...items].sort((a, b) => {
    if (sort === 'price') return (b.price_cents ?? 0) - (a.price_cents ?? 0);
    return (b.purchase_date ?? b.created_at).localeCompare(a.purchase_date ?? a.created_at);
  });

  const paid = items.reduce((s, i) => s + (i.price_cents ?? 0), 0);
  const returnable = items.filter((i) => i.status === 'owned' && i.return_by && i.return_by >= today).length;
  const returnsPending = items.filter((i) => i.status === 'returning').length;

  const sortLinks = (
    <div className="flex items-center gap-2">
      <span className="text-xs text-ink-3">Sort</span>
      {SORTS.map(([k, label]) => <Link key={k} href={`/wardrobe?sort=${k}`} className={`btn btn-sm ${k === sort ? '' : 'btn-outline'}`}>{label}</Link>)}
    </div>
  );

  return (
    <Page>
      <PageHeader title="Wardrobe" subtitle={`${items.length} item${items.length === 1 ? '' : 's'}, rebuilt from your receipts.`} actions={sortLinks} />

      <StatGrid>
        <Stat value={usd(paid)} label="paid in total" />
        <Stat value={returnable} label="still returnable" href="/returns" />
        <Stat value={returnsPending} label="returns pending" href="/returns" />
      </StatGrid>

      <IngestPanel hasGmail={hasGmail} itemCount={items.length} compact />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {sorted.map((i) => {
          const returnableNow = i.status === 'owned' && !!i.return_by && i.return_by >= today;
          return (
            <div key={i.id} className="cutout group relative p-2 transition hover:-translate-y-0.5 hover:shadow-md">
              <CardMenu itemId={i.id} name={i.name} hasImage={!!i.image_url} />
              <Link href={`/wardrobe/${i.id}`} className="block">
                <div className="relative aspect-[3/4] w-full rounded-xl bg-paper-2">
                  {i.image_url ? <img src={i.image_url} alt={i.name} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-ink-3">No image yet</div>}
                  <div className="absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
                    {!i.shareable && <Badge>Private</Badge>}
                    {i.profile_mismatch && <Badge tone="warn">Yours?</Badge>}
                  </div>
                  {(i.status === 'returning' || returnableNow) && (
                    <span className="absolute bottom-1.5 left-1.5">
                      <Badge tone={i.status === 'returning' ? 'pine' : 'save'}>{i.status === 'returning' ? 'Return pending' : 'Returnable'}</Badge>
                    </span>
                  )}
                </div>
                <div className="mt-2 truncate px-1 text-sm" title={i.name}>{i.name}</div>
                <div className="flex justify-between px-1 text-xs text-ink-3"><span className="truncate">{i.brand ?? i.retailer ?? ''}{i.size ? ` · ${i.size}` : ''}</span><span className="tabular-nums">{usd(i.price_cents)}</span></div>
                <div className="flex justify-between px-1 text-[11px] text-ink-3">
                  <span>{i.purchase_date ? `Bought ${i.purchase_date.slice(5)}` : ''}</span>
                  {returnableNow && <span>Return by {i.return_by!.slice(5)}</span>}
                </div>
              </Link>
              {returnableNow
                ? <ReturnActions itemId={i.id} name={i.name} priceCents={i.price_cents} status="owned" />
                : i.status === 'returning' && <ReturnActions itemId={i.id} name={i.name} priceCents={i.price_cents} status="returning" />}
            </div>
          );
        })}
      </div>
    </Page>
  );
}
