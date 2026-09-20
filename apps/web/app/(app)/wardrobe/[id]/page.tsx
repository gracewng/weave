import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
import { ShareToggles } from './ShareToggles';
import { daysBetween } from '@/lib/returns';
import { similarOwned } from '@/lib/tagging';
import { candidatesFor } from '@/lib/identify';
import { Candidates } from './Candidates';
import { EditDetails } from './EditDetails';
import { ItemTools } from './ItemTools';
import { MismatchBanner } from './MismatchBanner';
import type { Item } from '@weave/shared/types';

export const dynamic = 'force-dynamic';

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const [{ data: item }, { data: stoodIn }] = await Promise.all([
    supabase.from('items').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('holds').select('title,price_cents,created_at').eq('owned_item_id', id).eq('status', 'skipped').order('created_at', { ascending: false }),
  ]);
  if (!item) notFound();
  const it = item as Item;
  const today = new Date().toISOString().slice(0, 10);
  const owned = it.purchase_date ? daysBetween(it.purchase_date, today) : null;
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
            {((stoodIn ?? []) as Array<{ title: string; price_cents: number; created_at: string }>).map((h, i) => <span key={`s${i}`} className="stamp saved">STOOD IN FOR {h.price_cents > 0 ? usd(h.price_cents) : 'A'} {h.title.toUpperCase().slice(0, 18)} · {h.created_at.slice(5, 10).replace('-', '/')}</span>)}
          </div>
          <Candidates itemId={it.id} initial={candidates} hasImage={!!it.image_url} imageSource={it.image_source} />
          <div className="mt-3 border-t border-dashed border-rule pt-2"><ItemTools itemId={it.id} name={it.name} hasImage={!!it.image_url} /></div>
        </div>
        <div className="mono mt-3 text-[11px] text-ink-3"><Link href="/wardrobe" className="hover:text-ink">← WARDROBE</Link></div>
      </div>

      <div className="space-y-4">
        {it.profile_mismatch && <MismatchBanner itemId={it.id} department={it.department} />}
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
          {returnOpen
            ? <ReceiptLine label="RETURN WINDOW" value={`OPEN · ${daysBetween(today, it.return_by!)} DAYS LEFT`} />
            : <ReceiptLine label="RETURN WINDOW" value={it.return_by ? `CLOSED ${it.return_by}` : 'UNKNOWN'} muted />}
          {returnOpen && <div className="mono mt-1 text-[11px] text-ink-3">STILL RETURNABLE · {usd(it.price_cents)} AT STAKE</div>}
          <ReceiptRule />
          <ShareToggles itemId={it.id} shareable={it.shareable} lendable={it.lendable} intimates={it.category === 'intimates'} />
        </Receipt>

        <Receipt>
          <ReceiptHeader title="Purchase details" subtitle="WHAT WE KNOW ABOUT THIS ITEM" />
          <ReceiptRule />
          <ReceiptLine label="DAYS OWNED" value={owned != null ? String(owned) : '—'} />
          {it.description && <><ReceiptRule /><div className="mono text-[11px] text-ink-3">TAGGED AS · {it.description}{it.formality ? ` · FORMALITY ${it.formality}/5` : ''}</div></>}
        </Receipt>

        {similar.length > 0 && (
          <Receipt>
            <ReceiptHeader title="Similar in your wardrobe" />
            <ReceiptRule />
            {similar.map((s) => <ReceiptLine key={s.id} label={<Link href={`/wardrobe/${s.id}`} className="hover:underline">{s.name.slice(0, 34)}</Link>} value={`${Math.round(s.similarity * 100)}%`} muted />)}
          </Receipt>
        )}
      </div>
    </div>
  );
}
