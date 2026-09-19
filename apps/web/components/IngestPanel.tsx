'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';

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
    src.onerror = () => { if (state === 'running') { setError('Connection dropped. Items found so far are saved — scan again to continue.'); setState('error'); } src.close(); };
  }

  const pct = total > 0 ? Math.min(100, Math.round((c.scanned / total) * 100)) : 0;

  if (compact && !open) {
    return (
      <div className="mono flex items-center justify-between text-[11px] text-ink-3">
        <span>{itemCount} ITEMS · {hasGmail ? 'GMAIL CONNECTED' : 'GMAIL NOT CONNECTED'}</span>
        <button className="btn !py-1 !px-2 !text-[10px]" onClick={start}>Rescan inbox</button>
      </div>
    );
  }

  return (
    <Receipt className="mx-auto max-w-lg" print={state === 'running'}>
      <ReceiptHeader title="Inbox scan" subtitle={mode === 'fixture' ? 'FIXTURE MODE · NOT YOUR REAL INBOX' : mode === 'gmail' ? 'LIVE · GMAIL READ-ONLY' : hasGmail ? 'READY' : 'SIGN IN WITH GOOGLE TO CONNECT GMAIL'} />
      <ReceiptRule />
      {state === 'idle' && (
        <>
          <p className="text-sm text-ink-2">Weave reads your order confirmations, extracts each clothing item with its price, size and return window, and discards the email text. Nothing you didn&apos;t buy gets invented.</p>
          <div className="mt-4 flex gap-2">
            <button className="btn btn-primary" onClick={start}>Scan my inbox</button>
          </div>
          <div className="mono mt-4 text-[11px] text-ink-3">3 YEARS · ORDER + RECEIPT EMAILS ONLY · RETAILER ALLOWLIST BEFORE ANY MODEL CALL</div>
        </>
      )}
      {state !== 'idle' && (
        <>
          <ReceiptLine label="EMAILS SCANNED" value={`${c.scanned}${total ? ` / ${total}` : ''}`} />
          <ReceiptLine label="SKIPPED BEFORE THE MODEL" value={String(c.prefiltered)} muted />
          <ReceiptLine label="SENT TO MODEL" value={String(c.sent)} muted />
          <ReceiptLine label="CLOTHING ORDERS" value={String(c.clothingOrders)} />
          <ReceiptLine label="ITEMS FOUND" value={String(c.itemsFound)} valueClass={c.itemsFound ? 'saved' : ''} />
          {c.duplicates > 0 && <ReceiptLine label="ALREADY IN WARDROBE" value={String(c.duplicates)} muted />}
          {c.failed > 0 && <ReceiptLine label="FAILED" value={String(c.failed)} muted />}
          <ReceiptLine label="TOKENS" value={`${c.tokens.toLocaleString()}${c.cached ? ` (${c.cached} cached)` : ''}`} muted />
          <ReceiptLine label="MODEL SPEND" value={cents(c.costUsd)} />
          {provider && <ReceiptLine label="PROVIDER" value={provider} muted />}
          <div className="mt-3 h-1 w-full bg-paper"><div className="h-1 bg-ink transition-all" style={{ width: `${state === 'done' ? 100 : pct}%` }} /></div>
          {state === 'running' && <div className="mono mt-2 truncate text-[11px] text-ink-3">READING · {subject || '…'}</div>}
          {recent.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {recent.map((it) => (
                <div key={it.id} className="cutout print w-20 shrink-0 p-1">
                  <div className="aspect-[3/4] w-full bg-paper-2">{it.image_url && <img src={it.image_url} alt="" className="h-full w-full object-contain" />}</div>
                  <div className="mono mt-1 truncate text-[9px]">{usd(it.price_cents)}</div>
                </div>
              ))}
            </div>
          )}
          <ReceiptRule />
          {state === 'done' && <ReceiptLine label="DONE" value={`${(elapsed / 1000).toFixed(1)}s · ${c.itemsFound} ITEMS · ${cents(c.costUsd)} IN TOKENS`} />}
          {state === 'done' && c.itemsFound > 0 && !tagged && <ReceiptLine label="TAGGING + EMBEDDING" value="…" muted />}
          {tagged && <ReceiptLine label="TAGGED · EMBEDDED" value={`${tagged.tagged} · ${tagged.embedded} · ${cents(tagged.costUsd)}`} muted />}
          {tagged && !images && <ReceiptLine label="FINDING PRODUCT IMAGES" value="…" muted />}
          {images && <ReceiptLine label="IMAGES FOUND" value={`${images.imaged} / ${images.looked_up} · ${images.searches} SEARCHES`} muted />}
          {state === 'error' && <div className="mono text-[11px] text-warn">{error}</div>}
          {(state === 'done' || state === 'error') && (
            <div className="mt-3 flex gap-2">
              <button className="btn" onClick={start}>Scan again</button>
              {compact && <button className="btn" onClick={() => setOpen(false)}>Close</button>}
            </div>
          )}
        </>
      )}
    </Receipt>
  );
}
