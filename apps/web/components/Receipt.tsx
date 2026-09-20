import type { ReactNode } from 'react';
import { Card, Row, Divider, usd } from '@/components/ui';

/* Compatibility layer: the receipt primitives from the first UI, rendered with the redesign's card kit.
   Receipt → Card, ReceiptHeader → card title, ReceiptLine → Row, ReceiptRule → Divider. */

export { usd };

/* Legacy labels were SHOUTED; the redesign is sentence case. Mixed-case strings are left alone. */
function sentence(v: ReactNode): ReactNode {
  if (typeof v !== 'string') return v;
  return /[A-Z]/.test(v) && v === v.toUpperCase() ? v.charAt(0) + v.slice(1).toLowerCase() : v;
}

export function Receipt({ children, className = '', print: _print = false, tone = 'mist' }: { children: ReactNode; className?: string; print?: boolean; tone?: 'mist' | 'paper' | 'sprout' | 'pine' }) {
  return <Card tone={tone} className={className}>{children}</Card>;
}

export function ReceiptRule() {
  return <Divider className="my-3" />;
}

export function ReceiptLine({ label, value, valueClass = '', muted = false }: { label: ReactNode; value: ReactNode; valueClass?: string; muted?: boolean }) {
  return <Row label={sentence(label)} value={sentence(value)} muted={muted} valueClass={valueClass} />;
}

export function ReceiptHeader({ title, subtitle, brand = false }: { title: string; subtitle?: string; brand?: boolean }) {
  return (
    <div className="mb-1">
      {brand && <div className="display text-[10px] text-ink-3">Weave</div>}
      <h1 className="display text-xl font-semibold text-pine">{title}</h1>
      {subtitle && <div className="mt-0.5 text-xs text-ink-3">{sentence(subtitle)}</div>}
    </div>
  );
}
