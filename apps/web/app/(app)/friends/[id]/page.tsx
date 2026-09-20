import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule } from '@/components/Receipt';
import { friendWardrobe, inMySize } from '@/lib/friends';
import { BorrowForm } from './BorrowForm';
import type { Profile } from '@weave/shared/types';

export const dynamic = 'force-dynamic';

export default async function FriendPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ item?: string; price?: string; q?: string; all?: string }> }) {
  const { id } = await params;
  const { item: preItem, price, q, all } = await searchParams;
  const { profile, user } = await getProfile();
  const supabase = await createClient();
  const { data: friend } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (!friend) notFound();
  const f = friend as Profile;
  const { data: fr } = await supabase.rpc('is_friend', { a: user.id, b: id });
  if (!fr) return <Receipt className="mx-auto max-w-lg"><ReceiptHeader title="Not friends yet" /><ReceiptRule /><p className="text-sm text-ink-2">You can only browse wardrobes of accepted friends. <Link href="/friends" className="underline">Back</Link></p></Receipt>;
  const items = await friendWardrobe(supabase, id);
  const mySizes = profile?.sizes ?? {};
  const shown = all ? items : items.filter((i) => inMySize(i, mySizes));
  const selected = preItem ? items.find((i) => i.id === preItem) ?? null : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Receipt>
        <ReceiptHeader title={`${f.display_name ?? 'Friend'}'s wardrobe`} subtitle={`${items.length} SHAREABLE · ${shown.length} ${all ? 'SHOWN' : 'IN YOUR SIZE'}`} />
        <ReceiptRule />
        <div className="mono flex flex-wrap items-center gap-4 text-[11px] uppercase text-ink-3">
          <span>{Object.entries(f.sizes ?? {}).map(([k, v]) => `${k} ${v}`).join(' · ') || 'no sizes set'}</span>
          <Link href={`/friends/${id}${all ? '' : '?all=1'}`} className="underline hover:text-ink">{all ? 'Only my size' : 'Show all sizes'}</Link>
          <Link href="/friends" className="hover:text-ink">← Friends</Link>
        </div>
        <div className="mono mt-2 text-[10px] text-ink-3">SHARED ITEMS ONLY. NO PRICES.</div>
      </Receipt>

      {selected && (
        <Receipt print>
          <ReceiptHeader title="Ask to borrow" subtitle={selected.name.toUpperCase().slice(0, 40)} />
          <ReceiptRule />
          <div className="flex gap-4">
            <div className="h-40 w-32 shrink-0 bg-paper-2">{selected.image_url && <img src={selected.image_url} alt="" className="h-full w-full object-contain" />}</div>
            <div className="flex-1">
              <ReceiptLine label="OWNER" value={(f.display_name ?? 'FRIEND').toUpperCase()} />
              <ReceiptLine label="SIZE" value={selected.size ?? '—'} muted />
              <ReceiptLine label="LENDABLE" value={selected.lendable ? 'YES' : 'NOT RIGHT NOW'} muted />
              {price && <ReceiptLine label="INSTEAD OF BUYING AT" value={`$${(Number(price) / 100).toFixed(2)}`} muted />}
            </div>
          </div>
          <ReceiptRule />
          {selected.lendable
            ? <BorrowForm itemId={selected.id} ownerId={id} friendName={f.display_name ?? 'Friend'} itemName={selected.name} intendedPriceCents={price ? Number(price) : null} query={q ?? null} />
            : <div className="mono text-[11px] text-ink-3">{f.display_name} has this marked as not lendable.</div>}
        </Receipt>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {shown.map((i) => (
          <Link key={i.id} href={`/friends/${id}?item=${i.id}${price ? `&price=${price}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}${all ? '&all=1' : ''}`} className={`cutout block p-2 hover:border-ink ${selected?.id === i.id ? 'border-ink' : ''}`}>
            <div className="aspect-[3/4] w-full bg-paper-2">{i.image_url ? <img src={i.image_url} alt={i.name} className="h-full w-full object-contain" /> : <div className="mono flex h-full items-center justify-center text-[10px] text-ink-3">NO IMAGE</div>}</div>
            <div className="mt-2 truncate text-sm">{i.name}</div>
            <div className="mono flex justify-between text-[10px] text-ink-3"><span className="truncate">{i.brand ?? ''}{i.size ? ` · ${i.size}` : ''}</span><span>{i.lendable ? 'LENDABLE' : ''}</span></div>
          </Link>
        ))}
        {shown.length === 0 && <div className="mono col-span-full text-[11px] text-ink-3">NOTHING IN YOUR SIZE YET{items.length ? ' — try "Show all sizes"' : ''}.</div>}
      </div>
    </div>
  );
}
