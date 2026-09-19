import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';

/** Accept an invite code → accepted friendship. Full UI lands in Phase 8; the DB function already works. */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('accept_invite', { p_code: code });
  redirect(error ? `/friends?error=${encodeURIComponent(error.message)}` : '/friends?joined=1');
}
