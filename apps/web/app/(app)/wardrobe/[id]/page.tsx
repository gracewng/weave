import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
import { WearRing } from '@/components/WearRing';
import { WoreToday } from './WoreToday';
import { ShareToggles } from './ShareToggles';
import { costPerWear, costPerWearAtThirty, daysBetween, wearsToThirty } from '@weave/shared/wears';
import { similarOwned } from '@/lib/tagging';
import { candidatesFor } from '@/lib/identify';
import { Candidates } from './Candidates';
import { EditDetails } from './EditDetails';
import type { Item } from '@weave/shared/types';

export const dynamic = 'force-dynamic';

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const [{ data: item }, { data: wearRows }, { data: stoodIn }] = await Promise.all([
    supabase.from('items').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('wears').select('worn_on').eq('item_id', id).order('worn_on', { ascending: false }),
    supabase.from('holds').select('title,price_cents,created_at').eq('wore_item_id', id).eq('status', 'skipped').order('created_at', { ascending: false }),
  ]);
  if (!item) notFound();
  const it = item as Item;
  const wears = (wearRows ?? []) as Array<{ worn_on: string }>;
  const n = wears.length;
  const today = new Date().toISOString().slice(0, 10);
  const cpw = costPerWear(it.price_cents, n);
  const owned = it.purchase_date ? daysBetween(it.purchase_date, today) : null;
  const sinceWorn = wears[0] ? daysBetween(wears[0].worn_on, today) : null;
  const returnOpen = !!it.return_by && it.return_by >= today;
  const similar = it.embedding ? await similarOwned(user.id, { itemId: it.id }, 4).catch(() => []) : [];
  const { results: candidates } = await candidatesFor(it, false).catch(() => ({ results: [] }));

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <div className="cutout p-3">
          <div className="aspect-[3/4] w-full bg-paper-2">
            {it.image_url ? <img src={it.image_url} alt={it.name} className="h-full w-full object-contain" /> : <div className="mono flex h-full items-center justify-center px-4 text-center text-[11px] text-ink-3">NO IMAGE YET</div>}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {wears.slice(0, 12).map((w, i) => <span key={i} className="stamp">WORN {w.worn_on.slice(5).replace('-', '/')}</span>)}
            {((stoodIn ?? []) as Array<{ title: string; price_cents: number; created_at: string }>).map((h, i) => <span key={`s${i}`} className="stamp saved">STOOD IN FOR {h.price_cents > 0 ? usd(h.price_cents) : 'A'} {h.title.toUpperCase().slice(0, 18)} · {h.created_at.slice(5, 10).replace('-', '/')}</span>)}
          </div>
          <Candidates itemId={it.id} initial={candidates} hasImage={!!it.image_url} imageSource={it.image_source} />
        </div>
        <div className="mono mt-3 text-[11px] text-ink-3"><Link href="/wardrobe" className="hover:text-ink">← WARDROBE</Link></div>
      </div>

      <div className="space-y-4">
        <Receipt>
          <ReceiptHeader title={it.name} subtitle={[it.brand, it.size ? `SIZE ${it.size}` : null, it.color].filter(Boolean).join(' · ').toUpperCase()} />
          <ReceiptRule />
          <div className="mb-2"><EditDetails itemId={it.id} name={it.name} brand={it.brand} color={it.color} size={it.size} /></div>
          <ReceiptLine label="PAID" value={usd(it.price_cents)} />
          <ReceiptLine label="BOUGHT" value={it.purchase_date ?? '—'} muted />
          <ReceiptLine label="AT" value={it.retailer ?? '—'} muted />
          <ReceiptLine label="SOURCE" value={it.source === 'email' ? 'ORDER EMAIL' : it.source.toUpperCase()} muted />
          {it.receipt_url && <ReceiptLine label="RECEIPT" value="ON FILE" muted />}
          {it.identifier && <ReceiptLine label="ITEM NO." value={it.identifier} muted />}
          {it.image_url && it.image_source && <ReceiptLine label="IMAGE FROM" value={it.image_source.replace('_', ' ').toUpperCase()} muted />}
          <ReceiptRule />
          <div className="flex items-center gap-4">
            <WearRing wears={n} />
            <div className="flex-1">
              <ReceiptLine label="WEARS LOGGED" value={n === 0 ? 'NONE' : String(n)} />
              <ReceiptLine label="COST PER WEAR" value={cpw != null ? usd(cpw) : 'NO WEARS LOGGED'} />
              <ReceiptLine label="TO #30WEARS" value={wearsToThirty(n) === 0 ? 'REACHED' : `${wearsToThirty(n)} MORE`} muted />
            </div>
          </div>
          <div className="mt-3"><WoreToday itemId={it.id} initialWears={n} /></div>
          <ReceiptRule />
          {returnOpen
            ? <ReceiptLine label="RETURN WINDOW" value={`OPEN · ${daysBetween(today, it.return_by!)} DAYS LEFT`} />
            : <ReceiptLine label="RETURN WINDOW" value={it.return_by ? `CLOSED ${it.return_by}` : 'UNKNOWN'} muted />}
          {returnOpen && n === 0 && <div className="mono mt-1 text-[11px] text-ink-3">UNWORN AND STILL RETURNABLE · {usd(it.price_cents)} AT STAKE</div>}
          <ReceiptRule />
          <ShareToggles itemId={it.id} shareable={it.shareable} lendable={it.lendable} intimates={it.category === 'intimates'} />
        </Receipt>

        <Receipt>
          <ReceiptHeader title="Purchase autopsy" subtitle="WHAT THIS ITEM HAS COST YOU SO FAR" />
          <ReceiptRule />
          <ReceiptLine label="DAYS OWNED" value={owned != null ? String(owned) : '—'} />
          <ReceiptLine label="DAYS SINCE LAST WEAR" value={sinceWorn != null ? String(sinceWorn) : 'NO WEARS LOGGED'} />
          <ReceiptLine label={`${usd(it.price_cents)} / ${n || 0} WEARS`} value={cpw != null ? `${usd(cpw)} PER WEAR` : '—'} />
          <ReceiptLine label={`${usd(it.price_cents)} / 30 WEARS`} value={costPerWearAtThirty(it.price_cents) != null ? `${usd(costPerWearAtThirty(it.price_cents))} PER WEAR` : '—'} valueClass={n >= 30 ? 'saved' : ''} />
          {it.description && <><ReceiptRule /><div className="mono text-[11px] text-ink-3">TAGGED AS · {it.description}{it.formality ? ` · FORMALITY ${it.formality}/5` : ''}</div></>}
        </Receipt>

        {similar.length > 0 && (
          <Receipt>
            <ReceiptHeader title="Similar in your wardrobe" subtitle="SEMANTIC NEIGHBORS · THE 'YOU ALREADY OWN THIS' SIGNAL" />
            <ReceiptRule />
            {similar.map((s) => <ReceiptLine key={s.id} label={<Link href={`/wardrobe/${s.id}`} className="hover:underline">{s.name.slice(0, 34)}</Link>} value={`${Math.round(s.similarity * 100)}%`} muted />)}
          </Receipt>
        )}
      </div>
    </div>
  );
}
