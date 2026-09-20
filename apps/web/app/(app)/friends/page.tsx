import Link from 'next/link';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { Receipt, ReceiptHeader, ReceiptLine, ReceiptRule, usd } from '@/components/Receipt';
import { listFriends, loansFor, karmaFor } from '@/lib/friends';
import { InviteQR } from './InviteQR';
import { LoansLive } from './LoansLive';
import { LoanActions } from './LoanActions';
import { JoinForm } from './JoinForm';

export const dynamic = 'force-dynamic';

export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ joined?: string; error?: string }> }) {
  const { joined, error } = await searchParams;
  const { profile, user } = await getProfile();
  const supabase = await createClient();
  const admin = createAdminClient();
  const [friends, loans, karma] = await Promise.all([listFriends(supabase, user.id), loansFor(supabase, user.id), admin ? karmaFor(admin, user.id) : Promise.resolve({ lent: 0, helpedKeepCents: 0, borrowed: 0 })]);
  const link = `${env.appUrl}/join/${profile?.invite_code ?? ''}`;
  const open = loans.filter((l) => ['requested', 'accepted', 'out'].includes(l.status));
  const past = loans.filter((l) => ['returned', 'declined'].includes(l.status)).slice(0, 10);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <LoansLive userId={user.id} />
      {joined && <div className="mono text-center text-[11px] text-save">FRIEND ADDED</div>}
      {error && <div className="mono text-center text-[11px] text-warn">{decodeURIComponent(error)}</div>}

      <div className="grid gap-6 md:grid-cols-2">
        <Receipt>
          <ReceiptHeader title="Closet karma" subtitle={(profile?.display_name ?? 'YOU').toUpperCase()} />
          <ReceiptRule />
          <ReceiptLine label="LENT" value={`${karma.lent} TIME${karma.lent === 1 ? '' : 'S'}`} />
          <ReceiptLine label="HELPED FRIENDS KEEP" value={usd(karma.helpedKeepCents)} valueClass={karma.helpedKeepCents > 0 ? 'saved' : ''} />
          <ReceiptLine label="BORROWED" value={`${karma.borrowed} TIME${karma.borrowed === 1 ? '' : 'S'}`} muted />
          <ReceiptRule />
          <div className="mono text-[11px] text-ink-3">LENDING IS THE STATUS SYMBOL. NO FEED, NO LIKES, NO RANKINGS.</div>
        </Receipt>
        <Receipt>
          <ReceiptHeader title="Invite" subtitle="SCAN OR SHARE" />
          <ReceiptRule />
          <div className="flex items-start gap-4">
            <InviteQR url={link} />
            <div className="min-w-0 flex-1">
              <div className="mono select-all border border-rule bg-paper p-2 text-center text-lg tracking-[.2em]">{profile?.invite_code ?? '—'}</div>
              <div className="mono mt-2 break-all text-[10px] text-ink-3">{link}</div>
              <JoinForm />
            </div>
          </div>
          <div className="mono mt-3 text-[10px] text-ink-3">FRIENDS SEE SHAREABLE ITEMS ONLY. NEVER PRICES, DATES, STORES OR RECEIPTS.</div>
        </Receipt>
      </div>

      {open.length > 0 && (
        <Receipt>
          <ReceiptHeader title="Open loans" subtitle={`${open.length} · UPDATES LIVE`} />
          <ReceiptRule />
          <div className="space-y-3">
            {open.map((l) => {
              const isOwner = l.owner_id === user.id;
              return (
                <div key={l.id} className="flex gap-3 border-b border-dashed border-rule pb-3 last:border-0">
                  <div className="h-16 w-12 shrink-0 bg-paper-2">{l.item_image && <img src={l.item_image} alt="" className="h-full w-full object-contain" />}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{l.item_name}</div>
                    <div className="mono text-[10px] text-ink-3">{isOwner ? `${l.borrower_name.toUpperCase()} ASKED` : `FROM ${l.owner_name.toUpperCase()}`}{l.event_name ? ` · ${l.event_name.toUpperCase()}` : ''}{l.needed_on ? ` · NEEDED ${l.needed_on}` : ''}{l.due_back ? ` · BACK ${l.due_back}` : ''} · <span className="text-ink">{l.status.toUpperCase()}</span></div>
                    {l.message && <div className="mt-1 text-xs text-ink-2">“{l.message}”</div>}
                    <div className="mt-2"><LoanActions loanId={l.id} status={l.status} isOwner={isOwner} itemName={l.item_name} ownerName={l.owner_name} borrowerName={l.borrower_name} dueBack={l.due_back} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Receipt>
      )}

      <Receipt>
        <ReceiptHeader title="Friends" subtitle={friends.length ? `${friends.length} · TAP TO BROWSE A WARDROBE` : 'NO FRIENDS YET'} />
        <ReceiptRule />
        {friends.length === 0 && <p className="text-sm text-ink-2">Share your code. When a friend joins, their shareable items show up here, filtered to your size, ready to borrow before you buy.</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          {friends.map((f) => (
            <Link key={f.id} href={`/friends/${f.id}`} className="cutout flex items-center gap-3 p-2 hover:border-ink">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-paper-2">{f.avatar_url && <img src={f.avatar_url} alt="" className="h-full w-full object-cover" />}</div>
              <div className="min-w-0"><div className="truncate text-sm">{f.display_name ?? 'Friend'}</div><div className="mono text-[10px] text-ink-3">{Object.entries(f.sizes ?? {}).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ') || 'NO SIZES SET'}</div></div>
            </Link>
          ))}
        </div>
      </Receipt>

      {past.length > 0 && (
        <Receipt>
          <ReceiptHeader title="Past loans" />
          <ReceiptRule />
          {past.map((l) => <ReceiptLine key={l.id} label={`${l.item_name.slice(0, 26)} · ${l.owner_id === user.id ? 'TO ' + l.borrower_name : 'FROM ' + l.owner_name}`} value={l.status.toUpperCase()} muted />)}
        </Receipt>
      )}
    </div>
  );
}
