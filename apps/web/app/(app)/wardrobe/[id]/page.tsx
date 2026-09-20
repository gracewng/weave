import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Page, PageHeader, Card, CardTitle, Row, Note, Badge, Divider, usd } from '@/components/ui';
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function shortDate(iso: string) { return `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`; }

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
  const credits = (stoodIn ?? []) as Array<{ title: string; price_cents: number; created_at: string }>;
  const subtitle = [it.brand, it.size ? `Size ${it.size}` : null, it.color && it.color !== 'unknown' ? it.color : null].filter(Boolean).join(' · ');

  return (
    <Page>
      <PageHeader
        eyebrow={<Link href="/wardrobe" className="hover:text-ink">← Wardrobe</Link>}
        title={it.name}
        subtitle={subtitle || undefined}
        actions={returnOpen ? <Badge tone="save">Returnable · {daysBetween(today, it.return_by!)} days left</Badge> : it.status === 'returning' ? <Badge tone="pine">Return pending</Badge> : undefined}
      />

      {it.profile_mismatch && <MismatchBanner itemId={it.id} department={it.department} />}

      <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-4">
          <Card tone="paper">
            <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-paper-2">
              {it.image_url ? <img src={it.image_url} alt={it.name} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center px-4 text-center text-sm text-ink-3">No image yet</div>}
            </div>
            {credits.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {credits.map((h, i) => <Badge key={`s${i}`} tone="save">Stood in for {h.price_cents > 0 ? `${usd(h.price_cents)} ` : ''}{h.title.slice(0, 24)} · {shortDate(h.created_at)}</Badge>)}
              </div>
            )}
            <Candidates itemId={it.id} initial={candidates} hasImage={!!it.image_url} imageSource={it.image_source} />
            <Divider />
            <ItemTools itemId={it.id} name={it.name} hasImage={!!it.image_url} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardTitle action={<EditDetails itemId={it.id} name={it.name} brand={it.brand} color={it.color} size={it.size} />}>Purchase</CardTitle>
            <Row label="Paid" value={usd(it.price_cents)} />
            <Row label="Bought" value={it.purchase_date ?? '—'} muted />
            <Row label="At" value={it.retailer ?? '—'} muted />
            <Row label="Source" value={it.source === 'email' ? 'Order email' : it.source} muted />
            {it.receipt_url && <Row label="Receipt" value="On file" muted />}
            {it.identifier && <Row label="Item no." value={it.identifier} muted />}
            {it.image_url && it.image_source && <Row label="Image from" value={it.image_source.replace('_', ' ')} muted />}
            <Row label="Days owned" value={owned != null ? String(owned) : '—'} muted />
            <Divider />
            {returnOpen
              ? <Row label="Return window" value={`Open · ${daysBetween(today, it.return_by!)} days left`} />
              : <Row label="Return window" value={it.return_by ? `Closed ${it.return_by}` : 'Unknown'} muted />}
            {returnOpen && <Note className="mt-1">Still returnable. {usd(it.price_cents)} at stake.</Note>}
          </Card>

          <Card>
            <CardTitle>Sharing</CardTitle>
            <ShareToggles itemId={it.id} shareable={it.shareable} lendable={it.lendable} intimates={it.category === 'intimates'} />
            <Note className="mt-3">Friends see shareable items only. Never the price, purchase date, store or return window.</Note>
          </Card>

          {it.description && (
            <Card>
              <CardTitle hint="What we know about this item">Tagged as</CardTitle>
              <p className="text-sm text-ink-2">{it.description}{it.formality ? ` · formality ${it.formality}/5` : ''}</p>
            </Card>
          )}

          {similar.length > 0 && (
            <Card>
              <CardTitle hint="Semantic neighbors, the “you already own this” signal">Similar in your wardrobe</CardTitle>
              {similar.map((s) => <Row key={s.id} label={<Link href={`/wardrobe/${s.id}`} className="hover:underline">{s.name}</Link>} value={`${Math.round(s.similarity * 100)}%`} muted />)}
            </Card>
          )}
        </div>
      </div>
    </Page>
  );
}
