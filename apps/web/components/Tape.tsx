import type { ReactNode } from 'react';
import { usd } from '@/components/ui';

export { usd };

/* Thermal-tape primitives: a store receipt on paper with perforated ends, dotted leaders, a dashed rule, a
   double-ruled total, and a barcode drawn deterministically from any string. Money is always ink on paper. */

export function Tape({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`tape ${className}`}>{children}</section>;
}

export function TapeHeader({ title, subtitle, brand = false }: { title: ReactNode; subtitle?: ReactNode; brand?: boolean }) {
  return (
    <div className="text-center">
      {brand && <div className="text-[10px] tracking-[.35em] text-ink-3">WEAVE</div>}
      <h1 className="text-[13px] font-semibold uppercase tracking-[.18em]">{title}</h1>
      {subtitle && <div className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-3">{subtitle}</div>}
    </div>
  );
}

export function TapeLine({ label, value, muted = false, valueClass = '', sub = false }: { label: ReactNode; value: ReactNode; muted?: boolean; valueClass?: string; sub?: boolean }) {
  return (
    <div className={`leader ${muted ? 'muted' : ''} ${sub ? 'pl-3' : ''}`}>
      <span className="l">{label}</span>
      <span className="dots" />
      <span className={`v ${valueClass}`}>{value}</span>
    </div>
  );
}

export function TapeRule() {
  return <div className="rule" role="presentation" />;
}

export function TapeTotal({ label, value, valueClass = '' }: { label: ReactNode; value: ReactNode; valueClass?: string }) {
  return (
    <div className="total flex items-baseline justify-between gap-3">
      <span className="uppercase tracking-wider">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

/** Ink stamp: rotated outline, uppercase, for state ("RETURNING", "STOOD IN FOR $148"). */
export function Stamp({ children, tone = 'ink', className = '' }: { children: ReactNode; tone?: 'ink' | 'save' | 'warn'; className?: string }) {
  const color = tone === 'save' ? 'text-save' : tone === 'warn' ? 'text-warn' : 'text-ink-2';
  return <span className={`stamp ${color} ${className}`}>{children}</span>;
}

/* FNV-1a over the seed, then xorshift for bar widths: same string, same barcode, on every render. */
function bars(seed: string, count: number): number[] {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  let x = h || 0x9e3779b9;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    out.push(1 + (x % 3));
  }
  return out;
}

/** Decorative barcode in currentColor; `label` prints beneath it in tiny mono (an item number, a closet number). */
export function Barcode({ seed, label, height = 26, className = '' }: { seed: string; label?: ReactNode; height?: number; className?: string }) {
  const widths = bars(seed, 44);
  const gap = 1;
  let x = 0;
  const rects = widths.map((w, i) => { const r = <rect key={i} x={x} y={0} width={w} height={height} />; x += w + gap + (i % 2); return r; });
  return (
    <div className={`barcode ${className}`}>
      <svg viewBox={`0 0 ${x} ${height}`} height={height} preserveAspectRatio="none" fill="currentColor" aria-hidden="true" className="block w-full">{rects}</svg>
      {label && <div className="mt-1 text-center text-[9px] tracking-[.25em] text-ink-3">{label}</div>}
    </div>
  );
}
