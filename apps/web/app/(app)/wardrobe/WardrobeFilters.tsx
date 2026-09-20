'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';

export type Sort = 'newest' | 'price';
export type View = 'rack' | 'summary';

/* One quiet toolbar, URL-driven so every state is a link.
   Search on the left; sort as a segmented control, Returnable as a filter chip, and an icon-only layout switch on the right. */
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

  return (
    <div className="toolbar">
      <label className="search">
        <Icon name="search" size={14} />
        <input value={text} onChange={(e) => onText(e.target.value)} placeholder="Search" aria-label="Search your wardrobe" />
        {text && <button type="button" onClick={() => onText('')} aria-label="Clear search"><Icon name="x" size={12} /></button>}
      </label>

      <div className="seg" role="group" aria-label="Sort">
        <button type="button" data-on={sort === 'newest'} onClick={() => go({ sort: 'newest' })}>Newest</button>
        <button type="button" data-on={sort === 'price'} onClick={() => go({ sort: 'price' })}>Price</button>
      </div>

      <button type="button" className="filter-chip" data-on={returnable} aria-pressed={returnable} onClick={() => go({ returnable: !returnable })}>
        <span className="tick"><Icon name="check" size={10} /></span>Returnable
      </button>

      <div className="seg ml-auto" role="group" aria-label="Layout">
        <button type="button" data-on={view === 'rack'} onClick={() => go({ view: 'rack' })} title="Rack" aria-label="Rack"><Icon name="wardrobe" size={15} /></button>
        <button type="button" data-on={view === 'summary'} onClick={() => go({ view: 'summary' })} title="Summary" aria-label="Summary"><Icon name="receipt" size={15} /></button>
      </div>

      {q && <div className="w-full text-xs text-ink-3">{count === 0 ? `Nothing matches “${q}”.` : `${count} match${count === 1 ? '' : 'es'}`}</div>}
    </div>
  );
}
