import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Page, PageHeader, Card, CardTitle, Row, Note, Badge, Empty } from '@/components/ui';
import { IconFriends } from '@/components/icons';
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
  if (!fr) return <Page><Empty icon={IconFriends} title="Not friends yet." body="You can only browse wardrobes of accepted friends." action={<Link href="/friends" className="btn btn-sm">Back to friends</Link>} /></Page>;
  const items = await friendWardrobe(supabase, id);
  const mySizes = profile?.sizes ?? {};
  const shown = all ? items : items.filter((i) => inMySize(i, mySizes));
  const selected = preItem ? items.find((i) => i.id === preItem) ?? null : null;
  const name = f.display_name ?? 'Friend';
  const sizes = Object.entries(f.sizes ?? {}).map(([k, v]) => `${k} ${v}`).join(' · ');

  return (
    <Page>
      <PageHeader
        eyebrow={<Link href="/friends" className="hover:text-ink">← Friends</Link>}
        title={`${name}'s wardrobe`}
        subtitle={`${items.length} shareable · ${shown.length} ${all ? 'shown' : 'in your size'}${sizes ? ` · ${sizes}` : ''}`}
        icon={IconFriends}
        actions={<div className="flex gap-2"><Link href={`/friends/${id}`} className={`btn btn-sm ${all ? 'btn-outline' : ''}`}>Only my size</Link><Link href={`/friends/${id}?all=1`} className={`btn btn-sm ${all ? '' : 'btn-outline'}`}>All sizes</Link></div>}
      />

      {selected && (
        <Card tone="sprout">
          <CardTitle hint={selected.name.slice(0, 48)}>Ask to borrow</CardTitle>
          <div className="flex gap-4">
            <div className="h-40 w-32 shrink-0 overflow-hidden rounded-2xl bg-paper">{selected.image_url && <img src={selected.image_url} alt="" className="h-full w-full object-contain" />}</div>
            <div className="min-w-0 flex-1">
              <Row label="Owner" value={name} />
              <Row label="Size" value={selected.size ?? '—'} muted />
              <Row label="Lendable" value={selected.lendable ? 'Yes' : 'Not right now'} muted />
              {price && <Row label="Instead of buying at" value={`$${(Number(price) / 100).toFixed(2)}`} muted />}
            </div>
          </div>
          <div className="mt-4">
            {selected.lendable
              ? <BorrowForm itemId={selected.id} ownerId={id} friendName={name} itemName={selected.name} intendedPriceCents={price ? Number(price) : null} query={q ?? null} />
              : <Note>{name} has this marked as not lendable.</Note>}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {shown.map((i) => (
          <Link key={i.id} href={`/friends/${id}?item=${i.id}${price ? `&price=${price}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}${all ? '&all=1' : ''}`} className={`cutout block p-2 transition hover:-translate-y-0.5 hover:shadow-md ${selected?.id === i.id ? '!border-fern' : ''}`}>
            <div className="aspect-[3/4] w-full rounded-xl bg-paper-2">{i.image_url ? <img src={i.image_url} alt={i.name} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-[10px] text-ink-3">No image</div>}</div>
            <div className="mt-2 truncate px-1 text-sm">{i.name}</div>
            <div className="flex items-center justify-between gap-2 px-1 pb-1 text-xs text-ink-3"><span className="truncate">{i.brand ?? ''}{i.size ? ` · ${i.size}` : ''}</span>{i.lendable && <Badge tone="pine">Lendable</Badge>}</div>
          </Link>
        ))}
        {shown.length === 0 && <div className="col-span-full text-sm text-ink-3">Nothing in your size yet{items.length ? '. Try “All sizes”' : ''}.</div>}
      </div>

      <Note>You see what {name} marked shareable. No prices, dates or stores, ever.</Note>
    </Page>
  );
}
