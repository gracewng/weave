import Link from 'next/link';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { Page, PageHeader, Card, CardTitle, SectionTitle, Row, Note, Badge, usd } from '@/components/ui';
import { listFriends, loansFor, karmaFor } from '@/lib/friends';
import { InviteQR } from './InviteQR';
import { LoansLive } from './LoansLive';
import { LoanActions } from './LoanActions';
import { JoinForm } from './JoinForm';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, string> = { requested: 'Requested', accepted: 'Accepted', out: 'Out', returned: 'Returned', declined: 'Declined' };

export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ joined?: string; error?: string }> }) {
  const { joined, error } = await searchParams;
  const { profile, user } = await getProfile();
  const supabase = await createClient();
  const admin = createAdminClient();
  const [friends, loans, karma] = await Promise.all([listFriends(supabase, user.id), loansFor(supabase, user.id), admin ? karmaFor(admin, user.id) : Promise.resolve({ lent: 0, helpedKeepCents: 0, borrowed: 0 })]);
  const link = `${env.appUrl}/join/${profile?.invite_code ?? ''}`;
  const myArea = (profile?.area ?? '').trim().toLowerCase();
  const near = (a: string | null | undefined) => !!myArea && !!a && a.trim().toLowerCase() === myArea;
  const nearCount = friends.filter((f) => near(f.area)).length;
  const open = loans.filter((l) => ['requested', 'accepted', 'out'].includes(l.status));
  const past = loans.filter((l) => ['returned', 'declined'].includes(l.status)).slice(0, 10);

  return (
    <Page>
      <LoansLive userId={user.id} />
      <PageHeader title="Friends" subtitle="Borrow before you buy. Friends see only what you mark shareable, never prices, dates, stores or receipts." />
      {joined && <Badge tone="save">Friend added</Badge>}
      {error && <div className="text-sm text-warn">{decodeURIComponent(error)}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle hint={profile?.display_name ?? 'You'}>Closet Karma</CardTitle>
          <div className="flex items-baseline gap-2"><span className="display text-3xl font-semibold text-pine">{karma.lent}</span><span className="text-sm text-ink-2">time{karma.lent === 1 ? '' : 's'} lent</span></div>
          <div className="mt-3">
            <Row label="Helped friends keep" value={usd(karma.helpedKeepCents)} valueClass={karma.helpedKeepCents > 0 ? 'saved' : ''} />
            <Row label="Borrowed" value={`${karma.borrowed} time${karma.borrowed === 1 ? '' : 's'}`} muted />
          </div>
          <Note className="mt-3">Lending is the status symbol. No feed, no likes, no rankings.</Note>
        </Card>
        <Card>
          <CardTitle hint="Scan or share">Invite</CardTitle>
          <div className="flex items-start gap-4">
            <div className="shrink-0 overflow-hidden rounded-2xl bg-paper p-2"><InviteQR url={link} /></div>
            <div className="min-w-0 flex-1">
              <div className="display select-all rounded-2xl bg-paper px-3 py-2 text-center text-2xl font-semibold tracking-[.2em] text-pine">{profile?.invite_code ?? '—'}</div>
              <div className="mt-2 break-all text-xs text-ink-3">{link}</div>
              <JoinForm />
            </div>
          </div>
        </Card>
      </div>

      {open.length > 0 && (
        <section>
          <SectionTitle hint="updates live">Open loans</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            {open.map((l) => {
              const isOwner = l.owner_id === user.id;
              return (
                <Card key={l.id}>
                  <div className="flex gap-4">
                    <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-paper">{l.item_image && <img src={l.item_image} alt="" className="h-full w-full object-contain" />}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2"><div className="truncate text-sm font-medium">{l.item_name}</div><Badge tone="pine">{STATUS[l.status] ?? l.status}</Badge></div>
                      <div className="mt-0.5 text-xs text-ink-2">{isOwner ? `${l.borrower_name} asked` : `From ${l.owner_name}`}{l.event_name ? ` · ${l.event_name}` : ''}{l.needed_on ? ` · needed ${l.needed_on}` : ''}{l.due_back ? ` · back ${l.due_back}` : ''}</div>
                      {l.message && <div className="mt-2 text-sm text-ink-2">“{l.message}”</div>}
                      <div className="mt-3"><LoanActions loanId={l.id} status={l.status} isOwner={isOwner} itemName={l.item_name} ownerName={l.owner_name} borrowerName={l.borrower_name} dueBack={l.due_back} /></div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <SectionTitle hint={friends.length ? `${friends.length}${nearCount ? ` · ${nearCount} near you` : ''} · tap to browse a wardrobe` : 'no friends yet'}>Friends</SectionTitle>
        {friends.length === 0 && <p className="text-sm text-ink-2">Share your code. When a friend joins, their shareable items show up here, filtered to your size, ready to borrow before you buy.</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {friends.map((f) => (
            <Link key={f.id} href={`/friends/${f.id}`} className="card card-paper card-hover flex items-center gap-3 !p-4">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-mist">{f.avatar_url && <img src={f.avatar_url} alt="" className="h-full w-full object-cover" />}</div>
              <div className="min-w-0"><div className="flex items-center gap-2 truncate text-sm font-medium">{f.display_name ?? 'Friend'}{near(f.area) && <Badge tone="save">Near you</Badge>}</div><div className="text-xs text-ink-3">{Object.entries(f.sizes ?? {}).map(([k, v]) => `${k} ${v}`).join(' · ') || 'No sizes set'}</div></div>
            </Link>
          ))}
        </div>
      </section>

      {past.length > 0 && (
        <Card tone="paper">
          <CardTitle>Past loans</CardTitle>
          {past.map((l) => <Row key={l.id} label={`${l.item_name.slice(0, 32)} · ${l.owner_id === user.id ? 'to ' + l.borrower_name : 'from ' + l.owner_name}`} value={STATUS[l.status] ?? l.status} muted />)}
        </Card>
      )}
    </Page>
  );
}
