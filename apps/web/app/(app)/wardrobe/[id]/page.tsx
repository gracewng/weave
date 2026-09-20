import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
import { ShareToggles } from './ShareToggles';
import { daysBetween } from '@/lib/returns';
import { similarOwned } from '@/lib/tagging';
import { candidatesFor } from '@/lib/identify';
import { ImageOptions } from './ImageOptions';
import { EditDetails } from './EditDetails';
import { ItemTools } from './ItemTools';
import { ReturnActions } from '@/app/(app)/returns/ReturnActions';
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
  const similarAll = it.embedding ? await similarOwned(user.id, { itemId: it.id }, 8).catch(() => []) : [];
  const seenNames = new Set<string>([it.name.toLowerCase()]);
  const similar = similarAll.filter((s) => { const k = s.name.toLowerCase(); if (seenNames.has(k)) return false; seenNames.add(k); return true; }).slice(0, 4);
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
          <ImageOptions itemId={it.id} initial={candidates} hasImage={!!it.image_url} />
        </div>
        <div className="mono mt-3 text-[11px] text-ink-3"><Link href="/wardrobe" className="hover:text-ink">← WARDROBE</Link></div>
      </div>

      <div className="space-y-4">
        {it.profile_mismatch && <MismatchBanner itemId={it.id} department={it.department} />}
        <Receipt>
          <ReceiptHeader title={it.name} subtitle={[it.brand, it.size ? `SIZE ${it.size}` : null, it.color && it.color.toLowerCase() !== 'unknown' ? it.color : null].filter(Boolean).join(' · ').toUpperCase()} />
          <ReceiptRule />
          <div className="mb-2 flex flex-wrap gap-2"><EditDetails itemId={it.id} name={it.name} brand={it.brand} color={it.color} size={it.size} /><ItemTools itemId={it.id} name={it.name} /></div>
          <ReceiptLine label="PAID" value={usd(it.price_cents)} />
          <ReceiptLine label="BOUGHT" value={it.purchase_date ?? '—'} muted />
          <ReceiptLine label="AT" value={it.retailer ?? '—'} muted />
          {it.receipt_url && <ReceiptLine label="RECEIPT" value={<a href={it.receipt_url} target="_blank" rel="noreferrer" className="underline">ON FILE</a>} muted />}
          {(returnOpen || it.status === 'returning') && (
            <>
              <ReceiptRule />
              {returnOpen && <ReceiptLine label={<span className="flex items-center gap-1"><Icon name="undo" size={12} />RETURNABLE</span>} value={`${daysBetween(today, it.return_by!)} DAYS LEFT`} />}
              {it.status === 'returning' && <ReceiptLine label="RETURN" value="PENDING" />}
              <ReturnActions itemId={it.id} name={it.name} priceCents={it.price_cents} status={it.status === 'returning' ? 'returning' : 'owned'} />
            </>
          )}
          <ReceiptRule />
          <ShareToggles itemId={it.id} shareable={it.shareable} lendable={it.lendable} intimates={it.category === 'intimates'} />
        </Receipt>

        <Receipt>
          <ReceiptHeader title="Details" />
          <ReceiptRule />
          <ReceiptLine label="DAYS OWNED" value={owned != null ? String(owned) : '—'} />
          {it.identifier && <ReceiptLine label="ITEM NO." value={it.identifier} muted />}
          {it.description && <ReceiptLine label="TAGGED" value={it.description.replace(/^unknown\s+/i, '').slice(0, 40)} muted />}
        </Receipt>

        {similar.length > 0 && (
          <div>
            <div className="mono mb-2 text-[10px] uppercase tracking-wider text-ink-3">Similar in your wardrobe</div>
            <div className="flex gap-2 overflow-x-auto">
              {similar.map((s) => (
                <Link key={s.id} href={`/wardrobe/${s.id}`} className="cutout w-24 shrink-0 p-1 hover:border-ink">
                  <div className="aspect-[3/4] w-full bg-paper-2">{s.image_url ? <img src={s.image_url} alt={s.name} className="h-full w-full object-contain" /> : <div className="mono flex h-full items-center justify-center text-[9px] text-ink-3">NO IMAGE</div>}</div>
                  <div className="mt-1 truncate text-[11px]">{s.name}</div>
                  <div className="mono text-[9px] text-ink-3">{Math.round(s.similarity * 100)}%</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
