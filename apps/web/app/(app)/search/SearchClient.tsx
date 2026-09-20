'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
import { printReceipt } from '@/lib/printer';
import { recordDecision, type DecisionInput } from './actions';
import type { LocalStage, MarketStage, Listing } from '@/lib/search/run';

type Stage = 'idle' | 'local' | 'market' | 'done' | 'error';
const VERDICT_LABEL: Record<string, string> = { skip: 'You already own this', borrow: 'Borrow it', secondhand: 'Buy it used', wait: 'Hold 48 hours', buy: 'Buying is allowed' };

export function SearchClient({ initialQ, initialForOther }: { initialQ: string; initialForOther: boolean }) {
  const [q, setQ] = useState(initialQ);
  const [forOther, setForOther] = useState(initialForOther);
  const [price, setPrice] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [local, setLocal] = useState<LocalStage | null>(null);
  const [market, setMarket] = useState<MarketStage | null>(null);
  const [error, setError] = useState('');
  const [decided, setDecided] = useState<string | null>(null);
  const [usedPaid, setUsedPaid] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (initialQ) void run(initialQ, initialForOther); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { e.preventDefault(); inputRef.current?.focus(); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  async function run(query: string, other: boolean) {
    const qq = query.trim(); if (!qq) return;
    setStage('local'); setLocal(null); setMarket(null); setError(''); setDecided(null);
    history.replaceState(null, '', `/search?q=${encodeURIComponent(qq)}${other ? '&for=other' : ''}`);
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
      similarIds: local?.owned.slice(0, 3).map((o) => o.id) ?? [], friendIds: local?.friends.slice(0, 3).map((f) => f.id) ?? [], cheapestUsedCents: market?.cheapestUsedCents ?? null, forOther, source: top?.merchant ?? null };
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
  const unpriced = market != null && market.priceCents == null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <form className="receipt" onSubmit={(e) => { e.preventDefault(); void run(q, forOther); }}>
        <ReceiptHeader title="Before you buy" subtitle={forOther ? 'SHOPPING FOR SOMEONE ELSE' : 'YOUR WARDROBE · FRIENDS · SECONDHAND · NEW'} />
        <ReceiptRule />
        <div className="flex flex-col gap-2 sm:flex-row">
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="black slip dress for a wedding   (press / anywhere)" className="mono flex-1 border border-rule bg-paper p-2 text-sm" />
          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$ price (optional)" inputMode="decimal" className="mono w-full border border-rule bg-paper p-2 text-sm sm:w-36" />
          <button className="btn btn-primary" type="submit" disabled={stage === 'local' || stage === 'market'}>Check</button>
        </div>
        <label className="mono mt-2 flex items-center gap-2 text-[11px] uppercase text-ink-3"><input type="checkbox" checked={forOther} onChange={(e) => setForOther(e.target.checked)} /> For someone else (skips your wardrobe and friends)</label>
        {error && <div className="mono mt-2 text-[11px] text-warn">{error}</div>}
      </form>

      {stage !== 'idle' && local && (
        <>
          {/* Verdict line: provisional after local stage, final after market */}
          <Receipt print>
            {market ? (
              <>
                <div className="mono text-center text-[10px] tracking-[.3em] text-ink-2">VERDICT</div>
                <div className="mono text-center text-lg font-semibold uppercase">{VERDICT_LABEL[market.verdict]}</div>
                <div className="mono mt-1 text-center text-[11px] text-ink-3">{market.reason}</div>
                <ReceiptRule />
                <p className="text-center text-sm">{market.note}</p>
                <div className="mono mt-2 text-center text-[10px] text-ink-3">{market.noteProvider === 'fixture' ? 'NOTE: FIXTURE' : `NOTE: ${market.noteProvider.toUpperCase()}`} · {priceLabel ? `PRICE ${priceLabel} (${market.priceSource === 'user' ? 'YOU ENTERED' : 'FROM RETAIL RESULT'})` : 'NO PRICE KNOWN — NO DOLLAR AMOUNT WILL BE CLAIMED'}</div>
              </>
            ) : (
              <>
                <div className="mono text-center text-[10px] tracking-[.3em] text-ink-2">VERDICT</div>
                <div className="mono text-center text-lg font-semibold uppercase">{local.provisional ? VERDICT_LABEL[local.provisional] : 'Checking secondhand and retail…'}</div>
                <div className="mono mt-1 text-center text-[11px] text-ink-3">{local.provisional ? 'Decided from your wardrobe alone. Still checking prices.' : 'Your wardrobe and friends are in. Prices next.'}</div>
              </>
            )}
            {local.memory && !forOther && (
              <><ReceiptRule /><ReceiptLine label={`YOUR MEDIAN ${local.memory.scope === 'brand' ? (local.parsed.brand ?? '').toUpperCase() : (local.parsed.category ?? 'ITEM').toUpperCase()} PURCHASE`} value={`${usd(local.memory.medianCents)} · n=${local.memory.n}`} muted /></>
            )}
            {local.budgetRemainingCents != null && <ReceiptLine label="LEFT IN THIS MONTH'S ENVELOPE" value={usd(local.budgetRemainingCents)} muted />}
          </Receipt>

          {/* 1. You already own this */}
          {!forOther && (
            <Receipt print>
              <ReceiptHeader title="1 · You already own this" subtitle={local.owned.length ? `${local.owned.length} SIMILAR · SORTED BY FEWEST WEARS` : undefined} />
              <ReceiptRule />
              {local.owned.length === 0 && <ReceiptLine label="NOTHING OWNED" value="that's fine" muted />}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {local.owned.slice(0, 3).map((o) => (
                  <div key={o.id} className="cutout p-2">
                    <Link href={`/wardrobe/${o.id}`} className="block aspect-[3/4] w-full bg-paper-2">{o.image_url ? <img src={o.image_url} alt={o.name} className="h-full w-full object-contain" /> : <div className="mono flex h-full items-center justify-center text-[10px] text-ink-3">NO IMAGE</div>}</Link>
                    <div className="mt-1 truncate text-sm">{o.name}</div>
                    <div className="mono text-[10px] text-ink-3">{Math.round(o.similarity * 100)}% · {o.wears} WEAR{o.wears === 1 ? '' : 'S'}{o.cpw != null ? ` · ${usd(o.cpw)}/WEAR` : ''}{o.price_cents != null ? ` · PAID ${usd(o.price_cents)}` : ''}</div>
                    <button className="btn btn-save mt-2 w-full !py-1 !text-[10px]" disabled={busy || !!decided} onClick={() => decide({ ...base(), decision: 'wear_mine', woreItemId: o.id },
                      { title: 'Purchase voided', lines: [{ label: 'INTENDED', value: priceLabel ?? 'NO PRICE' }, { label: 'STOOD IN', value: o.name.toUpperCase().slice(0, 22) }, { label: 'PAID', value: '$0.00' }, { label: 'MONEY KEPT', value: priceLabel ?? '—', saved: !!priceLabel }], footer: priceLabel ? 'ESTIMATED AGAINST YOUR INTENDED PRICE' : 'COUNTED AS AN ACTION, NO DOLLARS CLAIMED' })}>Wear mine</button>
                  </div>
                ))}
              </div>
            </Receipt>
          )}

          {/* 2. Borrow */}
          {!forOther && (
            <Receipt print>
              <ReceiptHeader title="2 · Borrow" subtitle={local.friends.length ? `${local.friends.length} FROM FRIENDS · IN YOUR SIZE` : undefined} />
              <ReceiptRule />
              {local.friends.length === 0 && <ReceiptLine label="NO FRIEND HAS ONE IN YOUR SIZE" value={<Link href="/friends" className="underline">invite friends</Link>} muted />}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {local.friends.slice(0, 3).map((f) => (
                  <div key={f.id} className="cutout p-2">
                    <div className="aspect-[3/4] w-full bg-paper-2">{f.image_url && <img src={f.image_url} alt={f.name} className="h-full w-full object-contain" />}</div>
                    <div className="mt-1 truncate text-sm">{f.name}</div>
                    <div className="mono text-[10px] text-ink-3">{(f.owner_name ?? 'FRIEND').toUpperCase()} · {f.size ?? '?'} · {Math.round(f.similarity * 100)}%</div>
                    <Link href={`/friends/${f.owner_id}?item=${f.id}${market?.priceCents != null ? `&price=${market.priceCents}` : ''}&q=${encodeURIComponent(q)}`} className="btn btn-save mt-2 block w-full !py-1 text-center !text-[10px]">Ask to borrow</Link>
                  </div>
                ))}
              </div>
            </Receipt>
          )}

          {/* 3. Secondhand */}
          <Receipt print>
            <ReceiptHeader title="3 · Secondhand" subtitle={market ? (market.used.length ? `${market.used.length} USED LISTINGS · CHEAPEST FIRST` : 'NO USED LISTINGS IN THIS SEARCH') : 'SEARCHING…'} />
            <ReceiptRule />
            {market && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {market.used.map((u, i) => <ListingCard key={i} l={u} busy={busy || !!decided} paid={usedPaid[i] ?? ''} onPaid={(v) => setUsedPaid({ ...usedPaid, [i]: v })}
                    onBuyUsed={() => { const actual = usedPaid[i] ? Math.round(Number(usedPaid[i]) * 100) : u.priceCents; decide({ ...base(), decision: 'bought_used', actualPaidCents: actual, url: u.url, imageUrl: u.imageUrl, source: u.merchant },
                      { title: 'Bought used', lines: [{ label: 'NEW PRICE', value: priceLabel ?? 'NO PRICE' }, { label: 'PAID', value: actual != null ? usd(actual) : '—' }, { label: 'MONEY KEPT', value: priceLabel && actual != null ? usd(Math.max(0, (market.priceCents ?? 0) - actual)) : '—', saved: !!priceLabel }], footer: 'CONFIRMED BY YOU' }); }} />)}
                </div>
                <div className="mono mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-3">{market.links.secondhand.map((l) => <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="hover:text-ink">{l.name} ↗</a>)}</div>
              </>
            )}
          </Receipt>

          {/* 4. New */}
          <Receipt print>
            <ReceiptHeader title="4 · New" subtitle={market ? (market.retail.length ? 'RETAIL, LAST' : 'NO RETAIL RESULTS') : 'SEARCHING…'} />
            <ReceiptRule />
            {market && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {market.retail.map((r, i) => <ListingCard key={i} l={r} busy={busy || !!decided} />)}
                </div>
                <div className="mono mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-3">{market.links.retail.map((l) => <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="hover:text-ink">{l.name} ↗</a>)}</div>
                <ReceiptRule />
                {decided ? (
                  <div className="mono text-center text-[11px] text-ink-3">RECORDED · {decided.replace('_', ' ').toUpperCase()} · <Link href="/ghosts" className="underline">GHOST RACK</Link></div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <button className="btn" disabled={busy} onClick={() => decide({ ...base(), decision: 'skip' }, { title: 'Purchase voided', lines: [{ label: 'INTENDED', value: priceLabel ?? 'NO PRICE' }, { label: 'PAID', value: '$0.00' }, { label: 'MONEY KEPT', value: priceLabel ?? '—', saved: !!priceLabel }], footer: unpriced ? 'COUNTED AS AN ACTION, NO DOLLARS CLAIMED' : 'ESTIMATED AGAINST YOUR INTENDED PRICE' })}>Skip</button>
                    <button className="btn" disabled={busy} onClick={() => decide({ ...base(), decision: 'hold' }, { title: 'Purchase paused', lines: [{ label: 'INTENDED', value: priceLabel ?? 'NO PRICE' }, { label: 'NEXT CHECK', value: 'IN 48 HOURS', muted: true }, { label: 'POTENTIAL KEPT', value: priceLabel ?? '—', muted: true }], footer: 'A HOLD IS NOT YET KEPT MONEY' })}>Hold 48h</button>
                    <button className="mono text-[11px] uppercase text-ink-3 hover:text-ink" disabled={busy} onClick={() => decide({ ...base(), decision: 'buy' }, { title: 'Noted', lines: [{ label: 'PAID', value: priceLabel ?? '—' }, { label: 'COST PER WEAR', value: `${priceLabel ?? '—'} / 0 WEARS`, muted: true }], footer: 'LOG THE FIRST WEAR WHEN IT ARRIVES' })}>Buy anyway</button>
                  </div>
                )}
              </>
            )}
          </Receipt>
        </>
      )}
    </div>
  );
}

