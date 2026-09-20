'use client';
import { useEffect } from 'react';
import { secondhandLinks } from '@weave/data';
import { Icon } from '@/components/Icon';
import { usd } from '@/components/Receipt';
import type { Listing } from '@/lib/search/run';

function tokens(s: string) { return new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2)); }
function overlap(a: string, b: string) { const A = tokens(a), B = tokens(b); let n = 0; for (const t of A) if (B.has(t)) n++; return A.size ? n / A.size : 0; }

/** "Buy" on a new listing opens this: the same thing secondhand first, then the retail link. */
export function BuyModal({ item, used, onClose }: { item: Listing; used: Listing[]; onClose: () => void }) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  const ranked = [...used].map((u) => ({ u, fit: overlap(item.title, u.title), saving: item.priceCents != null && u.priceCents != null ? item.priceCents - u.priceCents : null }))
    .sort((a, b) => b.fit - a.fit || (a.u.priceCents ?? 1e9) - (b.u.priceCents ?? 1e9));
  const best = ranked[0];
  const links = secondhandLinks(item.title.slice(0, 80));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={onClose}>
      <div className="card card-paper w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mono text-[10px] uppercase tracking-[.2em] text-ink-3">Before you buy new</div>
            <div className="truncate text-sm" title={item.title}>{item.title}</div>
            <div className="mono text-[11px] text-ink-3">{item.merchant ?? ''}{item.priceCents != null ? ` · ${usd(item.priceCents)} new` : ''}</div>
          </div>
          <button className="text-ink-3 hover:text-ink" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>
        <div className="my-3 border-t border-dashed border-dust" />
        {best ? (
          <>
            <div className="mono mb-2 text-[10px] uppercase text-ink-3">Best fit, secondhand</div>
            <a href={best.u.url ?? '#'} target="_blank" rel="noreferrer" className="cutout flex gap-3 p-2 hover:border-ink">
              <div className="h-24 w-20 shrink-0 bg-paper-2">{best.u.imageUrl && <img src={best.u.imageUrl} alt="" className="h-full w-full object-contain" />}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{best.u.title}</div>
                <div className="mono text-[11px] text-ink-3">{best.u.merchant ?? ''} · {Math.round(best.fit * 100)}% MATCH</div>
                <div className="mono mt-1 text-base">{best.u.priceCents != null ? usd(best.u.priceCents) : '—'}{best.saving != null && best.saving > 0 && <span className="saved ml-2 text-[11px]">{usd(best.saving)} LESS</span>}</div>
              </div>
            </a>
            {ranked.length > 1 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {ranked.slice(1, 4).map(({ u }, i) => (
                  <a key={i} href={u.url ?? '#'} target="_blank" rel="noreferrer" className="cutout p-1 hover:border-ink">
                    <div className="aspect-[3/4] w-full bg-paper-2">{u.imageUrl && <img src={u.imageUrl} alt="" className="h-full w-full object-contain" />}</div>
                    <div className="mono mt-1 flex justify-between text-[9px] text-ink-3"><span className="truncate">{u.merchant ?? ''}</span><span>{u.priceCents != null ? usd(u.priceCents) : ''}</span></div>
                  </a>
                ))}
              </div>
            )}
          </>
        ) : <div className="mono text-[11px] text-ink-3">NO USED LISTINGS IN THIS SEARCH. TRY THE SITES BELOW.</div>}
        <div className="mono mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase text-ink-3">
          {links.map((l) => <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="hover:text-ink">{l.name} ↗</a>)}
        </div>
        <div className="my-3 border-t border-dashed border-dust" />
        <a href={item.url ?? '#'} target="_blank" rel="noreferrer" className="mono block text-center text-[11px] uppercase text-ink-3 hover:text-ink">Buy new anyway ↗</a>
      </div>
    </div>
  );
}
