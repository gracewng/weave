import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { IngestPanel } from '@/components/IngestPanel';
import { HangTag } from '@/components/HangTag';
import { Tape, PrintedTape, TapeHeader, TapeLine, TapeRule, TapeTotal, Barcode, Stamp, usd } from '@/components/Tape';
import type { Item } from '@weave/shared/types';
import { Icon } from '@/components/Icon';
import { WardrobeFilters, type Sort, type View } from './WardrobeFilters';

export const dynamic = 'force-dynamic';

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const closetNo = (id: string) => id.replace(/-/g, '').slice(0, 12).toUpperCase().replace(/(.{4})/g, '$1 ').trim();

export default async function WardrobePage({ searchParams }: { searchParams: Promise<{ sort?: string; returnable?: string; view?: string; q?: string }> }) {
  const { sort: sortParam, returnable: retOnly, view: viewParam, q: qParam = '' } = await searchParams;
  const sort: Sort = sortParam === 'price' ? 'price' : 'newest';
  const view: View = viewParam === 'summary' || viewParam === 'tape' ? 'summary' : 'rack';
  const q = qParam.trim().toLowerCase();
  const { supabase, user } = await requireUser();
  const admin = createAdminClient();
  const [{ data: itemsData }, { data: tok }] = await Promise.all([
    supabase.from('items').select('id,user_id,name,brand,category,slot,color,formality,size,price_cents,purchase_date,retailer,image_url,image_source,receipt_url,source,return_by,status,shareable,lendable,description,profile_mismatch,created_at').eq('user_id', user.id).in('status', ['owned', 'returning']),
    admin ? admin.from('gmail_tokens').select('user_id').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const items = (itemsData ?? []) as Item[];
  const hasGmail = !!tok;
  const today = new Date().toISOString().slice(0, 10);
  const printed = today.replace(/-/g, '/');

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <IngestPanel hasGmail={hasGmail} itemCount={0} />
        <Tape>
          <TapeHeader title="Wardrobe" subtitle={`Nothing printed yet · ${printed}`} brand />
          <TapeRule />
          <TapeLine label="Spent, last 30 days" value="$0.00" muted />
          <TapeLine label="Paid in total" value="$0.00" muted />
          <TapeRule />
          <Barcode seed={user.id} label={`CLOSET NO. ${closetNo(user.id)}`} />
        </Tape>
      </div>
    );
  }

  const matches = (i: Item) => !q || [i.name, i.brand, i.retailer, i.color, i.category, i.size, i.description].some((f) => f && f.toLowerCase().includes(q));
  const visible = items.filter((i) => matches(i) && (!retOnly || (i.status === 'owned' && i.return_by && i.return_by >= today)));
  const sorted = [...visible].sort((a, b) => {
    if (sort === 'price') return (b.price_cents ?? 0) - (a.price_cents ?? 0);
    return (b.purchase_date ?? b.created_at).localeCompare(a.purchase_date ?? a.created_at);
  });

  const paid = items.reduce((s, i) => s + (i.price_cents ?? 0), 0);
  const since = new Date(); since.setUTCDate(since.getUTCDate() - 30); const sinceISO = since.toISOString().slice(0, 10);
  const spent30 = items.filter((i) => i.purchase_date && i.purchase_date >= sinceISO).reduce((s, i) => s + (i.price_cents ?? 0), 0);

  // Tape view: one long receipt, grouped by purchase month with a subtotal per month.
  const groups = new Map<string, Item[]>();
  for (const i of sorted) { const k = i.purchase_date ? i.purchase_date.slice(0, 7) : 'undated'; groups.set(k, [...(groups.get(k) ?? []), i]); }

  return (
    <div className="space-y-6">
      <IngestPanel hasGmail={hasGmail} itemCount={items.length} compact />

      <div className="mx-auto w-full max-w-md">
      <PrintedTape>
        <TapeHeader title="Wardrobe" subtitle={`${items.length} items · printed ${printed}`} brand />
        <TapeRule />
        <TapeLine label="Spent, last 30 days" value={usd(spent30)} />
        <TapeLine label="Paid in total" value={usd(paid)} muted />
        <TapeRule />
        <Barcode seed={user.id} label={`CLOSET NO. ${closetNo(user.id)}`} />
      </PrintedTape>

      <div className="mt-7">
        <WardrobeFilters q={qParam.trim()} sort={sort} returnable={!!retOnly} view={view} count={visible.length} />
      </div>
      </div>

      {visible.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-3">{q ? 'Nothing here matches. Try fewer words.' : 'Nothing in the return window right now.'}</div>
      ) : view === 'rack' ? (
        <div className="rack grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {sorted.map((i) => <HangTag key={i.id} item={i} today={today} showReturnable={!retOnly} />)}
        </div>
      ) : (
        <Tape className="mx-auto max-w-2xl">
          <TapeHeader title="Summary" subtitle={`${sorted.length} lines${q ? ` · matching “${qParam.trim()}”` : ''}${retOnly ? ' · returnable only' : ''}`} />
          {[...groups.entries()].map(([k, list]) => {
            const subtotal = list.reduce((s, i) => s + (i.price_cents ?? 0), 0);
            const label = k === 'undated' ? 'Undated' : MONTH.format(new Date(`${k}-01T00:00:00Z`));
            return (
              <div key={k}>
                <TapeRule />
                <div className="flex items-baseline justify-between text-[10px] uppercase tracking-[.2em] text-ink-3"><span>{label}</span><span>{list.length} item{list.length === 1 ? '' : 's'}</span></div>
                <div className="mt-1">
                  {list.map((i) => (
                    <TapeLine
                      key={i.id}
                      label={
                        <Link href={`/wardrobe/${i.id}`} className="flex min-w-0 items-center gap-2 hover:underline">
                          <span className="h-7 w-5 shrink-0 overflow-hidden bg-white">{i.image_url && <img src={i.image_url} alt="" className="h-full w-full object-contain" />}</span>
                          <span className="truncate">{i.name}</span>
                          {i.size && <span className="shrink-0 text-ink-3">{i.size}</span>}
                          {i.status === 'returning' && <Stamp className="shrink-0">Returning</Stamp>}
                          {i.status === 'owned' && i.return_by && i.return_by >= today && <span className="shrink-0 text-ink-3" title={`Returnable until ${i.return_by}`}><Icon name="undo" size={10} /></span>}
                        </Link>
                      }
                      value={usd(i.price_cents)}
                    />
                  ))}
                </div>
                <TapeLine label={`Subtotal · ${label}`} value={usd(subtotal)} muted />
              </div>
            );
          })}
          <TapeTotal label="Paid in total" value={usd(sorted.reduce((s, i) => s + (i.price_cents ?? 0), 0))} />
          <div className="mt-3 text-center text-[9px] uppercase tracking-[.25em] text-ink-3">Keep this receipt · every line is something you own</div>
          <Barcode seed={user.id} label={`CLOSET NO. ${closetNo(user.id)}`} className="mt-3" />
        </Tape>
      )}
    </div>
  );
}
