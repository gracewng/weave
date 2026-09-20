import Link from 'next/link';
import { CardMenu } from '@/components/CardMenu';
import { Icon } from '@/components/Icon';
import { Barcode, Stamp, usd } from '@/components/Tape';
import type { Item, FriendItem } from '@weave/shared/types';

export type TagItem = Pick<Item, 'id' | 'name' | 'brand' | 'retailer' | 'size' | 'price_cents' | 'purchase_date' | 'image_url' | 'shareable' | 'profile_mismatch' | 'status' | 'return_by'>;

const shortDate = (d: string | null) => (d ? `${d.slice(5, 7)}/${d.slice(8, 10)}` : '');

/** One paper hang tag on the rail: photo, name, dotted price leader, its own barcode. Wrap a list of these in `.rack`. */
export function HangTag({ item: i, today, menu = true, showReturnable = true }: { item: TagItem; today: string; menu?: boolean; showReturnable?: boolean }) {
  const returnableNow = i.status === 'owned' && !!i.return_by && i.return_by >= today;
  return (
    <div className="hook group">
      <div className="tag">
        {menu && <CardMenu itemId={i.id} name={i.name} hasImage={!!i.image_url} />}
        <Link href={`/wardrobe/${i.id}`} className="block">
          <div className="relative mt-1 aspect-[3/4] w-full bg-white">
            {i.image_url ? <img src={i.image_url} alt={i.name} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-ink-3"><Icon name="image" size={22} /></div>}
            {!i.shareable && <span className="absolute left-1 top-1 bg-white/90 p-1 text-ink-3" title="Private"><Icon name="lock" size={12} /></span>}
            {i.profile_mismatch && <Stamp tone="warn" className="absolute bottom-1 left-1">Yours?</Stamp>}
            {i.status === 'returning' && <Stamp className="absolute bottom-1 right-1">Returning</Stamp>}
            {returnableNow && showReturnable && <span className="absolute bottom-1 right-1 bg-white/90 p-1 text-ink-3" title={`Returnable until ${i.return_by}`}><Icon name="undo" size={12} /></span>}
          </div>
          <div className="mt-2 truncate font-sans text-[15px] leading-tight" title={i.name}>{i.name}</div>
          <div className="leader muted mt-0.5"><span className="l">{i.brand ?? i.retailer ?? 'Unknown'}{i.size ? ` · ${i.size}` : ''}</span><span className="dots" /><span className="v text-ink">{usd(i.price_cents)}</span></div>
          <Barcode seed={i.id} height={16} className="mt-2 opacity-80" />
          <div className="mt-0.5 flex justify-between text-[9px] text-ink-3"><span>{shortDate(i.purchase_date)}</span><span>{i.id.slice(0, 6).toUpperCase()}</span></div>
        </Link>
      </div>
    </div>
  );
}

export type FriendTagItem = Pick<FriendItem, 'id' | 'name' | 'brand' | 'size' | 'image_url' | 'lendable'>;

/** A friend's item on the same rail: no prices, dates or stores, ever. Shows size and whether it can be lent. */
export function FriendHangTag({ item: i, href, selected = false }: { item: FriendTagItem; href: string; selected?: boolean }) {
  return (
    <div className="hook group">
      <div className={`tag ${selected ? '!border-fern ring-2 ring-fern/40' : ''}`}>
        <Link href={href} className="block">
          <div className="relative mt-1 aspect-[3/4] w-full bg-white">
            {i.image_url ? <img src={i.image_url} alt={i.name} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-ink-3"><Icon name="image" size={22} /></div>}
            {i.lendable && <Stamp tone="save" className="absolute bottom-1 right-1">Lendable</Stamp>}
          </div>
          <div className="mt-2 truncate font-sans text-[15px] leading-tight" title={i.name}>{i.name}</div>
          <div className="leader muted mt-0.5"><span className="l">{i.brand ?? 'Unknown'}</span><span className="dots" /><span className="v text-ink">{i.size ?? '—'}</span></div>
          <Barcode seed={i.id} height={16} className="mt-2 opacity-80" />
          <div className="mt-0.5 flex justify-between text-[9px] text-ink-3"><span>{i.lendable ? 'Ask to borrow' : 'Not lendable'}</span><span>{i.id.slice(0, 6).toUpperCase()}</span></div>
        </Link>
      </div>
    </div>
  );
}
