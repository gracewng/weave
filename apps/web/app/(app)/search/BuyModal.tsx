'use client';
import { useEffect } from 'react';
import { secondhandLinks } from '@weave/data';
import { Icon } from '@/components/Icon';
import { Badge, usd } from '@/components/ui';
import type { Listing } from '@/lib/search/run';

function tokens(s: string) { return new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2)); }
function overlap(a: string, b: string) { const A = tokens(a), B = tokens(b); let n = 0; for (const t of A) if (B.has(t)) n++; return A.size ? n / A.size : 0; }

/* Which marketplace to lead with when the search itself found no used listing. */
const LUXURY = /\b(gucci|prada|chanel|louis vuitton|dior|hermes|burberry|celine|loewe|bottega|balenciaga|saint laurent|ysl|cartier)\b/i;
const MENS = /\b(men'?s|mens|grailed|jordan|supreme|carhartt)\b/i;
function leadMarketplace(title: string, links: ReturnType<typeof secondhandLinks>) {
  const want = LUXURY.test(title) ? 'the_realreal' : MENS.test(title) ? 'grailed' : 'poshmark';
  return links.find((l) => l.id === want) ?? links.find((l) => l.id === 'depop') ?? links[0];
}

/** "Buy" on a new listing opens this: one secondhand pick first, more places to look, and the retail link last. */
export function BuyModal({ item, used, onClose }: { item: Listing; used: Listing[]; onClose: () => void }) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  const ranked = [...used].map((u) => ({ u, fit: overlap(item.title, u.title), saving: item.priceCents != null && u.priceCents != null ? item.priceCents - u.priceCents : null }))
    .sort((a, b) => b.fit - a.fit || (a.u.priceCents ?? 1e9) - (b.u.priceCents ?? 1e9));
  const best = ranked[0];
  const links = secondhandLinks(item.title.slice(0, 80));
  const lead = leadMarketplace(item.title, links);
  const others = links.filter((l) => l.id !== lead?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-pine/40 p-3 backdrop-blur-[2px] sm:items-center" onClick={onClose}>
      <div className="card card-paper w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Before you buy new">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="display text-[11px] text-ink-3">Before you buy new</div>
            <div className="mt-1 truncate text-base font-medium" title={item.title}>{item.title}</div>
            <div className="text-xs text-ink-3">{item.merchant ?? ''}{item.priceCents != null ? ` · ${usd(item.priceCents)} new` : ''}</div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between"><span className="display text-xs text-ink-2">Our pick</span><span className="text-xs text-ink-3">second hand first</span></div>
          {best ? (
            <a href={best.u.url ?? '#'} target="_blank" rel="noreferrer" className="card card-sprout card-hover flex items-center gap-4 !p-3">
              <div className="h-24 w-[72px] shrink-0 overflow-hidden rounded-xl bg-white">{best.u.imageUrl && <img src={best.u.imageUrl} alt="" className="h-full w-full object-contain" />}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{best.u.title}</div>
                <div className="text-xs text-ink-2">{best.u.merchant ?? 'Resale'} · {Math.round(best.fit * 100)}% match</div>
                <div className="mt-1 flex items-baseline gap-2"><span className="display text-xl text-pine">{best.u.priceCents != null ? usd(best.u.priceCents) : '—'}</span>{best.saving != null && best.saving > 0 && <Badge tone="save">{usd(best.saving)} less than new</Badge>}</div>
              </div>
              <span className="btn btn-primary btn-sm shrink-0">Buy used</span>
            </a>
          ) : lead ? (
            <a href={lead.url} target="_blank" rel="noreferrer" className="card card-sprout card-hover flex items-center gap-4 !p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-xl">{lead.logoEmoji ?? '↗'}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Search {lead.name} for this</div>
                <div className="text-xs text-ink-2">Nothing used turned up in this search yet. {lead.name} is the best bet for this kind of piece.</div>
              </div>
              <span className="btn btn-primary btn-sm shrink-0">Open</span>
            </a>
          ) : null}
        </div>

        {(ranked.length > 1 || others.length > 0) && (
          <div className="mt-4">
            <div className="mb-2 display text-xs text-ink-2">More places</div>
            {ranked.length > 1 && (
              <div className="mb-3 grid grid-cols-3 gap-2">
                {ranked.slice(1, 4).map(({ u }, i) => (
                  <a key={i} href={u.url ?? '#'} target="_blank" rel="noreferrer" className="cutout p-1.5 transition hover:border-fern">
                    <div className="aspect-[3/4] w-full rounded-lg bg-paper-2">{u.imageUrl && <img src={u.imageUrl} alt="" className="h-full w-full object-contain" />}</div>
                    <div className="mt-1 flex justify-between text-[10px] text-ink-3"><span className="truncate">{u.merchant ?? ''}</span><span>{u.priceCents != null ? usd(u.priceCents) : ''}</span></div>
                  </a>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {(best ? links : others).map((l) => <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="chip !py-1.5 !px-3 !text-[11px]">{l.name}</a>)}
            </div>
          </div>
        )}

        <div className="mt-5 border-t border-dust/60 pt-3 text-center">
          <a href={item.url ?? '#'} target="_blank" rel="noreferrer" className="btn-text">Buy new anyway ↗</a>
        </div>
      </div>
    </div>
  );
}
