import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { returnBoard } from '@/lib/returns';
import { Page, PageHeader, Stat, StatGrid, SectionTitle, Empty } from '@/components/ui';
import { IconBag, IconEnvelope, IconCard } from '@/components/icons';
import { usd } from '@/components/ui';
import type { Item } from '@weave/shared/types';

export const dynamic = 'force-dynamic';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default async function HomePage() {
  const { supabase: db, user } = await requireUser();
  const [{ data: profile }, { data: itemsData }, { count: holdsHeld }, board] = await Promise.all([
    db.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
    db.from('items').select('id,name,brand,image_url,created_at,purchase_date').eq('user_id', user.id).in('status', ['owned', 'returning']).order('created_at', { ascending: false }),
    db.from('holds').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'held'),
    returnBoard(db, user.id),
  ]);
  const items = (itemsData ?? []) as Pick<Item, 'id' | 'name' | 'brand' | 'image_url' | 'created_at' | 'purchase_date'>[];
  const name = profile?.display_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'there';
  const soonest = board.open[0];

  return (
    <Page>
      <PageHeader eyebrow={`${greeting()},`} title={name} />

      <StatGrid>
        <Stat value={items.length} label="items owned" href="/wardrobe" />
        <Stat value={soonest ? `${soonest.daysLeft}d` : '—'} label={soonest ? 'until a return closes' : 'no returns open'} href="/returns" />
        <Stat value={holdsHeld ?? 0} label="holds waiting" href="/ghosts" />
      </StatGrid>

      <section>
        <SectionTitle>Latest in your wardrobe</SectionTitle>
        {items.length === 0 ? (
          <Empty icon={IconEnvelope} title="Scan your inbox to fill it." body="Order emails become items with prices, sizes and return windows." href="/wardrobe" />
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {items.slice(0, 6).map((i) => (
              <Link key={i.id} href={`/wardrobe/${i.id}`} className="cutout block p-1.5 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="aspect-[3/4] rounded-xl bg-paper-2">
                  {i.image_url ? <img src={i.image_url} alt={i.name} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-[10px] text-ink-3">No photo</div>}
                </div>
                <div className="mt-1 truncate px-1 text-xs" title={i.name}>{i.name}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <StatGrid>
        {[
          ['/search', 'Shop', IconBag],
          ['/wardrobe', 'Scan my inbox', IconEnvelope],
          ['/charges', 'Spending', IconCard],
        ].map(([href, label, Icon]) => {
          const I = Icon as typeof IconBag;
          return (
            <Link key={href as string} href={href as string} className="flex items-center gap-3 rounded-3xl border border-dust p-4 text-sm transition hover:border-fern hover:bg-mist">
              <I className="h-5 w-5 text-fern" /><span className="display text-[11px]">{label as string}</span>
            </Link>
          );
        })}
      </StatGrid>
    </Page>
  );
}
