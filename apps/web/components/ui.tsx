import Link from 'next/link';
import type { ComponentType, ReactNode, SVGProps } from 'react';

/* Material-style kit: wide pages, rounded tonal surfaces, big display numbers, plain sentence-case labels. */

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
type Tone = 'mist' | 'paper' | 'sprout' | 'pine';

export function usd(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Page shell: nearly full width, generous vertical rhythm. */
export function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-6xl space-y-8 ${className}`}>{children}</div>;
}

/** Title block: small eyebrow, big display title, one-line subtitle, actions and an icon on the right. */
export function PageHeader({ eyebrow, title, subtitle, actions, icon: Ic }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; icon?: Icon }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="text-sm text-ink-3">{eyebrow}</div>}
        <h1 className="display text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-2">{subtitle}</p>}
      </div>
      {(actions || Ic) && <div className="flex items-center gap-3">{actions}{Ic && <Ic className="h-12 w-12 text-fern" />}</div>}
    </header>
  );
}

/** Rounded surface. Tones: mist (default), paper (white, outlined), sprout (accent), pine (dark). */
export function Card({ children, className = '', tone = 'mist', hover = false }: { children: ReactNode; className?: string; tone?: Tone; hover?: boolean }) {
  return <section className={`card card-${tone} ${hover ? 'card-hover' : ''} ${className}`}>{children}</section>;
}

export function CardTitle({ children, hint, action }: { children: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="display text-xs text-ink-2">{children}</h2>
        {hint && <div className="mt-1 text-xs text-ink-3">{hint}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Section label outside a card, like "Latest in your wardrobe" on the home page. */
export function SectionTitle({ children, hint, action }: { children: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <div className="flex items-baseline gap-3"><h2 className="display text-xs text-ink-2">{children}</h2>{hint && <span className="text-xs text-ink-3">{hint}</span>}</div>
      {action}
    </div>
  );
}

/** Big-number tile (the home page tiles). */
export function Stat({ value, label, href, tone = 'mist', valueClass = '' }: { value: ReactNode; label: ReactNode; href?: string; tone?: Tone; valueClass?: string }) {
  const inner = (
    <>
      <div className={`display text-3xl font-semibold ${tone === 'pine' ? 'text-white' : 'text-pine'} ${valueClass}`}>{value}</div>
      <div className={`mt-1 text-sm ${tone === 'pine' ? 'text-white/75' : 'text-ink-2'}`}>{label}</div>
    </>
  );
  const cls = `card card-${tone} !p-5`;
  return href ? <Link href={href} className={`${cls} card-hover block`}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

const COLS: Record<number, string> = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4', 5: 'sm:grid-cols-3 lg:grid-cols-5' };
export function StatGrid({ children, cols = 3, className = '' }: { children: ReactNode; cols?: 2 | 3 | 4 | 5; className?: string }) {
  return <div className={`grid gap-3 ${COLS[cols]} ${className}`}>{children}</div>;
}

/** Label / value row inside a card. */
export function Row({ label, value, muted = false, sub = false, valueClass = '' }: { label: ReactNode; value: ReactNode; muted?: boolean; sub?: boolean; valueClass?: string }) {
  return (
    <div className={`row ${sub ? 'pl-4' : ''}`}>
      <span className={`min-w-0 truncate ${muted ? 'text-ink-3' : 'text-ink-2'}`}>{label}</span>
      <span className={`shrink-0 tabular-nums ${muted ? 'text-ink-3' : 'font-medium text-ink'} ${valueClass}`}>{value}</span>
    </div>
  );
}

export function Note({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-xs leading-relaxed text-ink-3 ${className}`}>{children}</p>;
}

export function Badge({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: 'neutral' | 'save' | 'warn' | 'pine' | 'outline'; className?: string }) {
  return <span className={`badge badge-${tone} ${className}`}>{children}</span>;
}

export function Field({ label, hint, children, className = '' }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`my-4 border-0 border-t border-dust/60 ${className}`} />;
}

/** Dashed empty state with an icon, a sentence, and one action. */
export function Empty({ icon: Ic, title, body, action, href }: { icon?: Icon; title: ReactNode; body?: ReactNode; action?: ReactNode; href?: string }) {
  const inner = (
    <>
      {Ic && <Ic className="h-7 w-7 shrink-0 text-fern" />}
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        {body && <div className="mt-0.5 text-sm text-ink-2">{body}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </>
  );
  const cls = 'flex items-start gap-4 rounded-3xl border border-dashed border-sage p-5';
  return href ? <Link href={href} className={`${cls} transition hover:bg-mist`}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

/** Thin progress bar. */
export function Progress({ pct, className = '' }: { pct: number; className?: string }) {
  return <div className={`progress ${className}`}><div style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>;
}
