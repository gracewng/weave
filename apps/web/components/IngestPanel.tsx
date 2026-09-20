'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle, Row, Note, Badge, Progress, usd } from '@/components/ui';

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

export function IngestPanel({ hasGmail, itemCount, compact = false }: { hasGmail: boolean; itemCount: number; compact?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [mode, setMode] = useState<'gmail' | 'fixture' | null>(null);
  const [total, setTotal] = useState(0);
  const [c, setC] = useState<Counters>(ZERO);
  const [subject, setSubject] = useState('');
  const [provider, setProvider] = useState('');
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [tagged, setTagged] = useState<{ tagged: number; embedded: number; costUsd: number } | null>(null);
  const [images, setImages] = useState<{ looked_up: number; imaged: number; searches: number } | null>(null);
  const es = useRef<EventSource | null>(null);
  const [open, setOpen] = useState(!compact);

  useEffect(() => () => es.current?.close(), []);

  function start() {
    setState('running'); setC(ZERO); setRecent([]); setError(''); setSubject(''); setOpen(true); setTagged(null); setImages(null);
    const src = new EventSource('/api/ingest/gmail?max=300');
    es.current = src;
    src.onmessage = (m) => {
      const e = JSON.parse(m.data) as Ev;
      if (e.type === 'start') { setMode(e.mode); setTotal(e.total); }
      else if (e.type === 'progress') { setC(e.counters); if (e.subject) setSubject(e.subject); if (e.provider) setProvider(e.provider); }
      else if (e.type === 'item') setRecent((r) => [e.item, ...r].slice(0, 8));
      else if (e.type === 'done') { setC(e.counters); setElapsed(e.elapsedMs); setState('done'); if (e.counters.itemsFound === 0) { src.close(); } router.refresh(); }
      else if (e.type === 'tagged') { setTagged(e); router.refresh(); }
      else if (e.type === 'images') { setImages(e); src.close(); router.refresh(); }
      else if (e.type === 'error') { setC(e.counters); setError(e.message); setState('error'); src.close(); router.refresh(); }
    };
    src.onerror = () => { if (state === 'running') { setError('Connection dropped. Items found so far are recorded. Scan again to continue.'); setState('error'); } src.close(); };
  }

  const pct = total > 0 ? Math.min(100, Math.round((c.scanned / total) * 100)) : 0;

  if (compact && !open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dust px-4 py-3 text-sm text-ink-2">
        <span>{itemCount} item{itemCount === 1 ? '' : 's'} · {hasGmail ? 'Gmail connected' : 'Gmail not connected'}</span>
        <button className="btn btn-sm" onClick={start}>Rescan inbox</button>
      </div>
    );
  }

  const modeBadge = mode === 'fixture'
    ? <Badge tone="warn">Fixture mode · not your real inbox</Badge>
    : mode === 'gmail'
      ? <Badge tone="pine">Live · Gmail read-only</Badge>
      : <Badge>{hasGmail ? 'Ready' : 'Sign in with Google to connect Gmail'}</Badge>;

  return (
    <Card className="max-w-3xl">
      <CardTitle action={modeBadge}>Inbox scan</CardTitle>
      {state === 'idle' && (
        <>
          <p className="text-sm text-ink-2">Weave reads your order confirmations, extracts each clothing item with its price, size and return window, and discards the email text. Nothing you didn&apos;t buy gets invented.</p>
          <div className="mt-4 flex gap-2">
            <button className="btn btn-primary" onClick={start}>Scan my inbox</button>
          </div>
          <Note className="mt-4">Three years of order and receipt emails only. The retailer allowlist runs before any model call.</Note>
        </>
      )}
      {state !== 'idle' && (
        <>
          <Progress pct={state === 'done' ? 100 : pct} className="mb-3" />
          {state === 'running' && <Note className="mb-3 truncate">Reading · {subject || '…'}</Note>}
          <Row label="Emails scanned" value={`${c.scanned}${total ? ` / ${total}` : ''}`} />
          <Row label="Skipped before the model" value={String(c.prefiltered)} muted />
          <Row label="Sent to model" value={String(c.sent)} muted />
          <Row label="Clothing orders" value={String(c.clothingOrders)} />
          <Row label="Items found" value={String(c.itemsFound)} valueClass={c.itemsFound ? 'saved' : ''} />
          {c.duplicates > 0 && <Row label="Already in wardrobe" value={String(c.duplicates)} muted />}
          {c.failed > 0 && <Row label="Failed" value={String(c.failed)} muted />}
          <Row label="Tokens" value={`${c.tokens.toLocaleString()}${c.cached ? ` (${c.cached} cached)` : ''}`} muted />
          <Row label="Model spend" value={cents(c.costUsd)} />
          {provider && <Row label="Provider" value={provider} muted />}
          {recent.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {recent.map((it) => (
                <div key={it.id} className="cutout w-20 shrink-0 p-1">
                  <div className="aspect-[3/4] w-full rounded-lg bg-paper-2">{it.image_url && <img src={it.image_url} alt="" className="h-full w-full object-contain" />}</div>
                  <div className="mt-1 truncate px-0.5 text-[10px] tabular-nums text-ink-2">{usd(it.price_cents)}</div>
                </div>
              ))}
            </div>
          )}
          {(state === 'done' || tagged || images || state === 'error') && (
            <div className="mt-3 border-t border-dust/60 pt-1">
              {state === 'done' && <Row label="Done" value={`${(elapsed / 1000).toFixed(1)}s · ${c.itemsFound} items · ${cents(c.costUsd)} in tokens`} />}
              {state === 'done' && c.itemsFound > 0 && !tagged && <Row label="Tagging and embedding" value="…" muted />}
              {tagged && <Row label="Tagged · embedded" value={`${tagged.tagged} · ${tagged.embedded} · ${cents(tagged.costUsd)}`} muted />}
              {tagged && !images && <Row label="Finding product images" value="…" muted />}
              {images && <Row label="Images found" value={`${images.imaged} / ${images.looked_up} · ${images.searches} searches`} muted />}
              {state === 'error' && <p className="mt-2 text-xs text-warn">{error}</p>}
            </div>
          )}
          {(state === 'done' || state === 'error') && (
            <div className="mt-4 flex gap-2">
              <button className="btn" onClick={start}>Scan again</button>
              {compact && <button className="btn btn-outline" onClick={() => setOpen(false)}>Close</button>}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
