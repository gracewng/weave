'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Card, CardTitle, Badge, usd } from '@/components/ui';
import { Barcode, Stamp } from '@/components/Tape';
import { printReceipt } from '@/lib/printer';
import { recordDecision, type DecisionInput } from './actions';
import type { LocalStage, MarketStage, Listing } from '@/lib/search/run';
import { BuyModal } from './BuyModal';
import { Icon } from '@/components/Icon';

type Stage = 'idle' | 'local' | 'market' | 'done' | 'error';
const VERDICT_LABEL: Record<string, string> = { skip: 'You already own this', borrow: 'Borrow it', secondhand: 'Buy it used', wait: 'Wait on this one', buy: 'Your call' };
const VERDICT_TONE: Record<string, 'sprout' | 'mist' | 'paper'> = { skip: 'sprout', borrow: 'sprout', secondhand: 'mist', wait: 'paper', buy: 'mist' };

export function SearchClient({ initialQ }: { initialQ: string }) {
  const [q, setQ] = useState(initialQ);
  const [price, setPrice] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [local, setLocal] = useState<LocalStage | null>(null);
  const [market, setMarket] = useState<MarketStage | null>(null);
  const [error, setError] = useState('');
  const [decided, setDecided] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [buying, setBuying] = useState<Listing | null>(null);

  useEffect(() => { if (initialQ) void run(initialQ); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { e.preventDefault(); inputRef.current?.focus(); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  async function run(query: string) {
    const qq = query.trim(); if (!qq) return;
    setStage('local'); setLocal(null); setMarket(null); setError(''); setDecided(null);
    history.replaceState(null, '', `/search?q=${encodeURIComponent(qq)}`);
    try {
      const r1 = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: 'local', q: qq, forOther: false }) });
      if (!r1.ok) throw new Error((await r1.json()).error ?? r1.statusText);
      const l = (await r1.json()) as LocalStage; setLocal(l); setStage('market');
      const userPrice = price ? Math.round(Number(price) * 100) : null;
      const r2 = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: 'market', local: l, priceCents: Number.isFinite(userPrice) ? userPrice : null }) });
      if (!r2.ok) throw new Error((await r2.json()).error ?? r2.statusText);
      setMarket((await r2.json()) as MarketStage); setStage('done');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); setStage('error'); }
  }

  function base(): Omit<DecisionInput, 'decision'> {
    const top = market?.retail[0];
    return { title: top?.title ?? local?.parsed.query ?? q, url: top?.url ?? null, imageUrl: top?.imageUrl ?? null, priceCents: market?.priceCents ?? null, query: q, verdict: market?.verdict ?? local?.provisional ?? null,
      similarIds: local?.owned.slice(0, 3).map((o) => o.id) ?? [], friendIds: local?.friends.slice(0, 3).map((f) => f.id) ?? [], cheapestUsedCents: market?.cheapestUsedCents ?? null, forOther: false, source: top?.merchant ?? null };
  }

  async function useMine(o: { id: string; name: string }) {
    if (busy) return; setBusy(true);
    const r = await recordDecision({ ...base(), decision: 'use_mine', ownedItemId: o.id });
    setBusy(false);
    if (!r) { setError('Could not record that. Try again.'); return; }
    setDecided('use_mine');
    printReceipt({ title: 'Purchase voided', lines: [{ label: 'Intended', value: priceLabel ?? 'No price' }, { label: 'Wearing', value: o.name.slice(0, 22) }, { label: 'Money kept', value: priceLabel ?? '—', saved: !!priceLabel }], footer: priceLabel ? 'Estimate' : 'Counted, no dollars', ttlMs: 6000 });
  }

  const priceLabel = market?.priceCents != null ? usd(market.priceCents) : null;
  const verdict = market?.verdict ?? local?.provisional ?? null;
  const searching = stage === 'local' || stage === 'market';

  type Result = { key: string; kind: 'friend' | 'used' | 'new'; stamp: string; title: string; image: string | null; sub: string; price: number | null; href?: string; onBuy?: () => void };
  const results: Result[] = [];
  if (local) for (const f of local.friends.slice(0, 4)) results.push({ key: `f-${f.id}`, kind: 'friend', stamp: `Borrow · ${(f.owner_name ?? 'a friend').split(' ')[0]}`, title: f.name, image: f.image_url, sub: `${f.size ?? 'size ?'} · ${Math.round(f.similarity * 100)}% match`, price: null, href: `/friends/${f.owner_id}?item=${f.id}${market?.priceCents != null ? `&price=${market.priceCents}` : ''}&q=${encodeURIComponent(q)}` });
  if (market) {
    for (const [i, u] of market.used.entries()) results.push({ key: `u-${i}`, kind: 'used', stamp: 'Second hand', title: u.title, image: u.imageUrl, sub: u.merchant ?? '', price: u.priceCents, href: u.url ?? undefined });
    for (const [i, r] of market.retail.entries()) results.push({ key: `n-${i}`, kind: 'new', stamp: 'New', title: r.title, image: r.imageUrl, sub: r.merchant ?? '', price: r.priceCents, href: r.url ?? undefined, onBuy: () => setBuying(r) });
  }

  return (
    <div className="space-y-6">
      <form className="card card-mist" onSubmit={(e) => { e.preventDefault(); void run(q); }}>
        <CardTitle hint="Owned first, then friends, second hand, and new">Before you buy</CardTitle>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="black slip dress for a wedding" className="input min-w-0 flex-1" />
          <span className="block shrink-0 sm:w-32"><input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$ price" inputMode="decimal" className="input" /></span>
          <button className="btn btn-primary" type="submit" disabled={searching}>{searching ? 'Checking…' : 'Check'}</button>
        </div>
        {error && <div className="mt-2 text-xs text-warn">{error}</div>}
      </form>

      {buying && market && <BuyModal item={buying} used={market.used} onClose={() => setBuying(null)} />}

      {stage !== 'idle' && local && (
        <>
          <Card tone={verdict ? VERDICT_TONE[verdict] : 'mist'}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="display text-[11px] text-ink-3">Verdict</div>
                <div className="display mt-1 text-2xl font-semibold text-pine">{verdict ? VERDICT_LABEL[verdict] : 'Checking…'}</div>
                <p className="mt-2 max-w-xl text-sm text-ink-2">{market ? market.note : local.provisional ? 'Found in your wardrobe. Checking prices…' : 'Checking your wardrobe and prices…'}</p>
                {market && verdict !== 'buy' && market.reason && <div className="mt-1 text-xs text-ink-3">{market.reason}</div>}
              </div>
              <div className="flex flex-col items-end gap-1.5 text-right text-xs text-ink-2">
                {priceLabel && <Badge tone="outline">{priceLabel} {market?.priceSource === 'user' ? 'your price' : 'new'}</Badge>}
                {local.memory && <span>You usually pay <span className="font-medium text-ink">{usd(local.memory.medianCents)}</span> for {local.memory.scope === 'brand' ? (local.parsed.brand ?? 'this brand') : (local.parsed.category ?? 'this')} · {local.memory.n} buys</span>}
                {local.budgetRemainingCents != null && <span>{usd(local.budgetRemainingCents)} left this month</span>}
                {decided && <Badge tone="save">Recorded</Badge>}
              </div>
            </div>
          </Card>

          {local.owned.length > 0 && (
            <section>
              <div className="mb-2 flex items-baseline justify-between"><h2 className="display text-xs text-ink-2">You already own</h2><span className="text-xs text-ink-3">closest first</span></div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {local.owned.slice(0, 6).map((o) => (
                  <div key={o.id} className="tag w-36 shrink-0 !p-2">
                    <Link href={`/wardrobe/${o.id}`} className="block">
                      <div className="mt-1 aspect-[3/4] w-full bg-white">{o.image_url ? <img src={o.image_url} alt={o.name} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-ink-3"><Icon name="image" size={16} /></div>}</div>
                      <div className="mt-1.5 truncate font-sans text-xs" title={o.name}>{o.name}</div>
                      <div className="text-[10px] text-ink-3">{Math.round(o.similarity * 100)}% match</div>
                    </Link>
                    {!decided && <button className="btn btn-sm btn-save mt-2 w-full" disabled={busy} onClick={() => useMine(o)}>Use mine</button>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {(results.length > 0 || market) && (
            <section>
              <div className="mb-2 flex items-baseline justify-between"><h2 className="display text-xs text-ink-2">{market ? 'Borrow · second hand · new' : 'Friends'}</h2>{market && <span className="text-xs text-ink-3">{results.length} found</span>}</div>
              {results.length === 0 ? (
                <div className="py-8 text-center text-sm text-ink-3">Nothing found. Try fewer words.</div>
              ) : (
                <div className="rack grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {results.map((r) => (
                    <div key={r.key} className="hook">
                      <div className="tag flex flex-col">
                        {r.kind === 'friend' && r.href ? (
                          <Link href={r.href} className="relative mt-1 block aspect-[3/4] w-full bg-white">{r.image ? <img src={r.image} alt={r.title} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-ink-3"><Icon name="image" size={22} /></div>}<Stamp tone="save" className="absolute bottom-1 left-1">{r.stamp}</Stamp></Link>
                        ) : (
                          <a href={r.href ?? '#'} target="_blank" rel="noreferrer" className="relative mt-1 block aspect-[3/4] w-full bg-white">{r.image ? <img src={r.image} alt={r.title} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-ink-3"><Icon name="image" size={22} /></div>}<Stamp tone={r.kind === 'used' ? 'save' : 'ink'} className="absolute bottom-1 left-1">{r.stamp}</Stamp></a>
                        )}
                        <div className="mt-2 truncate font-sans text-[15px] leading-tight" title={r.title}>{r.title}</div>
                        <div className="leader muted mt-0.5"><span className="l">{r.sub}</span><span className="dots" /><span className="v text-ink">{r.price != null ? usd(r.price) : '—'}</span></div>
                        <Barcode seed={r.key + r.title} height={12} className="mt-2 opacity-70" />
                        <div className="mt-auto pt-3">
                          {r.kind === 'friend' && <Link href={r.href!} className="btn btn-sm btn-save block w-full text-center">Ask to borrow</Link>}
                          {r.kind === 'used' && <a href={r.href ?? '#'} target="_blank" rel="noreferrer" className="btn btn-sm block w-full text-center">Buy used</a>}
                          {r.kind === 'new' && <button className="btn btn-sm btn-primary w-full" disabled={busy} onClick={r.onBuy}>Buy</button>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