function ListingCard({ l, busy, paid, onPaid, onBuyUsed }: { l: Listing; busy: boolean; paid?: string; onPaid?: (v: string) => void; onBuyUsed?: () => void }) {
  return (
    <div className="cutout p-2">
      <a href={l.url ?? '#'} target="_blank" rel="noreferrer" className="block aspect-[3/4] w-full bg-paper-2">{l.imageUrl && <img src={l.imageUrl} alt="" className="h-full w-full object-contain" />}</a>
      <div className="mt-1 truncate text-xs" title={l.title}>{l.title}</div>
      <div className="mono flex justify-between text-[10px] text-ink-3"><span className="truncate">{l.merchant ?? ''}</span><span>{l.priceCents != null ? usd(l.priceCents) : '—'}</span></div>
      {onBuyUsed && (
        <div className="mt-1 flex gap-1">
          <input value={paid} onChange={(e) => onPaid?.(e.target.value)} placeholder={l.priceCents != null ? (l.priceCents / 100).toFixed(2) : 'paid'} inputMode="decimal" className="mono w-16 border border-rule bg-paper p-1 text-[10px]" />
          <button className="btn flex-1 !px-1 !py-1 !text-[10px]" disabled={busy} onClick={onBuyUsed}>Buy used</button>
        </div>
      )}
    </div>
  );
}
