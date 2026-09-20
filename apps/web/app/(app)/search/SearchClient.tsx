'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
import { printReceipt } from '@/lib/printer';
import { recordDecision, type DecisionInput } from './actions';
import type { LocalStage, MarketStage, Listing } from '@/lib/search/run';

type Stage = 'idle' | 'local' | 'market' | 'done' | 'error';
const VERDICT_LABEL: Record<string, string> = { skip: 'You already own this', borrow: 'Borrow it', secondhand: 'Buy it used', wait: 'Hold 48 hours', buy: 'Your call' };

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

  useEffect(() => { if (initialQ) void run(initialQ, false); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { e.preventDefault(); inputRef.current?.focus(); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  async function run(query: string, other: boolean) {
    const qq = query.trim(); if (!qq) return;
    setStage('local'); setLocal(null); setMarket(null); setError(''); setDecided(null);
    history.replaceState(null, '', `/search?q=${encodeURIComponent(qq)}`);
    try {
      const r1 = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: 'local', q: qq, forOther: other }) });
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

  async function decide(d: DecisionInput, receipt: { title: string; lines: Array<{ label: string; value: string; saved?: boolean; muted?: boolean }>; footer?: string }) {
    if (busy) return; setBusy(true);
    const r = await recordDecision(d);
    setBusy(false);
    if (!r) { setError('Could not record that. Try again.'); return; }
    setDecided(d.decision);
    printReceipt({ ...receipt, ttlMs: 6000 });
  }

  const priceLabel = market?.priceCents != null ? usd(market.priceCents) : null;

  type Card = { key: string; kind: 'mine' | 'friend' | 'used' | 'new'; tag: string; title: string; image: string | null; sub: string; price: number | null; href?: string; action?: () => void; actionLabel?: string };
  const cards: Card[] = [];
  if (local) {
    for (const o of local.owned.slice(0, 4)) cards.push({ key: `m-${o.id}`, kind: 'mine', tag: 'MINE', title: o.name, image: o.image_url, sub: `${Math.round(o.similarity * 100)}% MATCH${o.price_cents != null ? ` · PAID ${usd(o.price_cents)}` : ''}`, price: null, href: `/wardrobe/${o.id}`, actionLabel: decided ? undefined : 'Use mine',
      action: () => decide({ ...base(), decision: 'use_mine', ownedItemId: o.id }, { title: 'Purchase voided', lines: [{ label: 'INTENDED', value: priceLabel ?? 'NO PRICE' }, { label: 'USED', value: o.name.toUpperCase().slice(0, 22) }, { label: 'MONEY KEPT', value: priceLabel ?? '—', saved: !!priceLabel }], footer: priceLabel ? 'ESTIMATE' : 'COUNTED, NO DOLLARS' }) });
    for (const f of local.friends.slice(0, 4)) cards.push({ key: `f-${f.id}`, kind: 'friend', tag: `BORROW FROM ${(f.owner_name ?? 'A FRIEND').toUpperCase()}`, title: f.name, image: f.image_url, sub: `${f.size ?? '?'} · ${Math.round(f.similarity * 100)}% MATCH`, price: null, href: `/friends/${f.owner_id}?item=${f.id}${market?.priceCents != null ? `&price=${market.priceCents}` : ''}&q=${encodeURIComponent(q)}`, actionLabel: 'Ask to borrow' });
  }
  if (market) {
    for (const [i, u] of market.used.entries()) cards.push({ key: `u-${i}`, kind: 'used', tag: 'SECOND HAND', title: u.title, image: u.imageUrl, sub: u.merchant ?? '', price: u.priceCents, href: u.url ?? undefined, actionLabel: 'Buy used' });
    for (const [i, r] of market.retail.entries()) cards.push({ key: `n-${i}`, kind: 'new', tag: 'NEW', title: r.title, image: r.imageUrl, sub: r.merchant ?? '', price: r.priceCents, href: r.url ?? undefined, actionLabel: 'Buy' });
  }
  const TAG: Record<Card['kind'], string> = { mine: 'bg-ink text-paper', friend: 'bg-save text-white', used: 'border border-ink text-ink', new: 'border border-rule text-ink-3' };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <form className="receipt" onSubmit={(e) => { e.preventDefault(); void run(q, false); }}>
        <ReceiptHeader title="Before you buy" subtitle="MINE · BORROW · SECOND HAND · NEW" />
        <ReceiptRule />
        <div className="flex flex-col gap-2 sm:flex-row">
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="black slip dress for a wedding" className="mono flex-1 border border-rule bg-paper p-2 text-sm" />
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$ price (optional)" inputMode="decimal" className="mono w-full border border-rule bg-paper p-2 text-sm sm:w-36" />
          <button className="btn btn-primary" type="submit" disabled={stage === 'local' || stage === 'market'}>Check</button>
        </div>
        {error && <div className="mono mt-2 text-[11px] text-warn">{error}</div>}
      </form>

      {stage !== 'idle' && local && (
        <>
          <Receipt>
            {market ? (
              <>
                <div className="mono text-center text-[10px] tracking-[.3em] text-ink-2">VERDICT</div>
                <div className="mono text-center text-lg font-semibold uppercase">{VERDICT_LABEL[market.verdict]}</div>
                <div className="mono mt-1 text-center text-[11px] text-ink-3">{market.reason}</div>
                <ReceiptRule />
                <p className="text-center text-sm">{market.note}</p>
                <div className="mono mt-2 text-center text-[10px] text-ink-3">{market.noteProvider.toUpperCase()} · {priceLabel ? `${priceLabel} ${market.priceSource === 'user' ? 'ENTERED' : 'FROM RETAIL'}` : 'NO PRICE · NOTHING COUNTED'}</div>
              </>
            ) : (
              <>
                <div className="mono text-center text-[10px] tracking-[.3em] text-ink-2">VERDICT</div>
                <div className="mono text-center text-lg font-semibold uppercase">{local.provisional ? VERDICT_LABEL[local.provisional] : 'Checking prices…'}</div>
                <div className="mono mt-1 text-center text-[11px] text-ink-3">{local.provisional ? 'From your wardrobe. Checking prices…' : 'Checking prices…'}</div>
              </>
            )}
            {local.memory && <><ReceiptRule /><ReceiptLine label={`YOU USUALLY PAY (${local.memory.scope === 'brand' ? (local.parsed.brand ?? '').toUpperCase() : (local.parsed.category ?? 'ITEM').toUpperCase()})`} value={`${usd(local.memory.medianCents)} · ${local.memory.n} BUYS`} muted /></>}
            {local.budgetRemainingCents != null && <ReceiptLine label="ENVELOPE LEFT" value={usd(local.budgetRemainingCents)} muted />}
          </Receipt>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {cards.map((c) => (
              <div key={c.key} className="cutout print flex flex-col p-2">
                <span className={`mono self-start px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${TAG[c.kind]}`}>{c.tag}</span>
                {c.href && (c.kind === 'mine' || c.kind === 'friend') ? (
                  <Link href={c.href} className="mt-2 block aspect-[3/4] w-full bg-paper-2">{c.image ? <img src={c.image} alt={c.title} className="h-full w-full object-contain" /> : <div className="mono flex h-full items-center justify-center text-[10px] text-ink-3">NO IMAGE</div>}</Link>
                ) : (
                  <a href={c.href ?? '#'} target="_blank" rel="noreferrer" className="mt-2 block aspect-[3/4] w-full bg-paper-2">{c.image && <img src={c.image} alt="" className="h-full w-full object-contain" />}</a>
                )}
                <div className="mt-1 truncate text-xs" title={c.title}>{c.title}</div>
                <div className="mono flex justify-between text-[10px] text-ink-3"><span className="truncate">{c.sub}</span>{c.price != null && <span>{usd(c.price)}</span>}</div>
                {c.actionLabel && (c.action
                  ? <button className="btn btn-save mt-2 w-full !py-1 !text-[10px]" disabled={busy} onClick={c.action}>{c.actionLabel}</button>
                  : c.kind === 'friend'
                    ? <Link href={c.href!} className="btn btn-save mt-2 block w-full !py-1 text-center !text-[10px]">{c.actionLabel}</Link>
                    : <a href={c.href ?? '#'} target="_blank" rel="noreferrer" className={`btn mt-2 block w-full !py-1 text-center !text-[10px] ${c.kind === 'new' ? '' : ''}`}>{c.actionLabel}</a>)}
              </div>
            ))}
            {market && cards.length === 0 && <div className="mono col-span-full text-[11px] text-ink-3">NOTHING FOUND. TRY FEWER WORDS.</div>}
          </div>
          {market && (
            <div className="mono flex flex-wrap gap-x-4 gap-y-1 text-[10px] uppercase text-ink-3">
              {market.links.secondhand.map((l) => <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="hover:text-ink">{l.name} ↗</a>)}
              {market.links.retail.map((l) => <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="hover:text-ink">{l.name} ↗</a>)}
              {decided && <span className="ml-auto text-save">RECORDED · <Link href="/search" className="underline">ALMOST BOUGHT</Link></span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

