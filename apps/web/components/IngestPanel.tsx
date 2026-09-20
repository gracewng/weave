'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, usd } from '@/components/ui';
import { TapeHeader, TapeLine, TapeRule, TapeTotal } from '@/components/Tape';
import { Icon } from '@/components/Icon';

type Counters = { scanned: number; prefiltered: number; sent: number; clothingOrders: number; itemsFound: number; duplicates: number; failed: number; costUsd: number; tokens: number; cached: number };
type RecentItem = { id: string; name: string; brand: string | null; price_cents: number | null; image_url: string | null; retailer: string | null };
type Ev =
  | { type: 'start'; mode: 'gmail' | 'fixture'; total: number }
  | { type: 'progress'; counters: Counters; subject?: string; retailer?: string; provider?: string }
  | { type: 'item'; item: RecentItem }
  | { type: 'done'; counters: Counters; mode: 'gmail' | 'fixture'; elapsedMs: number }
  | { type: 'error'; message: string; counters: Counters }
  | { type: 'tagged'; tagged: number; embedded: number; costUsd: number; calls: number }
  | { type: 'images'; looked_up: number; imaged: number; searches: number; cached: number };

const ZERO: Counters = { scanned: 0, prefiltered: 0, sent: 0, clothingOrders: 0, itemsFound: 0, duplicates: 0, failed: 0, costUsd: 0, tokens: 0, cached: 0 };

function cents(usdAmount: number) { return usdAmount < 0.01 ? `${(usdAmount * 100).toFixed(2)}¢` : `${(usdAmount * 100).toFixed(1)}¢`; }

/**
 * The inbox scan is a receipt being printed. The slot's light blinks while emails are read, every item found
 * feeds out as a new line, and when the scan ends the paper tears off with the totals.
 */
