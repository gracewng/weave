import Link from 'next/link';
import { supabaseConfigured } from '@/lib/env';
import { Receipt, ReceiptLine, ReceiptRule } from '@/components/Receipt';

export default async function Landing({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const signinHref = `/auth/signin${next ? `?next=${encodeURIComponent(next)}` : ''}`;
  return (
    <main className="mx-auto max-w-md px-4 py-12 sm:py-20">
      <Receipt>
        <div className="mono text-center text-xs tracking-[.3em] text-ink-2">WEAVE</div>
        <h1 className="mono mt-2 text-center text-lg font-semibold">SPENDING STATEMENT · CLOTHES</h1>
        <div className="mono mt-1 text-center text-xs text-ink-3">{new Date().toISOString().slice(0, 10)}</div>
        <ReceiptRule />
        <ReceiptLine label="KNOW WHAT YOU OWN" value="✓" />
        <ReceiptLine label="CHECK WHAT FRIENDS OWN" value="✓" />
        <ReceiptLine label="BUY ONLY WHAT ADDS VALUE" value="✓" />
        <ReceiptLine label="BORROW BEFORE YOU BUY" value="✓" />
        <ReceiptRule />
        <ReceiptLine label="NEW CLOTHES YOU DIDN'T NEED" value="$0.00" valueClass="saved" />
        <ReceiptRule />
        <p className="mt-4 text-sm text-ink-2">
          Weave reads your order emails and card charges to build a closet you never have to type in, then stops you
          buying what you already own — or what a friend can lend you.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {supabaseConfigured() ? (
            <Link href={signinHref} className="btn btn-primary text-center">Sign in with Google</Link>
          ) : (
            <div className="mono text-xs text-warn">Supabase env not configured — copy .env.example to apps/web/.env.local</div>
          )}
          {error && <div className="mono text-xs text-warn">Sign-in error: {error}</div>}
        </div>
        <div className="mono mt-6 space-y-1 text-[11px] leading-relaxed text-ink-3">
          <p>PRIVACY · We request Gmail read-only. We extract item name, price, size and date from order emails and discard the email text. Raw emails are never stored.</p>
          <p>FRIENDS · See only items you mark shareable (underwear and sleepwear are hidden by default). They never see prices or where you bought things.</p>
        </div>
      </Receipt>
    </main>
  );
}
