'use client';
import { useEffect, useState } from 'react';
import { onPrint, type PrintJob } from '@/lib/printer';

/* Turns SHOUTED legacy labels into sentence case; leaves mixed-case text alone. */
function sentence(s: string) { return /[A-Z]/.test(s) && s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s; }

/* Action confirmations rise from the bottom as a snackbar, sit a few seconds, then sink. Tap to dismiss. */
export function Snackbar() {
  const [job, setJob] = useState<(PrintJob & { key: number; out?: boolean }) | null>(null);
  useEffect(() => onPrint((j) => {
    const key = Date.now();
    setJob({ ...j, key });
    const ttl = j.ttlMs ?? 4500;
    setTimeout(() => setJob((cur) => (cur?.key === key ? { ...cur, out: true } : cur)), ttl);
    setTimeout(() => setJob((cur) => (cur?.key === key ? null : cur)), ttl + 300);
  }), []);
  return (
    <div className="snackbar" aria-live="polite">
      {job && (
        <div key={job.key} className={`snackbar-card ${job.out ? 'out' : ''}`} onClick={() => setJob(null)}>
          <div className="flex items-baseline justify-between gap-3">
            <div className="display text-xs">{sentence(job.title)}</div>
            {job.subtitle && <div className="truncate text-xs text-white/70">{sentence(job.subtitle)}</div>}
          </div>
          {job.lines.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {job.lines.map((l, i) => (
                <span key={i} className={l.muted ? 'text-white/60' : ''}>
                  <span className="text-white/60">{sentence(l.label)} </span>
                  <span className={`font-medium tabular-nums ${l.saved ? 'saved' : ''}`}>{l.value}</span>
                </span>
              ))}
            </div>
          )}
          {job.footer && <div className="mt-2 text-[11px] text-white/60">{sentence(job.footer)}</div>}
        </div>
      )}
    </div>
  );
}
