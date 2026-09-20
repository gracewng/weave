'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { printReceipt } from '@/lib/printer';

/** Supabase Realtime: when a loan I'm part of changes (friend accepts, hands over, returns), refresh and print. */
export function LoansLive({ userId }: { userId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel('loans-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, (payload) => {
        const row = (payload.new ?? payload.old) as { owner_id?: string; borrower_id?: string; status?: string; event_name?: string | null };
        if (row.owner_id !== userId && row.borrower_id !== userId) return;
        if (payload.eventType === 'UPDATE' && row.status) printReceipt({ title: 'Loan update', lines: [{ label: 'STATUS', value: row.status.toUpperCase() }, ...(row.event_name ? [{ label: 'FOR', value: row.event_name.toUpperCase().slice(0, 20), muted: true }] : [])], footer: 'LIVE · SUPABASE REALTIME', ttlMs: 4000 });
        if (payload.eventType === 'INSERT' && row.owner_id === userId) printReceipt({ title: 'Borrow request', lines: [{ label: 'FROM', value: 'A FRIEND' }], footer: 'LIVE · SUPABASE REALTIME', ttlMs: 4000 });
        router.refresh();
      }).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [userId, router]);
  return null;
}
