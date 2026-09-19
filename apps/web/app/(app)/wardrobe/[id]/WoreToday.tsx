'use client';
import { useState, useTransition } from 'react';
import { woreToday } from './actions';
import { printReceipt } from '@/lib/printer';
import { usd } from '@/components/Receipt';
import { costPerWear, wearsToThirty } from '@weave/shared/wears';

export function WoreToday({ itemId, initialWears }: { itemId: string; initialWears: number }) {
  const [pending, start] = useTransition();
  const [wears, setWears] = useState(initialWears);
  const [stamped, setStamped] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <button className="btn btn-primary" disabled={pending} onClick={() => start(async () => {
        const r = await woreToday(itemId);
        if (!r.ok) return;
        setWears(r.wears); setStamped(true);
        const cpw = costPerWear(r.price_cents, r.wears);
        printReceipt({
          title: 'Worn today', subtitle: r.name.toUpperCase().slice(0, 40),
          lines: [
            { label: 'WEARS LOGGED', value: String(r.wears) },
            { label: 'COST PER WEAR NOW', value: cpw != null ? usd(cpw) : '—' },
            { label: 'TO #30WEARS', value: wearsToThirty(r.wears) === 0 ? 'DONE' : `${wearsToThirty(r.wears)} MORE` , muted: true },
          ],
          footer: 'USE IS THE ONLY LEVER',
        });
      })}>{pending ? 'Stamping…' : 'Wore today'}</button>
      {stamped && <span className="stamp new">WORN {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}</span>}
      <span className="mono text-[11px] text-ink-3">{wears} logged</span>
    </div>
  );
}
