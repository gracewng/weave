import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { returnBoard } from '@/lib/returns';
import { Page, PageHeader, Stat, StatGrid, SectionTitle, Empty } from '@/components/ui';
import { HangTag } from '@/components/HangTag';
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
  const ym = new Date().toISOString().slice(0, 7);
  const [{ data: profile }, { data: itemsData }, board] = await Promise.all([
    db.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
    db.from('items').select('id,name,brand,retailer,size,image_url,created_at,purchase_date,price_cents,status,shareable,profile_mismatch,return_by').eq('user_id', user.id).in('status', ['owned', 'returning']).order('created_at', { ascending: false }),
    returnBoard(db, user.id),
  ]);
  const items = (itemsData ?? []) as Pick<Item, 'id' | 'name' | 'brand' | 'retailer' | 'size' | 'image_url' | 'created_at' | 'purchase_date' | 'price_cents' | 'status' | 'shareable' | 'profile_mismatch' | 'return_by'>[];
  const name = profile?.display_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'there';
  const soonest = board.open[0];
  const spentMonth = items.filter((i) => i.purchase_date?.startsWith(ym)).reduce((s, i) => s + (i.price_cents ?? 0), 0);
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long' });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Page>
      <PageHeader eyebrow={`${greeting()},`} title={name} />

      <StatGrid>
        <Stat value={items.length} label="items owned" href="/wardrobe" />
        <Stat value={usd(spentMonth)} label={`spent in ${monthLabel}`} href="/profile#budget" />
        <Stat value={soonest ? `${soonest.daysLeft}d` : '—'} label={soonest ? 'until a return closes' : 'no returns open'} href="/returns" />
      </StatGrid>

      <section>
        <SectionTitle action={<Link href="/wardrobe" className="text-xs underline underline-offset-4 text-ink-2 hover:text-ink">All items</Link>}>Latest in your wardrobe</SectionTitle>
        {items.length === 0 ? (
          <Empty icon={IconEnvelope} title="Scan your inbox to fill it." body="Order emails become items with prices, sizes and return windows." href="/wardrobe" />
        ) : (
          <div className="rack grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {items.slice(0, 4).map((i) => <HangTag key={i.id} item={i} today={today} menu={false} />)}
          </div>
        )}
      </section>

      <StatGrid>
        {[
          ['/search', 'Search before you buy', IconBag],
          ['/wardrobe', 'Scan my inbox', IconEnvelope],
          ['/charges', 'Charges', IconCard],
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
