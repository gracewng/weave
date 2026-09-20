import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Page, PageHeader, Card, CardTitle, Note, Empty } from '@/components/ui';
import { IconFriends } from '@/components/icons';
import { friendWardrobe, inMySize } from '@/lib/friends';
import { BorrowForm } from './BorrowForm';
import { FriendHangTag } from '@/components/HangTag';
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
          <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
            <div>
              <div className="tag !p-2">
                <div className="mt-1 aspect-[3/4] w-full bg-white">{selected.image_url && <img src={selected.image_url} alt="" className="h-full w-full object-contain" />}</div>
                <div className="mt-2 truncate font-sans text-[15px] leading-tight" title={selected.name}>{selected.name}</div>
                <div className="leader muted mt-0.5"><span className="l">{selected.brand ?? name}</span><span className="dots" /><span className="v text-ink">{selected.size ?? '—'}</span></div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-ink-2">
                <div>From <span className="font-medium text-ink">{name}</span></div>
                {price && <div>Instead of buying at ${(Number(price) / 100).toFixed(2)}</div>}
              </div>
            </div>
            <div className="min-w-0">
              <CardTitle hint={selected.lendable ? `${name} lends this. A request is pending until they accept.` : `${name} has this marked as not lendable.`}>Ask to borrow</CardTitle>
              {selected.lendable && <BorrowForm itemId={selected.id} ownerId={id} friendName={name} itemName={selected.name} intendedPriceCents={price ? Number(price) : null} query={q ?? null} />}
            </div>
          </div>
        </Card>
      )}

      {shown.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-3">Nothing in your size yet{items.length ? '. Try “All sizes”' : ''}.</div>
      ) : (
        <div className="rack grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {shown.map((i) => <FriendHangTag key={i.id} item={i} selected={selected?.id === i.id} href={`/friends/${id}?item=${i.id}${price ? `&price=${price}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}${all ? '&all=1' : ''}`} />)}
        </div>
      )}

      <Note>You see what {name} marked shareable. No prices, dates or stores, ever.</Note>
    </Page>
  );
}
