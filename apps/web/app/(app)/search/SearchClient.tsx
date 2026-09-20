'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Page, PageHeader, Card, CardTitle, Row, Note, Badge, usd } from '@/components/ui';
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
  const searching = stage === 'local' || stage === 'market';
  const memoryScope = local?.memory ? (local.memory.scope === 'brand' ? (local.parsed.brand ?? '') : (local.parsed.category ?? 'item')) : '';

  return (
    <Page>
      <PageHeader title="Before you buy" subtitle={forOther ? 'Shopping for someone else. Your wardrobe and friends are skipped.' : 'Your wardrobe first, then friends, then secondhand. New retail comes last.'} />

      <Card>
        <form onSubmit={(e) => { e.preventDefault(); void run(q, forOther); }}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="black slip dress for a wedding   (press / anywhere)" className="input flex-1" />
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$ price (optional)" inputMode="decimal" className="input sm:w-40" />
            <button className="btn btn-primary" type="submit" disabled={searching}>{searching ? 'Checking…' : 'Check'}</button>
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-ink-2"><input type="checkbox" checked={forOther} onChange={(e) => setForOther(e.target.checked)} /> For someone else (skips your wardrobe and friends)</label>
          {error && <div className="mt-2 text-xs text-warn">{error}</div>}
        </form>
      </Card>

      {stage !== 'idle' && local && (
        <>
          {/* Verdict: provisional after the local stage, final after market */}
          <Card tone="pine">
            <div className="text-xs text-white/70">Verdict</div>
            {market ? (
              <>
                <div className="display mt-1 text-2xl font-semibold sm:text-3xl">{VERDICT_LABEL[market.verdict]}</div>
                <div className="mt-1 text-sm text-white/75">{market.reason}</div>
                <p className="mt-4 text-base">{market.note}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="outline" className="!border-white/30 !text-white/80">{market.noteProvider === 'fixture' ? 'Note: fixture' : `Note: ${market.noteProvider}`}</Badge>
                  <Badge tone="outline" className="!border-white/30 !text-white/80">{priceLabel ? `Price ${priceLabel} (${market.priceSource === 'user' ? 'you entered' : 'from a retail result'})` : 'No price known, so no dollar amount will be claimed'}</Badge>
                </div>
              </>
            ) : (
              <>
                <div className="display mt-1 text-2xl font-semibold sm:text-3xl">{local.provisional ? VERDICT_LABEL[local.provisional] : 'Checking secondhand and retail…'}</div>
                <div className="mt-1 text-sm text-white/75">{local.provisional ? 'Decided from your wardrobe alone. Still checking prices.' : 'Your wardrobe and friends are in. Prices next.'}</div>
              </>
            )}
            {(local.memory && !forOther) || local.budgetRemainingCents != null ? (
              <div className="mt-4 border-t border-white/15 pt-2">
                {local.memory && !forOther && <Row label={`Your median ${memoryScope} purchase`} value={`${usd(local.memory.medianCents)} across ${local.memory.n}`} />}
                {local.budgetRemainingCents != null && <Row label="Left in this month's envelope" value={usd(local.budgetRemainingCents)} />}
              </div>
            ) : null}
          </Card>

          {/* 1. You already own this */}
          {!forOther && (
            <Card>
              <CardTitle action={local.owned.length > 0 ? <Badge tone="pine">{local.owned.length} similar</Badge> : undefined}>You already own this</CardTitle>
              {local.owned.length === 0 && <Note>Nothing owned that matches. That&apos;s fine.</Note>}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {local.owned.slice(0, 3).map((o) => (
                  <div key={o.id} className="cutout p-2">
                    <Link href={`/wardrobe/${o.id}`} className="block aspect-[3/4] w-full rounded-xl bg-paper-2">{o.image_url ? <img src={o.image_url} alt={o.name} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-[10px] text-ink-3">No image</div>}</Link>
                    <div className="mt-2 truncate px-1 text-sm">{o.name}</div>
                    <div className="px-1 text-xs text-ink-3">{Math.round(o.similarity * 100)}% match{o.price_cents != null ? ` · paid ${usd(o.price_cents)}` : ''}</div>
                    <button className="btn btn-save btn-sm mt-2 w-full" disabled={busy || !!decided} onClick={() => decide({ ...base(), decision: 'use_mine', ownedItemId: o.id },
                      { title: 'Purchase voided', lines: [{ label: 'Intended', value: priceLabel ?? 'No price' }, { label: 'Stood in', value: o.name.slice(0, 22) }, { label: 'Paid', value: '$0.00' }, { label: 'Money kept', value: priceLabel ?? '—', saved: !!priceLabel }], footer: priceLabel ? 'Estimated against your intended price' : 'Counted as an action, no dollars claimed' })}>Use mine</button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 2. Borrow */}
          {!forOther && (
            <Card>
              <CardTitle action={local.friends.length > 0 ? <Badge tone="pine">{local.friends.length} from friends, in your size</Badge> : undefined}>Borrow</CardTitle>
              {local.friends.length === 0 && <Note>No friend has one in your size. <Link href="/friends" className="underline">Invite friends</Link>.</Note>}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {local.friends.slice(0, 3).map((f) => (
                  <div key={f.id} className="cutout p-2">
                    <div className="aspect-[3/4] w-full rounded-xl bg-paper-2">{f.image_url && <img src={f.image_url} alt={f.name} className="h-full w-full object-contain" />}</div>
                    <div className="mt-2 truncate px-1 text-sm">{f.name}</div>
                    <div className="px-1 text-xs text-ink-3">{f.owner_name ?? 'Friend'} · {f.size ?? '?'} · {Math.round(f.similarity * 100)}% match</div>
                    <Link href={`/friends/${f.owner_id}?item=${f.id}${market?.priceCents != null ? `&price=${market.priceCents}` : ''}&q=${encodeURIComponent(q)}`} className="btn btn-save btn-sm mt-2 w-full">Ask to borrow</Link>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 3. Secondhand */}
          <Card>
            <CardTitle hint={market ? (market.used.length ? 'Cheapest first' : 'No used listings in this search') : 'Searching…'} action={market && market.used.length > 0 ? <Badge tone="pine">{market.used.length} used listings</Badge> : undefined}>Secondhand</CardTitle>
            {market && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {market.used.map((u, i) => <ListingCard key={i} l={u} busy={busy || !!decided} paid={usedPaid[i] ?? ''} onPaid={(v) => setUsedPaid({ ...usedPaid, [i]: v })}
                    onBuyUsed={() => { const actual = usedPaid[i] ? Math.round(Number(usedPaid[i]) * 100) : u.priceCents; decide({ ...base(), decision: 'bought_used', actualPaidCents: actual, url: u.url, imageUrl: u.imageUrl, source: u.merchant },
                      { title: 'Bought used', lines: [{ label: 'New price', value: priceLabel ?? 'No price' }, { label: 'Paid', value: actual != null ? usd(actual) : '—' }, { label: 'Money kept', value: priceLabel && actual != null ? usd(Math.max(0, (market.priceCents ?? 0) - actual)) : '—', saved: !!priceLabel }], footer: 'Confirmed by you' }); }} />)}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">{market.links.secondhand.map((l) => <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="badge badge-outline hover:bg-paper">{l.name} ↗</a>)}</div>
              </>
            )}
          </Card>

          {/* 4. New */}
          <Card>
            <CardTitle hint={market ? (market.retail.length ? 'Retail, last' : 'No retail results') : 'Searching…'}>New</CardTitle>
            {market && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {market.retail.map((r, i) => <ListingCard key={i} l={r} busy={busy || !!decided} />)}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">{market.links.retail.map((l) => <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="badge badge-outline hover:bg-paper">{l.name} ↗</a>)}</div>
                <div className="mt-5 border-t border-dust/60 pt-4">
                  {decided ? (
                    <div className="text-sm text-ink-2">Recorded: {decided.replace('_', ' ')}. See the <Link href="/ghosts" className="underline">Ghost Rack</Link>.</div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <button className="btn" disabled={busy} onClick={() => decide({ ...base(), decision: 'skip' }, { title: 'Purchase voided', lines: [{ label: 'Intended', value: priceLabel ?? 'No price' }, { label: 'Paid', value: '$0.00' }, { label: 'Money kept', value: priceLabel ?? '—', saved: !!priceLabel }], footer: unpriced ? 'Counted as an action, no dollars claimed' : 'Estimated against your intended price' })}>Skip</button>
                      <button className="btn" disabled={busy} onClick={() => decide({ ...base(), decision: 'hold' }, { title: 'Purchase paused', lines: [{ label: 'Intended', value: priceLabel ?? 'No price' }, { label: 'Next check', value: 'in 48 hours', muted: true }, { label: 'Potential kept', value: priceLabel ?? '—', muted: true }], footer: 'A hold is not yet kept money' })}>Hold 48h</button>
                      <button className="btn-text" disabled={busy} onClick={() => decide({ ...base(), decision: 'buy' }, { title: 'Noted', lines: [{ label: 'Paid', value: priceLabel ?? '—' }], footer: 'Confirmed by you' })}>Buy anyway</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
        </>
      )}
    </Page>
  );
}

function ListingCard({ l, busy, paid, onPaid, onBuyUsed }: { l: Listing; busy: boolean; paid?: string; onPaid?: (v: string) => void; onBuyUsed?: () => void }) {
  return (
    <div className="cutout p-2">
      <a href={l.url ?? '#'} target="_blank" rel="noreferrer" className="block aspect-[3/4] w-full rounded-xl bg-paper-2">{l.imageUrl && <img src={l.imageUrl} alt="" className="h-full w-full object-contain" />}</a>
      <div className="mt-2 truncate px-1 text-xs" title={l.title}>{l.title}</div>
      <div className="flex justify-between px-1 text-xs text-ink-3"><span className="truncate">{l.merchant ?? ''}</span><span className="tabular-nums">{l.priceCents != null ? usd(l.priceCents) : '—'}</span></div>
      {onBuyUsed && (
        <div className="mt-2 flex gap-1">
          <input value={paid} onChange={(e) => onPaid?.(e.target.value)} placeholder={l.priceCents != null ? (l.priceCents / 100).toFixed(2) : 'paid'} inputMode="decimal" className="input input-sm w-20" />
          <button className="btn btn-sm flex-1" disabled={busy} onClick={onBuyUsed}>Buy used</button>
        </div>
      )}
    </div>
  );
}