export function IngestPanel({ hasGmail, itemCount, compact = false }: { hasGmail: boolean; itemCount: number; compact?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [mode, setMode] = useState<'gmail' | 'fixture' | null>(null);
  const [total, setTotal] = useState(0);
  const [c, setC] = useState<Counters>(ZERO);
  const [subject, setSubject] = useState('');
  const [found, setFound] = useState<RecentItem[]>([]);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [tagged, setTagged] = useState<{ tagged: number; embedded: number; costUsd: number } | null>(null);
  const [images, setImages] = useState<{ looked_up: number; imaged: number; searches: number } | null>(null);
  const es = useRef<EventSource | null>(null);
  const paper = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(!compact);

  useEffect(() => () => es.current?.close(), []);
  // Keep the newest printed line in view, like paper feeding out.
  useEffect(() => { paper.current?.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [found.length, state]);

  function start() {
    setState('running'); setC(ZERO); setFound([]); setError(''); setSubject(''); setOpen(true); setTagged(null); setImages(null);
    const src = new EventSource('/api/ingest/gmail?max=300');
    es.current = src;
    src.onmessage = (m) => {
      const e = JSON.parse(m.data) as Ev;
      if (e.type === 'start') { setMode(e.mode); setTotal(e.total); }
      else if (e.type === 'progress') { setC(e.counters); if (e.subject) setSubject(e.subject); }
      else if (e.type === 'item') setFound((r) => [...r, e.item]);
      else if (e.type === 'done') { setC(e.counters); setElapsed(e.elapsedMs); setState('done'); if (e.counters.itemsFound === 0) { src.close(); } router.refresh(); }
      else if (e.type === 'tagged') { setTagged(e); router.refresh(); }
      else if (e.type === 'images') { setImages(e); src.close(); router.refresh(); }
      else if (e.type === 'error') { setC(e.counters); setError(e.message); setState('error'); src.close(); router.refresh(); }
    };
    src.onerror = () => { if (state === 'running') { setError('Connection dropped. Items found so far are kept. Scan again to continue.'); setState('error'); } src.close(); };
  }

  const pct = total > 0 ? Math.min(100, Math.round((c.scanned / total) * 100)) : 0;
  const running = state === 'running';
  const finished = state === 'done' || state === 'error';

  if (compact && !open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dust px-4 py-3 text-sm text-ink-2">
        <span>{itemCount} item{itemCount === 1 ? '' : 's'} · {hasGmail ? 'Gmail connected' : 'Gmail not connected'}</span>
        <button className="btn btn-sm" onClick={start}><Icon name="refresh" size={12} />Rescan inbox</button>
      </div>
    );
  }

  if (state === 'idle') {
    return (
      <div className="card card-mist flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="display text-xs text-ink-2">Inbox scan</div>
          <p className="mt-1 text-sm text-ink-2">Order emails become items with price, size and return window. The email itself is never kept.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge>{hasGmail ? 'Gmail read-only' : 'Connect Gmail by signing in with Google'}</Badge>
          <button className="btn btn-primary" onClick={start} disabled={!hasGmail}>Scan my inbox</button>
        </div>
      </div>
    );
  }

  return (
    <div className="printer">
      <div className={`slot ${running ? 'busy' : ''}`} aria-hidden="true">
        <span className="slot-progress" style={{ width: `${state === 'done' ? 100 : pct}%` }} />
      </div>
      <section className={`tape feed ${finished ? 'torn' : ''}`} aria-live="polite">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <TapeHeader title={running ? 'Scanning your inbox' : state === 'error' ? 'Scan stopped' : 'Inbox scanned'} subtitle={`${c.scanned}${total ? ` of ${total}` : ''} emails · ${c.prefiltered} skipped before the model · ${c.sent} read by the model`} />
          {mode === 'fixture' ? <Badge tone="warn">Fixture · not your inbox</Badge> : <Badge tone="pine">Live · Gmail read-only</Badge>}
        </div>
        {running && (
          <div className="mt-2 truncate text-[11px] text-ink-3">
            <span className="cursor" /> Reading {subject || '…'}
          </div>
        )}
        <TapeRule />

        <div ref={paper} className="max-h-72 overflow-y-auto">
          {found.length === 0 && (
            <div className="py-2 text-center text-[11px] text-ink-3">{running ? 'Nothing printed yet. Marketing and shipping mail is skipped before the model sees it.' : 'Nothing new. Every clothing order in reach is already on the rack.'}</div>
          )}
          {found.map((it, i) => (
            <div key={it.id} className="print-line" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
              <TapeLine
                label={<><span className="h-6 w-4 shrink-0 overflow-hidden bg-white">{it.image_url && <img src={it.image_url} alt="" className="h-full w-full object-contain" />}</span><span className="truncate">{it.name}</span>{it.retailer && <span className="shrink-0 text-ink-3">{it.retailer}</span>}</>}
                value={usd(it.price_cents)}
              />
            </div>
          ))}
        </div>

        {finished && (
          <>
            <TapeRule />
            <TapeTotal label="Items found" value={String(c.itemsFound)} valueClass={c.itemsFound ? 'text-save' : ''} />
            {c.duplicates > 0 && <TapeLine label="Already on the rack" value={String(c.duplicates)} muted />}
            {c.failed > 0 && <TapeLine label="Could not read" value={String(c.failed)} muted />}
            <TapeLine label="Model spend" value={`${cents(c.costUsd)} · ${c.tokens.toLocaleString()} tokens${c.cached ? `, ${c.cached} cached` : ''}`} muted />
            {state === 'done' && <TapeLine label="Time" value={`${(elapsed / 1000).toFixed(1)}s`} muted />}
            {state === 'done' && c.itemsFound > 0 && !tagged && <TapeLine label="Tagging" value="printing…" muted />}
            {tagged && <TapeLine label="Tagged" value={`${tagged.tagged} · ${cents(tagged.costUsd)}`} muted />}
            {tagged && !images && <TapeLine label="Product photos" value="looking…" muted />}
            {images && <TapeLine label="Product photos" value={`${images.imaged} of ${images.looked_up}`} muted />}
            {state === 'error' && <p className="mt-2 text-xs text-warn">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button className="btn btn-sm" onClick={start}><Icon name="refresh" size={12} />Scan again</button>
              {compact && <button className="btn btn-sm btn-outline" onClick={() => setOpen(false)}>Close</button>}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
