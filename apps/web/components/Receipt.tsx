import type { ReactNode } from 'react';

export function Receipt({ children, className = '', print = false }: { children: ReactNode; className?: string; print?: boolean }) {
  return <section className={`receipt ${print ? 'print' : ''} ${className}`}>{children}</section>;
}

export function ReceiptRule() {
  return <div className="rule-dashed my-3" />;
}

export function ReceiptLine({ label, value, valueClass = '', muted = false }: { label: ReactNode; value: ReactNode; valueClass?: string; muted?: boolean }) {
  return (
    <div className={`leader text-[13px] ${muted ? 'text-ink-3' : ''}`}>
      <span className="l">{label}</span>
      <span className="dots" />
      <span className={`v ${valueClass}`}>{value}</span>
    </div>
  );
}

export function ReceiptHeader({ title, subtitle, brand = false }: { title: string; subtitle?: string; brand?: boolean }) {
  return (
    <div className="text-center">
      {brand && <div className="mono text-xs tracking-[.3em] text-ink-2">WEAVE</div>}
      <h1 className="mono mt-1 text-base font-semibold uppercase">{title}</h1>
      {subtitle && <div className="mono mt-1 text-xs text-ink-3">{subtitle}</div>}
    </div>
  );
}

export function usd(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
