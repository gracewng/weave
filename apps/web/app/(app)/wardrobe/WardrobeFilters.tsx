'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';

export type Sort = 'newest' | 'price';
export type View = 'rack' | 'summary';

/* One bar, URL-driven so every state is a link: search · sort · returnable · rack/summary. */
export function WardrobeFilters({ q, sort, returnable, view, count }: { q: string; sort: Sort; returnable: boolean; view: View; count: number }) {
  const router = useRouter();
  const path = usePathname();
  const [text, setText] = useState(q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = (patch: Partial<{ q: string; sort: Sort; returnable: boolean; view: View }>) => {
    const next = { q: text, sort, returnable, view, ...patch };
    const p = new URLSearchParams();
    if (next.q.trim()) p.set('q', next.q.trim());
    if (next.sort !== 'newest') p.set('sort', next.sort);
    if (next.returnable) p.set('returnable', '1');
    if (next.view !== 'rack') p.set('view', next.view);
    const qs = p.toString();
    router.replace(`${path}${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  useEffect(() => { setText(q); }, [q]);
  const onText = (v: string) => {
    setText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => go({ q: v }), 250);
  };

  const seg = (on: boolean) => `chip !py-1.5 !px-3 !text-[11px] ${on ? '' : 'bg-transparent hover:bg-mist'}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative min-w-[160px] flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"><Icon name="search" size={14} /></span>
        <input value={text} onChange={(e) => onText(e.target.value)} placeholder="Search your wardrobe" className="input !pl-9 !pr-9" aria-label="Search your wardrobe" />
        {text && <button type="button" onClick={() => onText('')} className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon" aria-label="Clear search"><Icon name="x" size={14} /></button>}
      </label>

      <div className="flex items-center gap-0.5 rounded-full border border-dust p-0.5" role="group" aria-label="Sort">
        <button type="button" className={seg(sort === 'newest')} data-on={sort === 'newest'} onClick={() => go({ sort: 'newest' })}>Newest</button>
        <button type="button" className={seg(sort === 'price')} data-on={sort === 'price'} onClick={() => go({ sort: 'price' })}>Price</button>
      </div>

      <label className="flex cursor-pointer items-center gap-2 px-1 text-sm text-ink-2">
        <input type="checkbox" checked={returnable} onChange={(e) => go({ returnable: e.target.checked })} />
        Returnable
      </label>

      <div className="ml-auto flex items-center gap-0.5 rounded-full border border-dust p-0.5" role="group" aria-label="Layout">
        <button type="button" className={seg(view === 'rack')} data-on={view === 'rack'} onClick={() => go({ view: 'rack' })} title="Hang tags on a rail"><Icon name="wardrobe" size={12} className="mr-1" />Rack</button>
        <button type="button" className={seg(view === 'summary')} data-on={view === 'summary'} onClick={() => go({ view: 'summary' })} title="One receipt, month by month"><Icon name="receipt" size={12} className="mr-1" />Summary</button>
      </div>

      {q && <div className="w-full text-xs text-ink-3">{count === 0 ? `Nothing matches “${q}”.` : `${count} match${count === 1 ? '' : 'es'} for “${q}”`}</div>}
    </div>
  );
}
