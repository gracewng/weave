import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { IngestPanel } from '@/components/IngestPanel';
import { CardMenu } from '@/components/CardMenu';
import { Tape, TapeHeader, TapeLine, TapeRule, TapeTotal, Barcode, Stamp, usd } from '@/components/Tape';
import type { Item } from '@weave/shared/types';
import { Icon } from '@/components/Icon';

export const dynamic = 'force-dynamic';

type Sort = 'newest' | 'price';
type View = 'rack' | 'tape';
const SORTS: Array<[Sort, string]> = [['newest', 'Newest'], ['price', 'Paid']];
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const closetNo = (id: string) => id.replace(/-/g, '').slice(0, 12).toUpperCase().replace(/(.{4})/g, '$1 ').trim();
const shortDate = (d: string | null) => (d ? `${d.slice(5, 7)}/${d.slice(8, 10)}` : '');

export default async function WardrobePage({ searchParams }: { searchParams: Promise<{ sort?: string; returnable?: string; view?: string }> }) {
  const { sort = 'newest', returnable: retOnly, view: viewParam } = await searchParams;
  const view: View = viewParam === 'tape' ? 'tape' : 'rack';
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
          <TapeLine label="Items" value="0" muted />
          <TapeLine label="Paid in total" value="$0.00" muted />
          <TapeLine label="Closet coverage" value="No history yet" muted />
          <TapeRule />
          <Barcode seed={user.id} label={`CLOSET NO. ${closetNo(user.id)}`} />
        </Tape>
      </div>
    );
  }

  const visible = retOnly ? items.filter((i) => i.status === 'owned' && i.return_by && i.return_by >= today) : items;
  const sorted = [...visible].sort((a, b) => {
    if (sort === 'price') return (b.price_cents ?? 0) - (a.price_cents ?? 0);
    return (b.purchase_date ?? b.created_at).localeCompare(a.purchase_date ?? a.created_at);
  });

  const paid = items.reduce((s, i) => s + (i.price_cents ?? 0), 0);
  const since = new Date(); since.setUTCDate(since.getUTCDate() - 30); const sinceISO = since.toISOString().slice(0, 10);
  const spent30 = items.filter((i) => i.purchase_date && i.purchase_date >= sinceISO).reduce((s, i) => s + (i.price_cents ?? 0), 0);
  const returnableItems = items.filter((i) => i.status === 'owned' && i.return_by && i.return_by >= today);
  const atStake = returnableItems.reduce((s, i) => s + (i.price_cents ?? 0), 0);
  const returnsPending = items.filter((i) => i.status === 'returning').length;
  const withImage = items.filter((i) => i.image_url).length;

  const href = (o: { sort?: Sort; returnable?: boolean; view?: View }) => {
    const q = new URLSearchParams();
    const s = o.sort ?? (sort as Sort); if (s !== 'newest') q.set('sort', s);
    const r = o.returnable ?? !!retOnly; if (r) q.set('returnable', '1');
    const v = o.view ?? view; if (v !== 'rack') q.set('view', v);
    const qs = q.toString(); return `/wardrobe${qs ? `?${qs}` : ''}`;
  };

  // Tape view: one long receipt, grouped by purchase month with a subtotal per month.
  const groups = new Map<string, Item[]>();
  for (const i of sorted) { const k = i.purchase_date ? i.purchase_date.slice(0, 7) : 'undated'; groups.set(k, [...(groups.get(k) ?? []), i]); }

  return (
    <div className="space-y-6">
      <IngestPanel hasGmail={hasGmail} itemCount={items.length} compact />

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
        <Tape>
          <TapeHeader title="Wardrobe" subtitle={`${items.length} items · printed ${printed}`} brand />
          <TapeRule />
          <TapeLine label="Spent, last 30 days" value={usd(spent30)} />
          <TapeLine label="Paid in total" value={usd(paid)} muted />
          <TapeLine label="With a product photo" value={`${withImage} of ${items.length}`} muted />
          {returnableItems.length > 0 && <TapeLine label={<Link href="/returns" className="underline">Returnable</Link>} value={`${returnableItems.length} · ${usd(atStake)} at stake`} />}
          {returnsPending > 0 && <TapeLine label={<Link href="/returns" className="underline">Returns pending</Link>} value={String(returnsPending)} muted />}
          <TapeRule />
          <Barcode seed={user.id} label={`CLOSET NO. ${closetNo(user.id)}`} />
        </Tape>

        <div className="mono flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] uppercase tracking-wider text-ink-3 md:pt-3">
          <span className="flex items-center gap-2">
            <span>View</span>
            <Link href={href({ view: 'rack' })} className={`flex items-center gap-1 ${view === 'rack' ? 'text-ink underline underline-offset-4' : 'hover:text-ink'}`} title="Hang tags on a rail"><Icon name="wardrobe" size={12} />Rack</Link>
            <Link href={href({ view: 'tape' })} className={`flex items-center gap-1 ${view === 'tape' ? 'text-ink underline underline-offset-4' : 'hover:text-ink'}`} title="One long receipt, month by month"><Icon name="receipt" size={12} />Tape</Link>
          </span>
          <span className="flex items-center gap-2">
            <span>Sort</span>
            {SORTS.map(([k, label]) => <Link key={k} href={href({ sort: k })} className={k === sort ? 'text-ink underline underline-offset-4' : 'hover:text-ink'}>{label}</Link>)}
          </span>
          <Link href={href({ returnable: !retOnly })} className={`flex items-center gap-1 ${retOnly ? 'text-save' : 'hover:text-ink'}`} title="Only items still inside their return window"><Icon name="undo" size={12} />Returnable{retOnly ? ' · on' : ''}</Link>
        </div>
      </div>

      {view === 'rack' ? (
        <div className="rack grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {sorted.map((i) => {
            const returnableNow = i.status === 'owned' && !!i.return_by && i.return_by >= today;
            return (
              <div key={i.id} className="hook group">
                <div className="tag">
                  <CardMenu itemId={i.id} name={i.name} hasImage={!!i.image_url} />
                  <Link href={`/wardrobe/${i.id}`} className="block">
                    <div className="relative mt-1 aspect-[3/4] w-full bg-white">
                      {i.image_url ? <img src={i.image_url} alt={i.name} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-ink-3"><Icon name="image" size={22} /></div>}
                      {!i.shareable && <span className="absolute left-1 top-1 bg-white/90 p-1 text-ink-3" title="Private"><Icon name="lock" size={12} /></span>}
                      {i.profile_mismatch && <Stamp tone="warn" className="absolute bottom-1 left-1">Yours?</Stamp>}
                      {i.status === 'returning' && <Stamp className="absolute bottom-1 right-1">Returning</Stamp>}
                      {returnableNow && !retOnly && <span className="absolute bottom-1 right-1 bg-white/90 p-1 text-ink-3" title={`Returnable until ${i.return_by}`}><Icon name="undo" size={12} /></span>}
                    </div>
                    <div className="mt-2 truncate font-sans text-[13px] leading-tight" title={i.name}>{i.name}</div>
                    <div className="leader muted mt-0.5"><span className="l">{i.brand ?? i.retailer ?? 'Unknown'}{i.size ? ` · ${i.size}` : ''}</span><span className="dots" /><span className="v text-ink">{usd(i.price_cents)}</span></div>
                    <Barcode seed={i.id} height={12} className="mt-1.5 opacity-80" />
                    <div className="mt-0.5 flex justify-between text-[9px] tracking-wider text-ink-3"><span>{shortDate(i.purchase_date)}</span><span>{i.id.slice(0, 6).toUpperCase()}</span></div>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Tape className="mx-auto max-w-2xl">
          <TapeHeader title="Closet ledger" subtitle={`${sorted.length} lines · ${retOnly ? 'returnable only' : 'everything you own'}`} />
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
