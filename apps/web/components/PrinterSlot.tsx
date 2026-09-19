'use client';
import { useEffect, useState } from 'react';
import { onPrint, type PrintJob } from '@/lib/printer';

/** The slit at the top of every page. Receipts feed out of it, sit for a few seconds, then tear off. */
export function PrinterSlot() {
  const [job, setJob] = useState<(PrintJob & { key: number; out?: boolean }) | null>(null);
  useEffect(() => onPrint((j) => {
    const key = Date.now();
    setJob({ ...j, key });
    const ttl = j.ttlMs ?? 4500;
    setTimeout(() => setJob((cur) => (cur?.key === key ? { ...cur, out: true } : cur)), ttl);
    setTimeout(() => setJob((cur) => (cur?.key === key ? null : cur)), ttl + 400);
  }), []);
  return (
    <div className="printer-slot" aria-live="polite">
      <div className="printer-slit" />
      {job && (
        <div key={job.key} className={`printer-paper receipt !py-3 ${job.out ? 'out' : ''}`} onClick={() => setJob(null)}>
          <div className="mono text-center text-[10px] tracking-[.3em] text-ink-2">WEAVE</div>
          <div className="mono text-center text-xs font-semibold uppercase">{job.title}</div>
          {job.subtitle && <div className="mono text-center text-[10px] text-ink-3">{job.subtitle}</div>}
          <div className="rule-dashed my-2" />
          {job.lines.map((l, i) => (
            <div key={i} className={`leader text-[12px] ${l.muted ? 'text-ink-3' : ''}`}><span className="l">{l.label}</span><span className="dots" /><span className={`v ${l.saved ? 'saved' : ''}`}>{l.value}</span></div>
          ))}
          {job.footer && <><div className="rule-dashed my-2" /><div className="mono text-center text-[10px] text-ink-3">{job.footer}</div></>}
        </div>
      )}
    </div>
  );
}
