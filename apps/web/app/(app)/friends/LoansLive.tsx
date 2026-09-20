'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { printReceipt } from '@/lib/printer';

const STATUS: Record<string, string> = { requested: 'Requested', accepted: 'Accepted', out: 'Handed over', returned: 'Returned', declined: 'Declined' };

/** Supabase Realtime: when a loan I'm part of changes (friend accepts, hands over, returns), refresh and notify. */
export function LoansLive({ userId }: { userId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel('loans-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, (payload) => {
        const row = (payload.new ?? payload.old) as { owner_id?: string; borrower_id?: string; status?: string; event_name?: string | null };
        if (row.owner_id !== userId && row.borrower_id !== userId) return;
        if (payload.eventType === 'UPDATE' && row.status) printReceipt({ title: 'Loan update', lines: [{ label: 'Status', value: STATUS[row.status] ?? row.status }, ...(row.event_name ? [{ label: 'For', value: row.event_name.slice(0, 24), muted: true }] : [])], footer: 'Live · Supabase Realtime', ttlMs: 4000 });
        if (payload.eventType === 'INSERT' && row.owner_id === userId) printReceipt({ title: 'Borrow request', lines: [{ label: 'From', value: 'a friend' }], footer: 'Live · Supabase Realtime', ttlMs: 4000 });
        router.refresh();
      }).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [userId, router]);
  return null;
}
