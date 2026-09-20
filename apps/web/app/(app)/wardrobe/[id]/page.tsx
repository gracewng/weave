import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Page, PageHeader } from '@/components/ui';
import { Tape, TapeLine, TapeRule, Barcode, Stamp, usd } from '@/components/Tape';
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
  const meta = [it.brand ?? it.retailer, it.size ? `Size ${it.size}` : null, it.color && it.color.toLowerCase() !== 'unknown' ? it.color : null].filter(Boolean).join(' · ');
  const stamps = (stoodIn ?? []) as Array<{ title: string; price_cents: number; created_at: string }>;

  return (
    <Page>
      <PageHeader
        eyebrow={<Link href="/wardrobe" className="hover:text-ink">← Wardrobe</Link>}
        title={it.name}
        subtitle={meta || undefined}
        actions={<div className="flex items-center gap-2"><EditDetails itemId={it.id} name={it.name} brand={it.brand} color={it.color} size={it.size} /><ItemTools itemId={it.id} name={it.name} /></div>}
      />

      {it.profile_mismatch && <MismatchBanner itemId={it.id} department={it.department} />}

      <div className="grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-start">
        <div>
          <div className="tag !p-3">
            <div className="mt-1 aspect-[3/4] w-full bg-white">
              {it.image_url ? <img src={it.image_url} alt={it.name} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-ink-3"><Icon name="image" size={28} /></div>}
            </div>
            {stamps.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {stamps.map((h, i) => <Stamp key={i} tone="save">Stood in for {h.price_cents > 0 ? usd(h.price_cents) : 'a'} {h.title.slice(0, 18)}</Stamp>)}
              </div>
            )}
          </div>
          <div className="mt-3"><ImageOptions itemId={it.id} initial={candidates} hasImage={!!it.image_url} /></div>
        </div>

        <div className="space-y-6">
          <Tape>
            <TapeLine label="Paid" value={usd(it.price_cents)} />
            <TapeLine label="Bought" value={it.purchase_date ?? '—'} muted />
            <TapeLine label="At" value={it.retailer ?? '—'} muted />
            {owned != null && <TapeLine label="Owned" value={`${owned} day${owned === 1 ? '' : 's'}`} muted />}
            {it.receipt_url && <TapeLine label="Receipt" value={<a href={it.receipt_url} target="_blank" rel="noreferrer" className="underline">On file</a>} muted />}
            {(returnOpen || it.status === 'returning') && (
              <>
                <TapeRule />
                {returnOpen && <TapeLine label="Return window" value={`${daysBetween(today, it.return_by!)} days left`} />}
                {it.status === 'returning' && <TapeLine label="Return" value={<Stamp>Pending</Stamp>} />}
                <ReturnActions itemId={it.id} name={it.name} priceCents={it.price_cents} status={it.status === 'returning' ? 'returning' : 'owned'} compact />
              </>
            )}
            <TapeRule />
            <ShareToggles itemId={it.id} shareable={it.shareable} lendable={it.lendable} intimates={it.category === 'intimates'} />
            <TapeRule />
            <Barcode seed={it.identifier ?? it.id} label={it.identifier ? `No. ${it.identifier}` : `No. ${it.id.slice(0, 8)}`} />
          </Tape>

          {similar.length > 0 && (
            <section className="pt-4">
              <div className="mb-3 flex items-baseline justify-between"><h2 className="display text-xs text-ink-2">Similar in your wardrobe</h2><span className="text-xs text-ink-3">by description</span></div>
              <div className="grid grid-cols-4 gap-3">
                {similar.map((s) => (
                  <Link key={s.id} href={`/wardrobe/${s.id}`} className="tag block !p-2 hover:!border-fern">
                    <div className="mt-1 aspect-[3/4] w-full bg-white">{s.image_url ? <img src={s.image_url} alt={s.name} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-ink-3"><Icon name="image" size={16} /></div>}</div>
                    <div className="mt-1.5 truncate font-sans text-xs" title={s.name}>{s.name}</div>
                    <div className="text-[10px] text-ink-3">{Math.round(s.similarity * 100)}% match</div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </Page>
  );
}
