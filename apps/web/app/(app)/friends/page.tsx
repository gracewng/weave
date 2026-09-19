import { getProfile } from '@/lib/auth';
import { EmptyState } from '@/components/EmptyState';
import { env } from '@/lib/env';

export default async function FriendsPage() {
  const { profile } = await getProfile();
  const link = `${env.appUrl}/join/${profile?.invite_code ?? ''}`;
  return (
    <EmptyState title="Friends" lines={[['FRIENDS', '0'], ['LENT', '0 times'], ['SAVED FRIENDS', '$0.00']]}>
      <p className="text-sm text-ink-2">Friends share wardrobes so you can borrow before you buy. Invite one with your code:</p>
      <div className="mono mt-3 select-all border border-rule bg-paper p-2 text-sm">{profile?.invite_code ?? '—'}</div>
      <div className="mono mt-1 break-all text-[11px] text-ink-3">{link}</div>
      <p className="mono mt-4 text-[11px] text-ink-3">Friends see only shareable items. Never prices, dates, or stores.</p>
    </EmptyState>
  );
}
