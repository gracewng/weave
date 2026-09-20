'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { demoFriendAccepts, demoSeedRefund } from '@/app/demo-actions';
import { printReceipt } from '@/lib/printer';
import { Badge } from '@/components/ui';

/** Press D three times within 1.5s. Hosts every demo trigger; each one is labeled Demo. */
export function DemoPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => {
    let taps: number[] = [];
    const h = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'd' || (e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      const now = Date.now(); taps = [...taps.filter((t) => now - t < 1500), now];
      if (taps.length >= 3) { setOpen((o) => !o); taps = []; }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);
  if (!open) return null;
  const run = (label: string, fn: () => Promise<number>) => start(async () => { const n = await fn(); printReceipt({ title: 'Demo trigger', lines: [{ label, value: String(n) }], footer: 'Labeled demo action, not live data', ttlMs: 3000 }); router.refresh(); });
  return (
    <div className="card card-paper fixed bottom-4 right-4 z-40 w-64 !p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between"><Badge tone="warn">Demo</Badge><button className="btn-text" onClick={() => setOpen(false)}>Close</button></div>
      <div className="flex flex-col gap-2">
        <button className="btn btn-sm btn-outline" disabled={pending} onClick={() => start(async () => { const r = await fetch('/api/demo/charge', { method: 'POST' }); const j = await r.json(); printReceipt({ title: 'Demo trigger', lines: [{ label: 'Mock charge', value: r.ok ? '$42.00 Uniqlo' : 'Failed' }], footer: 'Labeled demo action, not live data', ttlMs: 3000 }); router.refresh(); void j; })}>Fire mock charge ($42 Uniqlo)</button>
        <button className="btn btn-sm btn-outline" disabled={pending} onClick={() => run('Friend accepted and handed over', demoFriendAccepts)}>Friend accepts my request</button>
        <button className="btn btn-sm btn-outline" disabled={pending} onClick={() => run('Refund seeded (cents)', demoSeedRefund)}>Seed confirmed refund</button>
      </div>
    </div>
  );
}
