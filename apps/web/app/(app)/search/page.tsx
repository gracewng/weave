import { requireUser } from '@/lib/auth';
import { SearchClient } from './SearchClient';
import { HoldsPanel } from './HoldsPanel';
import type { Hold } from '@weave/shared/types';

export const dynamic = 'force-dynamic';

/** Search is the intervention point; what you paused or skipped (the Ghost Rack) lives right under the bar. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; for?: string }> }) {
  const { q = '', for: f } = await searchParams;
  const { supabase } = await requireUser();
  const { data } = await supabase.from('holds').select('*').order('created_at', { ascending: false }).limit(12);
  const holds = (data ?? []) as Hold[];
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SearchClient initialQ={q} initialForOther={f === 'other'} />
      {!q && holds.length > 0 && <HoldsPanel holds={holds} />}
    </div>
  );
}
