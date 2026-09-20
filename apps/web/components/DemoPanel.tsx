'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { demoAdvance48h, demoResetHolds, demoFriendAccepts } from '@/app/demo-actions';
import { printReceipt } from '@/lib/printer';

/** Press D three times within 1.5s. Hosts every demo trigger; each one is labeled DEMO. */
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
  const run = (label: string, fn: () => Promise<number>) => start(async () => { const n = await fn(); printReceipt({ title: 'Demo trigger', lines: [{ label: label.toUpperCase(), value: String(n) }], footer: 'LABELED DEMO ACTION · NOT LIVE DATA', ttlMs: 3000 }); router.refresh(); });
  return (
    <div className="fixed bottom-4 right-4 z-40 w-64 border border-warn bg-paper p-3 shadow-lg">
      <div className="mono mb-2 flex items-center justify-between text-[10px] uppercase text-warn"><span>Demo panel</span><button onClick={() => setOpen(false)}>close</button></div>
      <div className="flex flex-col gap-2">
        <button className="btn !py-1 !text-[10px]" disabled={pending} onClick={() => run('holds advanced 48h', demoAdvance48h)}>Advance 48h (holds)</button>
        <button className="btn !py-1 !text-[10px]" disabled title="Phase 4">Fire mock charge</button>
        <button className="btn !py-1 !text-[10px]" disabled={pending} onClick={() => run('friend accepted + handed over', demoFriendAccepts)}>Friend accepts my request</button>
        <button className="btn !py-1 !text-[10px]" disabled title="Phase 6">Seed confirmed refund</button>
        <button className="btn !py-1 !text-[10px]" disabled={pending} onClick={() => { if (confirm('Delete all of your holds?')) run('holds deleted', demoResetHolds); }}>Reset my holds</button>
      </div>
    </div>
  );
}
